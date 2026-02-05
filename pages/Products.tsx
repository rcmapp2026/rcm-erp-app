import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { 
  Plus, Loader2, X, Camera, Save, Search, Trash2, ArrowLeft, ChevronRight, ImageIcon, SaveAll, Circle, CheckCircle, Boxes
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSuccess } from '../App';

const Products: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Hardware' | 'RCM'>('Hardware');
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]); 
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form, setForm] = useState<any>({ 
    id: '', name: '', sku: '', company_id: '', category_id: '', unit: 'PCS', image_url: '',
    variants: [{ size: '', mrp: '', discount: '', final_price: '' }],
    stock_status: 'IN_STOCK'
  });

  const { triggerSuccess } = useSuccess();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, cData, compData] = await Promise.all([
        supabase.from('products').select(`*, category:category_id(name), company:company_id(name), product_variants(*)`).eq('product_type', activeTab).order('name'),
        supabase.from('categories').select('*').eq('type', activeTab).order('name'),
        supabase.from('companies').select('*').eq('type', activeTab).order('name')
      ]);
      setProducts((pData.data || []).map((p: any) => ({ ...p, category_name: p.category?.name, company_name: p.company?.name, stock_status: p.stock_status || 'IN_STOCK' })));
      setCategories(cData.data || []);
      setCompanies(compData.data || []);
    } catch (e) { toast.error("Error"); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const generateSKU = (type: string) => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return type === 'Hardware' ? `HW-${num}` : `RCM-${num}`;
  };

  const updateVariant = (idx: number, field: string, val: string) => {
    const next = [...form.variants];
    next[idx][field] = val;

    const mrp = parseFloat(field === 'mrp' ? val : next[idx].mrp) || 0;
    const disc = parseFloat(field === 'discount' ? val : next[idx].discount) || 0;
    const final = parseFloat(field === 'final_price' ? val : next[idx].final_price) || 0;

    if (field === 'mrp' || field === 'discount') {
      if (mrp > 0) {
        const calculatedFinal = Math.round(mrp - (mrp * disc / 100));
        next[idx].final_price = calculatedFinal.toString();
      }
    } else if (field === 'final_price') {
      if (mrp > 0) {
        const calculatedDisc = Math.round(((mrp - final) / mrp) * 100);
        next[idx].discount = calculatedDisc.toString();
      }
    }
    setForm((prev: any) => ({...prev, variants: next}));
  };

  const handleSave = async () => {
    if (!form.name || !form.company_id || !form.category_id) return toast.error("Selection Required");
    setLoading(true);
    try {
      const payload = { 
        name: form.name.toUpperCase(), sku: form.sku || generateSKU(activeTab), product_type: activeTab,
        company_id: form.company_id, category_id: form.category_id, unit: form.unit,
        price: parseFloat(form.variants[0]?.final_price) || 0, image_url: form.image_url || 'https://via.placeholder.com/150',
        stock_status: form.stock_status
      };
      let pid = form.id;
      if (pid) await supabase.from('products').update(payload).eq('id', pid);
      else {
        const { data } = await supabase.from('products').insert([payload]).select().single();
        pid = data.id;
      }
      await supabase.from('product_variants').delete().eq('product_id', pid);
      await supabase.from('product_variants').insert(form.variants.map((v: any) => ({ 
        product_id: pid, 
        size: v.size.toUpperCase(),
        mrp: parseFloat(v.mrp) || 0,
        discount: parseFloat(v.discount) || 0,
        final_price: parseFloat(v.final_price) || 0
      })));
      setIsModalOpen(false);
      triggerSuccess({ title: 'Saved', message: 'Asset Synced', actionLabel: 'OK', onAction: () => fetchData() });
    } catch (e) { toast.error("Save Failed"); }
    finally { setLoading(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("PURGE THIS ASSET PERMANENTLY?")) return;
    setLoading(true);
    try {
      await supabase.from('product_variants').delete().eq('product_id', id);
      await supabase.from('products').delete().eq('id', id);
      toast.success("ASSET PURGED");
      fetchData();
    } catch (e) { toast.error("DELETE FAILED"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white font-black text-left">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
           <div className="w-2 h-8 bg-blue-600"></div>
           <h2 className="text-3xl font-black italic uppercase text-black">STOCK <span className="text-blue-600">HUB</span></h2>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-blue-100 shadow-sm">
          <button onClick={() => setActiveTab('Hardware')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase italic ${activeTab === 'Hardware' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-none'}`}>Hardware</button>
          <button onClick={() => setActiveTab('RCM')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase italic ${activeTab === 'RCM' ? 'bg-blue-600 text-white' : 'bg-white text-blue-600 border-none'}`}>RCM</button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={20} />
          <input placeholder="SEARCH..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-14 !pl-12 border border-blue-100 rounded-xl bg-white text-blue-600" />
        </div>

        <button onClick={() => { setForm({ id: '', name: '', sku: generateSKU(activeTab), company_id: '', category_id: '', unit: 'PCS', image_url: '', variants: [{ size: '', mrp: '', discount: '', final_price: '' }], stock_status: 'IN_STOCK' }); setIsModalOpen(true); }} className="w-full py-4 bg-white text-blue-600 rounded-xl border border-blue-100 shadow-sm font-black flex items-center justify-center gap-3 active:scale-95 transition-all">
          <Plus size={24} /> NEW ASSET
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32 no-scrollbar">
        <div className="grid grid-cols-1 gap-4">
          {loading ? <Loader2 className="animate-spin text-blue-600 mx-auto" /> : products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
            <div key={p.id} onClick={() => { setForm({...p, variants: p.product_variants || [], stock_status: p.stock_status || 'IN_STOCK'}); setIsModalOpen(true); }} className="bg-white p-4 rounded-3xl border border-blue-100 flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm relative overflow-hidden group">
              <img src={p.image_url} className="w-24 h-24 object-cover rounded-2xl border border-blue-50 bg-slate-50" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black italic uppercase truncate text-blue-600 leading-tight">{p.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[8px] text-gray-400 font-black uppercase italic">{p.sku}</p>
                   <span className="text-[7px] bg-slate-100 px-2 py-0.5 rounded-full font-black text-gray-400 uppercase">{p.unit}</span>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xl font-black italic text-green-600 leading-none">₹{p.price}</p>
                  <ChevronRight size={20} className="text-blue-600" />
                </div>
              </div>
               {p.stock_status === 'OUT_OF_STOCK' && (
                <div className="absolute top-0 right-0 text-[8px] bg-red-600 text-white px-4 py-1.5 rounded-bl-2xl font-black uppercase italic shadow-lg">
                    OUT OF STOCK
                </div>
            )}
            </div>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-white z-[800] flex flex-col h-full w-full animate-in duration-300">
           <header className="px-6 py-6 border-b border-blue-50 flex justify-between items-center bg-white sticky top-0 z-[810]">
              <div className="flex items-center gap-3">
                 <button onClick={() => setIsModalOpen(false)} className="p-2.5 bg-slate-100 rounded-xl text-gray-600"><ArrowLeft size={24}/></button>
                 <h2 className="text-sm font-black italic uppercase text-gray-900 tracking-tighter">Asset Registry</h2>
              </div>
              <div className="flex items-center gap-3">
                 {form.id && <button onClick={() => deleteProduct(form.id)} className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 size={20}/></button>}
                 <button onClick={() => setIsModalOpen(false)}><X size={32}/></button>
              </div>
           </header>
           
           <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-40 bg-slate-50/50">
              <div className="flex flex-col items-center">
                 <div className="w-40 h-40 bg-white border-2 border-dashed border-blue-200 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden shadow-sm">
                    {form.image_url ? <img src={form.image_url} className="w-full h-full object-cover" /> : <ImageIcon size={40} className="text-blue-100" />}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return; setUploading(true);
                      const path = `products/p-${Date.now()}.png`;
                      await supabase.storage.from('products').upload(path, file);
                      const { data } = supabase.storage.from('products').getPublicUrl(path);
                      setForm({...form, image_url: data.publicUrl}); setUploading(false);
                    }} />
                    {uploading && <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32} /></div>}
                 </div>
                 <p className="text-[9px] font-black uppercase mt-3 text-blue-400 italic tracking-widest">Digital Asset Media</p>
              </div>

              <div className="bg-white p-8 rounded-[3rem] border-2 border-blue-600 shadow-sm space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 italic">Product Identifier</label>
                    <input placeholder="E.G. PREMIUM BRASS BOLT" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full !p-5 bg-slate-50 border-none rounded-2xl font-black italic uppercase text-xs" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4 italic">SKU (Auto)</label>
                        <input placeholder="SKU" value={form.sku} onChange={e => setForm({...form, sku: e.target.value.toUpperCase()})} className="w-full !p-5 bg-slate-50 border-none rounded-2xl font-black italic text-xs" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4 italic">Unit Factor</label>
                        <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full !p-5 bg-slate-50 border-none rounded-2xl font-black italic uppercase text-xs outline-none">
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
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4 italic">Brand Hub</label>
                        <select value={form.company_id} onChange={e => setForm({...form, company_id: e.target.value})} className="w-full !p-5 bg-slate-50 border-none rounded-2xl font-black italic uppercase text-xs outline-none">
                            <option value="">SELECT BRAND</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-400 ml-4 italic">Category</label>
                        <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full !p-5 bg-slate-50 border-none rounded-2xl font-black italic uppercase text-xs outline-none">
                            <option value="">SELECT CATEGORY</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4 italic">Stock Status</label>
                    <div className="flex bg-slate-50 p-1 rounded-2xl">
                        <button onClick={() => setForm({...form, stock_status: 'IN_STOCK'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic flex items-center justify-center gap-2 transition-all ${form.stock_status === 'IN_STOCK' ? 'bg-green-600 text-white shadow-lg' : 'text-green-600'}`}><CheckCircle size={16} /> In Stock</button>
                        <button onClick={() => setForm({...form, stock_status: 'OUT_OF_STOCK'})} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic flex items-center justify-center gap-2 transition-all ${form.stock_status === 'OUT_OF_STOCK' ? 'bg-red-600 text-white shadow-lg' : 'text-red-600'}`}><X size={16} /> Out of Stock</button>
                    </div>
                </div>
              </div>

              <div className="space-y-4">
                 <div className="flex justify-between items-center px-4">
                    <h4 className="text-[10px] font-black uppercase text-gray-400 italic tracking-[0.3em] flex items-center gap-2"><Boxes size={14}/> Scale Matrix</h4>
                    <button onClick={() => setForm(prev => ({...prev, variants: [...prev.variants, { size: '', mrp: '', discount: '', final_price: '' }]}))} className="bg-blue-600 text-white px-6 py-2.5 rounded-full text-[9px] font-black uppercase italic shadow-lg">+ ADD NEW SCALE</button>
                 </div>
                 {form.variants.map((v: any, i: number) => (
                   <div key={i} className="bg-white p-7 rounded-[2.5rem] border-2 border-blue-50 space-y-6 relative shadow-sm group">
                      <div className="space-y-1">
                         <label className="text-[9px] font-black uppercase text-gray-400 ml-4 italic">Scale / Dimension</label>
                         <input placeholder="E.G. 10MM / 15MM" value={v.size} onChange={e => updateVariant(i, 'size', e.target.value)} className="w-full !p-4 bg-slate-50 border-none rounded-xl font-black italic uppercase text-xs" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase italic text-center block">MRP</label>
                            <input type="number" value={v.mrp} onChange={e => updateVariant(i, 'mrp', e.target.value)} className="w-full text-center bg-slate-50 border-none rounded-xl p-4 font-black italic text-xs" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase italic text-center block">DISC %</label>
                            <input type="number" value={v.discount} onChange={e => updateVariant(i, 'discount', e.target.value)} className="w-full text-center bg-red-50 text-red-600 border-none rounded-xl p-4 font-black italic text-xs" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase italic text-center block">FINAL RATE</label>
                            <input type="number" value={v.final_price} onChange={e => updateVariant(i, 'final_price', e.target.value)} className="w-full text-center bg-green-50 text-green-600 border-none rounded-xl p-4 font-black italic text-xs" />
                         </div>
                      </div>
                      {i > 0 && <button onClick={() => setForm({...form, variants: form.variants.filter((_:any,idx:number)=>idx!==i)})} className="absolute -top-2 -right-2 bg-red-600 text-white p-2.5 rounded-full shadow-lg hover:scale-110 transition-all border-none"><Trash2 size={16}/></button>}
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-8 border-t border-blue-50 bg-white sticky bottom-0 rounded-t-[3rem] z-[820] shadow-2xl">
              <button onClick={handleSave} disabled={loading} className="w-full bg-black text-white p-7 rounded-[2rem] font-black uppercase italic shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-blue-600 group border-none">
                {loading ? <Loader2 className="animate-spin" /> : <SaveAll size={26} className="group-hover:translate-x-1 transition-transform"/>} AUTHORIZE SYNC
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
export default Products;
