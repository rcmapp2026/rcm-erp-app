
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { ShoppingCart, Search, Trash2, Loader2, ChevronRight, ArrowLeft, User, Trash } from 'lucide-react';
import { Dealer } from '../types';
import toast from 'react-hot-toast';

const DealerCart: React.FC = () => {
  const [dealersWithCarts, setDealersWithCarts] = useState<Dealer[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchActiveCarts = useCallback(async () => {
    try {
      const { data: cartData, error: cartError } = await supabase.from('cart_items').select('dealer_id');
      if (cartError) throw cartError;
      if (!cartData || cartData.length === 0) { setDealersWithCarts([]); setLoading(false); return; }
      const uniqueDealerIds = [...new Set(cartData.map(c => c.dealer_id))];
      const { data: dealerData, error: dealerError } = await supabase.from('dealers').select('*').in('id', uniqueDealerIds).order('shop_name');
      if (dealerError) throw dealerError;
      setDealersWithCarts(dealerData || []);
    } catch (e: any) { toast.error("Cart Sync Failure"); }
    finally { setLoading(false); }
  }, []);

  const fetchDealerItems = useCallback(async (dealerId: string) => {
    setItemsLoading(true);
    try {
      const { data, error } = await supabase.from('cart_items').select(`id, quantity, created_at, product:product_id (id, name, image_url, unit, sku), variant:variant_id (id, size, final_price, mrp)`).eq('dealer_id', dealerId).order('created_at', { ascending: false });
      if (error) throw error;
      const mappedData = (data || []).map(item => ({ ...item, products: item.product, product_variants: item.variant }));
      setCartItems(mappedData);
    } catch (e: any) { toast.error("Manifest Error"); }
    finally { setItemsLoading(false); }
  }, []);

  useEffect(() => { 
    fetchActiveCarts(); 
    const channel = supabase.channel('global-cart-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items' }, fetchActiveCarts)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchActiveCarts]);

  useEffect(() => { 
    if (selectedDealer) {
      fetchDealerItems(selectedDealer.id); 
      const subChannel = supabase.channel(`cart-items-${selectedDealer.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'cart_items', filter: `dealer_id=eq.${selectedDealer.id}` }, () => fetchDealerItems(selectedDealer.id))
        .subscribe();
      return () => { supabase.removeChannel(subChannel); };
    }
  }, [selectedDealer, fetchDealerItems]);

  const deleteItem = async (itemId: string) => {
    if (!confirm("Purge item from dealer session?")) return;
    try {
      const { error } = await supabase.from('cart_items').delete().eq('id', itemId);
      if (error) throw error;
      toast.success("Purged");
    } catch (e: any) { toast.error("Fail"); }
  };

  const filteredDealers = dealersWithCarts.filter(d => 
    d.shop_name.toLowerCase().includes(searchTerm.toLowerCase()) || d.dealer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedDealer) {
    return (
      <div className="space-y-4 animate-in slide-in-from-right duration-300 font-black px-4 pt-2">
        <button onClick={() => setSelectedDealer(null)} className="flex items-center gap-2 text-gray-400 uppercase text-[10px] italic tracking-widest font-black"><ArrowLeft size={16} /> Cart Registry</button>
        <div className="bg-white p-6 rounded-2xl border-2 border-blue-600 space-y-6 font-black">
           <div className="border-b-2 border-blue-50 pb-4 font-black">
              <h2 className="text-xl italic uppercase text-gray-900 font-black">{selectedDealer.shop_name}</h2>
              <p className="text-[10px] text-blue-600 mt-1 uppercase italic tracking-widest font-black">Active Manifest: {cartItems.length} Items</p>
           </div>
           <div className="space-y-3 font-black">
              {itemsLoading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-blue-100 font-black">
                  <div className="flex items-center gap-3 font-black">
                     <img src={item.products?.image_url} className="w-12 h-12 rounded-lg object-cover border border-gray-100" />
                     <div className="font-black">
                        <p className="text-[11px] uppercase italic truncate max-w-[140px] font-black">{item.products?.name}</p>
                        <p className="text-[8px] text-blue-600 uppercase italic font-black">{item.product_variants?.size} | QTY: {item.quantity}</p>
                     </div>
                  </div>
                  <button onClick={() => deleteItem(item.id)} className="p-2 text-red-500 bg-white rounded-lg border-2 border-red-50 shadow-sm font-black"><Trash2 size={16} /></button>
                </div>
              ))}
              {!itemsLoading && cartItems.length === 0 && <p className="text-center text-gray-300 italic uppercase text-[10px] py-10 font-black">Cart Empty</p>}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-2 font-black">
      <div className="relative group font-black">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 font-black" size={18} />
        <input type="text" placeholder="Search Cart Registry..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-14 p-5 bg-white border-2 border-blue-600 rounded-2xl text-xs uppercase italic outline-none font-black" />
      </div>

      <div className="space-y-3 pb-32 font-black">
        {loading ? <Loader2 className="animate-spin mx-auto text-blue-600" /> : filteredDealers.map(d => (
          <button key={d.id} onClick={() => setSelectedDealer(d)} className="w-full p-6 bg-white border-2 border-blue-600 rounded-2xl flex justify-between items-center active:scale-[0.98] transition-all font-black">
             <span className="text-sm italic uppercase text-gray-900 font-black">{d.shop_name}</span>
             <div className="flex items-center gap-2 font-black">
                <ChevronRight size={20} className="text-blue-600 font-black" />
             </div>
          </button>
        ))}
        {!loading && filteredDealers.length === 0 && <div className="py-20 text-center text-gray-300 uppercase italic text-[10px] tracking-widest font-black">No Active Sessions</div>}
      </div>
    </div>
  );
};

export default DealerCart;
