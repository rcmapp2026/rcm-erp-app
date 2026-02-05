
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { 
  ArrowLeft, Loader2, Search, X, Plus, ShoppingCart, Save, Trash2, ChevronRight, User, Phone, MapPin, Package, Edit3, CheckCircle, Boxes
} from 'lucide-react';
import { Order, OrderItem, Dealer, Product, ProductVariant, CompanyProfile } from '../types';
import toast from 'react-hot-toast';
import { PermissionHandler } from '../PermissionHandler';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const [showManualModal, setShowManualModal] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  
  const [dealerSearch, setDealerSearch] = useState('');
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [manualItems, setManualItems] = useState<any[]>([]);
  
  const [showAddItem, setShowAddItem] = useState(false);
  const [isManualProduct, setIsManualProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [manualRate, setManualRate] = useState<number>(0);

  const [manualForm, setManualForm] = useState({
    name: '',
    company: '',
    size: '',
    unit: 'PCS',
    rate: 0,
    quantity: 1
  });

  const [financials, setFinancials] = useState({ transport: 0, discount: 0, status: 'Pending' });

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from('orders').select('*, dealers(*)').order('created_at', { ascending: false });
    setOrders(data || []);
    setLoading(false);
  }, []);

  const fetchOrderItems = useCallback(async (orderId: string) => {
    const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId);
    setItems(data || []);
  }, []);

  useEffect(() => { 
    fetchOrders(); 
    supabase.from('dealers').select('*').order('shop_name').then(({data}) => setDealers(data || []));
    supabase.from('products').select('*, product_variants(*), company:company_id(name)').order('name').then(({data}) => setProducts(data || []));
    supabase.from('company_profile').select('*').single().then(({data}) => setProfile(data));
    
    const channel = supabase.channel('orders-hub-v9').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  useEffect(() => {
    if (selectedOrder) fetchOrderItems(selectedOrder.id);
  }, [selectedOrder, fetchOrderItems]);

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("PERMANENTLY PURGE THIS MANIFEST?")) return;
    setUpdateLoading(true);
    try {
      await supabase.from('order_items').delete().eq('order_id', id);
      await supabase.from('orders').delete().eq('id', id);
      toast.success("MANIFEST DELETED");
      setSelectedOrder(null);
      fetchOrders();
    } catch (e) { toast.error("PURGE FAILED"); }
    finally { setUpdateLoading(false); }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("REMOVE THIS ASSET?")) return;
    try {
      await supabase.from('order_items').delete().eq('id', itemId);
      fetchOrderItems(selectedOrder.id);
      toast.success("ITEM REMOVED");
    } catch (e) { toast.error("FAIL"); }
  };

  const handleUpdateItemLocal = (itemId: string, field: string, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.id === itemId) {
        const updated = { ...i, [field]: value };
        updated.amount = Number(updated.rate) * Number(updated.quantity);
        return updated;
      }
      return i;
    }));
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    setUpdateLoading(true);
    try {
      // Sync all items first
      for (const item of items) {
        await supabase.from('order_items').update({
          rate: item.rate,
          quantity: item.quantity,
          amount: Number(item.rate) * Number(item.quantity)
        }).eq('id', item.id);
      }

      const subtotal = items.reduce((s, i) => s + Number(i.amount), 0);
      const finalTotal = subtotal + Number(financials.transport) - Number(financials.discount);
      
      const { error: oErr } = await supabase.from('orders').update({
        transport_charges: financials.transport,
        discount: financials.discount,
        status: financials.status,
        subtotal: subtotal,
        final_total: finalTotal
      }).eq('id', selectedOrder.id);

      if (oErr) throw oErr;

      if (financials.status !== 'Pending') {
        const narration = `ORD #ORD-${selectedOrder.order_no}`;
        const { data: existingLedger } = await supabase.from('ledger').select('id').eq('dealer_id', selectedOrder.dealer_id).eq('narration', narration).single();
        const ledgerPayload = { dealer_id: selectedOrder.dealer_id, amount: finalTotal, type: 'DEBIT', narration, date: new Date().toISOString().split('T')[0] };
        if (existingLedger) {
          await supabase.from('ledger').update(ledgerPayload).eq('id', existingLedger.id);
        } else {
          await supabase.from('ledger').insert([ledgerPayload]);
        }
      }

      const shopName = (selectedOrder.dealers?.shop_name || "VALUED DEALER").trim().toUpperCase();
      const orderNo = selectedOrder.order_no;
      const status = financials.status;
      const statusEmoji = status === 'Completed' ? '✅' : '⏳';
      
      const waMsg = `📦 *ORDER UPDATE* 📦\n\nHello *${shopName}*,\n\nYour Order *#ORD-${orderNo}* status has been updated to: *${status}* ${statusEmoji}\n\n💰 *Total Amount:* ₹${Math.round(finalTotal).toLocaleString()}\n📍 *Status:* ${status.toUpperCase()} ${statusEmoji}\n\n_Thank you for choosing RCM Hardware_ 🙏`;
      
      PermissionHandler.openWhatsApp(selectedOrder.dealers?.mobile, waMsg);

      toast.success("SYNCED ✅");
      setSelectedOrder(null);
      fetchOrders();
    } catch (e) { console.error(e); toast.error("SYNC FAILED"); }
    finally { setUpdateLoading(false); }
  };

  const handleAddItemToExisting = async () => {
    setUpdateLoading(true);
    try {
      let payload;
      if (isManualProduct) {
        if (!manualForm.name) throw new Error("Product name required");
        payload = {
          order_id: selectedOrder.id,
          product_name: manualForm.name.toUpperCase(),
          company_name: manualForm.company.toUpperCase() || 'EXTERNAL',
          size: manualForm.size.toUpperCase(),
          rate: manualForm.rate,
          quantity: manualForm.quantity,
          amount: manualForm.rate * manualForm.quantity,
          unit: manualForm.unit.toUpperCase()
        };
      } else {
        if (!selectedProduct || !selectedVariant) throw new Error("Selection required");
        const rate = manualRate > 0 ? manualRate : selectedVariant.final_price;
        payload = {
          order_id: selectedOrder.id,
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          company_name: (selectedProduct as any)?.company?.name || 'RCM',
          size: selectedVariant.size,
          rate: rate,
          quantity: quantity,
          amount: rate * quantity,
          unit: selectedProduct.unit
        };
      }

      const { error } = await supabase.from('order_items').insert([payload]);
      if (error) throw error;
      toast.success("INJECTED");
      fetchOrderItems(selectedOrder.id);
      setShowAddItem(false);
      setProductSearch('');
      setSelectedProduct(null);
      setIsManualProduct(false);
      setManualForm({ name: '', company: '', size: '', unit: 'PCS', rate: 0, quantity: 1 });
    } catch (e: any) { toast.error(e.message || "ERROR"); }
    finally { setUpdateLoading(false); }
  };

  const handleSaveNewOrder = async () => {
    if (!selectedDealer || manualItems.length === 0) return toast.error("Dealer and items are required.");
    setUpdateLoading(true);
    try {
      const subtotal = manualItems.reduce((sum, item) => sum + item.amount, 0);
      
      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
        dealer_id: selectedDealer.id,
        subtotal: subtotal,
        final_total: subtotal, 
        status: 'Pending'
      }]).select().single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error("Failed to create order.");

      const newOrderId = orderData.id;

      const itemsToInsert = manualItems.map(item => ({
        order_id: newOrderId,
        product_id: item.product_id,
        product_name: item.product_name,
        company_name: item.company_name,
        size: item.size,
        rate: item.rate,
        quantity: item.quantity,
        amount: item.amount,
        unit: item.unit
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;

      // New Order Notification
      const shopName = (selectedDealer.shop_name || "VALUED DEALER").trim().toUpperCase();
      const waMsg = `📦 *ORDER REGISTERED* 📦\n\nHello *${shopName}*,\n\nYour new order manifest has been successfully registered.\n\n💰 *Estimated Total:* ₹${Math.round(subtotal).toLocaleString()}\n📍 *Status:* PENDING ⏳\n\n_Thank you for choosing RCM Hardware_ 🙏`;
      PermissionHandler.openWhatsApp(selectedDealer.mobile, waMsg);

      toast.success("Order Authorized Successfully ✅");
      setShowManualModal(false);
      fetchOrders();

    } catch (e: any) {
      console.error("Order creation failed:", e);
      toast.error(`Sync Failed: ${e.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.sku?.toLowerCase().includes(productSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white font-black text-left overflow-hidden">
      <div className="p-5 pb-2 shrink-0">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input placeholder="Search orders..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 h-16 !bg-slate-50 border-none rounded-2xl text-[11px] uppercase italic font-black shadow-inner" />
          </div>
          <button onClick={() => { setShowManualModal(true); setDealerSearch(''); setSelectedDealer(null); setManualItems([]); }} className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all shrink-0"><Plus size={28}/></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-32">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-4">
            {orders.filter(o => o.order_no?.toString().includes(searchTerm) || o.dealers?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase())).map(o => (
              <div key={o.id} onClick={() => { setSelectedOrder(o); setFinancials({ transport: o.transport_charges, discount: o.discount, status: o.status }); }} className="p-6 bg-white rounded-3xl border-2 border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.99] transition-all">
                 <div className="flex-1 pr-4">
                    <h3 className="text-sm font-black italic uppercase leading-tight truncate text-gray-900">{o.dealers?.shop_name}</h3>
                    <p className="text-[8px] text-gray-400 font-black uppercase italic mt-1">ORD #{o.order_no} • <span className={o.status === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}>{o.status}</span></p>
                 </div>
                 <p className="text-base font-black italic text-blue-600 tracking-tighter shrink-0">₹{Math.round(o.final_total).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showManualModal && (
        <div className="fixed inset-0 bg-white z-[600] flex flex-col font-black animate-in slide-in-from-right duration-300">
           <header className="px-6 py-6 border-b flex justify-between items-center bg-blue-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                 <button onClick={() => setShowManualModal(false)}><ArrowLeft size={28}/></button>
                 <h2 className="text-lg italic uppercase font-black">New Registry</h2>
              </div>
              <button onClick={() => setShowManualModal(false)}><X size={32}/></button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
              <div className="space-y-1 relative">
                 <label className="text-[9px] uppercase text-gray-400 italic ml-4">Target Dealer Node</label>
                 <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                    <input value={dealerSearch} onChange={e => { setDealerSearch(e.target.value); setSelectedDealer(null); }} placeholder="Search Shop..." className="w-full pl-12 h-16 !bg-slate-50 border-none rounded-2xl text-[11px] uppercase font-black shadow-inner" />
                 </div>
                 {dealerSearch && !selectedDealer && (
                   <div className="absolute top-full left-0 right-0 z-50 bg-white border-2 border-blue-600 rounded-2xl max-h-60 overflow-y-auto mt-2 shadow-2xl no-scrollbar">
                      {dealers.filter(d => d.shop_name.toLowerCase().includes(dealerSearch.toLowerCase())).map(d => (
                        <button key={d.id} onClick={() => { setSelectedDealer(d); setDealerSearch(d.shop_name); }} className="w-full p-5 text-left text-[11px] uppercase italic border-b font-black active:bg-blue-50">{d.shop_name}</button>
                      ))}
                   </div>
                 )}
              </div>

              {selectedDealer && (
                <div className="space-y-6 animate-in fade-in">
                   <div className="flex justify-between items-center px-2">
                      <h4 className="text-[10px] font-black uppercase text-blue-600 italic tracking-widest">Assets List</h4>
                      <button onClick={() => { setShowAddItem(true); setProductSearch(''); setSelectedProduct(null); setIsManualProduct(false); }} className="text-[9px] bg-blue-50 text-blue-600 px-5 py-2.5 rounded-full italic font-black border-2 border-blue-100">+ INJECT</button>
                   </div>
                   <div className="space-y-3">
                      {manualItems.map((mi, idx) => (
                        <div key={idx} className="p-5 bg-white rounded-2xl border-2 border-blue-50 flex justify-between items-center shadow-sm">
                           <div className="truncate pr-4"><p className="text-[11px] font-black uppercase italic truncate text-gray-900">{mi.product_name}</p><p className="text-[8px] text-gray-400 uppercase italic font-black mt-1">{mi.company_name} | {mi.size} | Qty: {mi.quantity}</p></div>
                           <button onClick={() => setManualItems(manualItems.filter((_, i) => i !== idx))} className="p-2.5 text-red-500 bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                        </div>
                      ))}
                   </div>
                   <button onClick={handleSaveNewOrder} disabled={updateLoading} className="w-full py-8 bg-blue-600 text-white rounded-[2.2rem] font-black uppercase italic shadow-2xl active:scale-95 flex items-center justify-center gap-3 text-sm tracking-widest mt-4">
                     {updateLoading ? <Loader2 className="animate-spin"/> : <ShoppingCart size={24}/>} AUTHORIZE REGISTRY
                   </button>
                </div>
              )}
           </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col font-black animate-in slide-in-from-right duration-300 h-full w-full">
           <header className="px-6 py-6 border-b flex justify-between items-center bg-white sticky top-0 shrink-0 z-10">
              <div className="flex items-center gap-3">
                 <button onClick={() => setSelectedOrder(null)} className="p-2.5 bg-slate-100 rounded-xl"><ArrowLeft size={24}/></button>
                 <div>
                    <h2 className="text-sm font-black uppercase italic leading-none">ORD #{selectedOrder.order_no}</h2>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => handleDeleteOrder(selectedOrder.id)} className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 size={20}/></button>
                 <button onClick={() => setSelectedOrder(null)}><X size={32}/></button>
              </div>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-40 no-scrollbar bg-slate-50">
              <div className="bg-white p-7 rounded-[2.5rem] border-2 border-blue-600 shadow-sm space-y-4">
                 <div className="flex items-center gap-3 border-b border-blue-50 pb-4">
                    <User size={18} className="text-blue-600" />
                    <h4 className="text-[10px] font-black uppercase text-gray-900 italic tracking-widest">Dealer Terminal</h4>
                 </div>
                 <h3 className="text-xl font-black italic uppercase text-gray-900 leading-tight">{selectedOrder.dealers?.shop_name}</h3>
                 <p className="text-[10px] text-gray-400 font-black uppercase flex items-center gap-2 italic"><Phone size={14} className="text-blue-600"/> +91 {selectedOrder.dealers?.mobile}</p>
                 <p className="text-[9px] text-gray-400 font-black uppercase flex items-start gap-2 italic"><MapPin size={14} className="text-blue-600 shrink-0"/> {selectedOrder.dealers?.address}</p>
              </div>

              <button onClick={() => { setShowAddItem(true); setProductSearch(''); setSelectedProduct(null); setIsManualProduct(false); }} className="w-full py-6 bg-white border-2 border-blue-600 border-dashed rounded-[2rem] text-blue-600 font-black uppercase italic text-[11px] flex items-center justify-center gap-3 shadow-sm active:scale-[0.98]">
                 <Plus size={20} strokeWidth={3}/> INJECT NEW ASSET
              </button>

              <div className="space-y-3">
                 <h3 className="text-[10px] font-black uppercase text-gray-400 italic ml-4">Manifest Ledger</h3>
                 {items.map(item => (
                    <div key={item.id} className="p-5 bg-white border-2 border-blue-50 rounded-3xl space-y-4 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                           <div className="truncate flex-1">
                              <h4 className="font-black text-xs uppercase italic truncate text-gray-900">{item.product_name}</h4>
                              <p className="text-[8px] text-gray-400 uppercase italic font-black mt-1">{item.company_name} | {item.size} | {item.unit || 'PCS'}</p>
                           </div>
                           <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-red-500 bg-red-50 rounded-xl"><Trash2 size={16}/></button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                           <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Quantity</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={e => handleUpdateItemLocal(item.id, 'quantity', Number(e.target.value))}
                                className="w-full p-3 bg-slate-50 border-none rounded-xl font-black italic text-xs"
                              />
                           </div>
                           <div className="space-y-1">
                              <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Rate (₹)</label>
                              <input
                                type="number"
                                value={item.rate}
                                onChange={e => handleUpdateItemLocal(item.id, 'rate', Number(e.target.value))}
                                className="w-full p-3 bg-slate-50 border-none rounded-xl font-black italic text-xs"
                              />
                           </div>
                        </div>
                        <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                           <p className="text-[9px] font-black uppercase text-gray-400 italic">Subtotal</p>
                           <p className="text-xs font-black italic text-blue-600 tracking-tight">₹{Number(item.amount).toLocaleString()}</p>
                        </div>
                    </div>
                 ))}
              </div>

              <div className="bg-white p-8 rounded-[3rem] border-2 border-blue-600 shadow-xl space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-4 italic">Transport (+)</label>
                       <input type="number" value={financials.transport} onChange={e => setFinancials({...financials, transport: Number(e.target.value)})} className="w-full !p-5 !bg-slate-50 border-none rounded-2xl font-black italic" />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[9px] font-black uppercase text-gray-400 ml-4 italic">Discount (-)</label>
                       <input type="number" value={financials.discount} onChange={e => setFinancials({...financials, discount: Number(e.target.value)})} className="w-full !p-5 !bg-slate-50 border-none rounded-2xl font-black italic" />
                    </div>
                 </div>

                 <select value={financials.status} onChange={e => setFinancials({...financials, status: e.target.value})} className="w-full !p-5 !bg-blue-50 border-2 border-blue-600 rounded-2xl font-black uppercase italic text-blue-900 outline-none">
                    <option value="Pending">PENDING MANIFEST</option>
                    <option value="Processing">HUB PROCESSING</option>
                    <option value="Out of Delivery">OUT OF DELIVERY</option>
                    <option value="Completed">DELIVERY COMPLETE</option>
                 </select>

                 <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-2xl text-center">
                    <p className="text-[10px] uppercase font-black italic opacity-70 mb-2">Net Payable Amount</p>
                    <h4 className="text-4xl font-black italic tracking-tighter">₹{(items.reduce((s,i)=>s+Number(i.amount),0) + Number(financials.transport) - Number(financials.discount)).toLocaleString()}</h4>
                 </div>

                 <button onClick={handleUpdateOrder} disabled={updateLoading} className="w-full py-8 bg-black text-white rounded-[2.2rem] font-black uppercase italic shadow-2xl tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95 transition-all">
                    {updateLoading ? <Loader2 className="animate-spin"/> : <CheckCircle size={22} strokeWidth={3}/>} AUTHORIZE SYNC
                 </button>
              </div>
           </div>
        </div>
      )}

      {showAddItem && (
        <div className="fixed inset-0 bg-black/60 z-[700] flex items-end sm:items-center justify-center p-0 sm:p-4">
           <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[2.5rem] p-6 space-y-6 animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[90vh] overflow-hidden flex flex-col font-black shadow-2xl relative">
              <div className="flex justify-between items-center shrink-0 border-b pb-4">
                 <h3 className="text-xl font-black italic uppercase tracking-tighter">{isManualProduct ? 'Manual Entry' : 'Asset Injection'}</h3>
                 <div className="flex items-center gap-2">
                    <button onClick={() => setIsManualProduct(!isManualProduct)} className="p-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase italic flex items-center gap-2">
                       <Boxes size={16}/> {isManualProduct ? 'USE STOCK' : 'MANUAL'}
                    </button>
                    <button onClick={() => setShowAddItem(false)} className="p-2.5 bg-slate-100 rounded-full"><X size={24}/></button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar pb-6">
                 {!isManualProduct ? (
                   <>
                    <div className="space-y-2 relative">
                        <label className="text-[9px] uppercase text-gray-400 italic ml-2 tracking-widest">Instant Asset Search</label>
                        <div className="relative">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
                          <input autoFocus placeholder="Type 1 letter to search..." value={productSearch} onChange={e => { setProductSearch(e.target.value); setSelectedProduct(null); }} className="w-full pl-12 h-16 !bg-slate-50 border-none rounded-2xl text-[12px] font-black uppercase italic shadow-inner" />
                        </div>

                        {productSearch.length > 0 && !selectedProduct && (
                          <div className="bg-white border-2 border-blue-600 rounded-2xl mt-2 max-h-64 overflow-y-auto shadow-2xl no-scrollbar animate-in fade-in slide-in-from-top-2">
                            {filteredProducts.length > 0 ? (
                              filteredProducts.map(p => (
                                <button key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(p.name); setSelectedVariant(null); }} className="w-full p-5 text-left text-[11px] uppercase italic border-b-2 border-slate-50 font-black active:bg-blue-50 transition-all flex items-center gap-5">
                                    <img src={p.image_url} className="w-12 h-12 rounded-xl object-cover shadow-sm border border-slate-100" />
                                    <div>
                                      <p className="text-black font-black leading-none">{p.name}</p>
                                      <p className="text-[8px] text-gray-400 mt-1">SKU: {p.sku}</p>
                                    </div>
                                </button>
                              ))
                            ) : (
                              <div className="p-8 text-center text-gray-300 italic text-[10px]">No Matching Assets Found</div>
                            )}
                          </div>
                        )}
                    </div>

                    {selectedProduct && (
                      <div className="space-y-6 animate-in fade-in pt-2">
                          <div className="grid grid-cols-2 gap-3">
                            {(selectedProduct.product_variants || []).map((v, i) => (
                              <button key={i} onClick={() => { setSelectedVariant(v); setManualRate(v.final_price); }} className={`p-5 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1 ${selectedVariant?.size === v.size ? 'bg-blue-600 text-white border-blue-700 shadow-lg scale-105' : 'bg-slate-100 text-gray-400 border-transparent'}`}>
                                  <p className="text-[10px] font-black uppercase italic">{v.size}</p>
                                  <p className="text-[9px] font-black">₹{v.final_price}</p>
                              </button>
                            ))}
                          </div>

                          <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                   <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Edit Rate</label>
                                   <input type="number" value={manualRate} onChange={e => setManualRate(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-xs italic" />
                                </div>
                                <div className="space-y-1">
                                   <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Quantity</label>
                                   <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-black text-xs italic" />
                                </div>
                             </div>
                             <div className="bg-blue-50 p-5 rounded-3xl border-2 border-blue-100 text-right">
                                <p className="text-[9px] text-blue-400 uppercase italic font-black">Injection Value</p>
                                <p className="text-2xl font-black italic text-blue-600">₹{(manualRate * quantity).toLocaleString()}</p>
                             </div>
                          </div>
                      </div>
                    )}
                   </>
                 ) : (
                   <div className="space-y-4 animate-in fade-in">
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Product Name</label>
                         <input value={manualForm.name} onChange={e => setManualForm({...manualForm, name: e.target.value})} placeholder="E.G. BRASS ELBOW" className="w-full h-14 p-5 bg-slate-50 border-none rounded-2xl font-black uppercase italic text-xs" />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Company Name</label>
                         <input value={manualForm.company} onChange={e => setManualForm({...manualForm, company: e.target.value})} placeholder="E.G. RCM SUPREME" className="w-full h-14 p-5 bg-slate-50 border-none rounded-2xl font-black uppercase italic text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Size</label>
                            <input value={manualForm.size} onChange={e => setManualForm({...manualForm, size: e.target.value})} placeholder="E.G. 1/2 INCH" className="w-full h-14 p-5 bg-slate-50 border-none rounded-2xl font-black uppercase italic text-xs" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Unit</label>
                            <select value={manualForm.unit} onChange={e => setManualForm({...manualForm, unit: e.target.value})} className="w-full h-14 px-5 bg-slate-50 border-none rounded-2xl font-black uppercase italic text-xs">
                               <option value="PCS">PCS</option>
                               <option value="BAG">BAG</option>
                               <option value="PKT">PKT</option>
                               <option value="BOX">BOX</option>
                               <option value="SET">SET</option>
                               <option value="KG">KG</option>
                            </select>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Quantity</label>
                            <input type="number" value={manualForm.quantity} onChange={e => setManualForm({...manualForm, quantity: Number(e.target.value)})} className="w-full h-14 p-5 bg-slate-50 border-none rounded-2xl font-black uppercase italic text-xs" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Rate (₹)</label>
                            <input type="number" value={manualForm.rate} onChange={e => setManualForm({...manualForm, rate: Number(e.target.value)})} className="w-full h-14 p-5 bg-slate-50 border-none rounded-2xl font-black uppercase italic text-xs" />
                         </div>
                      </div>
                      <div className="bg-blue-600 p-6 rounded-[2rem] text-white text-center shadow-xl">
                         <p className="text-[10px] uppercase font-black italic opacity-70">Calculated Value</p>
                         <h4 className="text-3xl font-black italic tracking-tighter">₹{(manualForm.rate * manualForm.quantity).toLocaleString()}</h4>
                      </div>
                   </div>
                 )}
              </div>
              
              <div className="shrink-0 pt-4 border-t">
                 <button onClick={() => {
                   if (isManualProduct) {
                      if (showManualModal) {
                        setManualItems([...manualItems, { product_id: null, product_name: manualForm.name.toUpperCase(), size: manualForm.size.toUpperCase(), rate: manualForm.rate, quantity: manualForm.quantity, amount: manualForm.rate * manualForm.quantity, unit: manualForm.unit.toUpperCase(), company_name: manualForm.company.toUpperCase() || 'EXTERNAL' }]);
                        setShowAddItem(false);
                      } else {
                        handleAddItemToExisting();
                      }
                   } else {
                      if (!selectedProduct || !selectedVariant) return;
                      if (showManualModal) {
                        const companyName = (selectedProduct as any)?.company?.name || 'RCM';
                        setManualItems([...manualItems, { product_id: selectedProduct?.id, product_name: selectedProduct?.name, size: selectedVariant?.size, rate: manualRate, quantity, amount: manualRate * quantity, unit: selectedProduct?.unit, company_name: companyName }]);
                        setShowAddItem(false);
                        setProductSearch('');
                      } else {
                        handleAddItemToExisting();
                      }
                   }
                 }} disabled={!isManualProduct && (!selectedProduct || !selectedVariant)} className="w-full py-8 bg-blue-600 text-white rounded-[2rem] font-black uppercase italic shadow-2xl active:scale-95 text-sm tracking-widest disabled:opacity-50">INJECT TO MANIFEST</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
