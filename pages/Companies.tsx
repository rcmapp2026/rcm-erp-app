
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Building2, Loader2, Search, ArrowLeft, Edit3, X, Package, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const Companies: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Hardware' | 'RCM'>('Hardware');
  const [viewMode, setViewMode] = useState<'ADD' | 'REMOVE'>('REMOVE');
  const [comps, setComps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [selectedComp, setSelectedComp] = useState<any | null>(null);
  const [compProducts, setCompProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const fetchComps = useCallback(async () => {
    try {
      const { data } = await supabase.from('companies').select('*').eq('type', activeTab).order('name');
      setComps(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { 
    fetchComps(); 
    const channel = supabase.channel(`realtime-brands-${activeTab}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, fetchComps)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchComps, activeTab]);

  const fetchProducts = async (compId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.from('products').select('*, product_variants(*)').eq('company_id', compId).order('name');
      setCompProducts(data || []);
    } catch (e) {
      console.error("Error fetching company products:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Brand Label Required");
    setLoading(true);
    try {
      if (isEditing && editId) {
        const { error } = await supabase.from('companies').update({ name: name.toUpperCase() }).eq('id', editId);
        if (error) throw error;
        toast.success("REVISION LOGGED");
      } else {
        const { error } = await supabase.from('companies').insert([{ name: name.toUpperCase(), type: activeTab }]);
        if (error) throw error;
        toast.success("AUTHORIZED");
      }
      setName('');
      setIsEditing(false);
      setEditId(null);
      setViewMode('REMOVE'); 
    } catch (e: any) { 
      toast.error("FAIL: DATABASE LOCKED"); 
    } finally { setLoading(false); }
  };

  const openEdit = (e: React.MouseEvent, comp: any) => {
    e.stopPropagation();
    setName(comp.name);
    setEditId(comp.id);
    setIsEditing(true);
    setViewMode('ADD');
  };

  const filteredComps = comps.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  // Deep-Dive Overlay for Product Variants
  if (selectedProduct) {
    return (
      <div className="fixed inset-0 bg-white z-[200] flex flex-col animate-in slide-in-from-right duration-300 font-black">
        <header className="px-6 py-6 bg-blue-600 text-white flex items-center justify-between sticky top-0 z-[210]">
          <div className="flex items-center gap-4">
             <button onClick={() => setSelectedProduct(null)} className="p-2"><ArrowLeft size={28}/></button>
             <h2 className="text-lg font-black italic uppercase truncate max-w-[200px]">Asset Detail</h2>
          </div>
          <button onClick={() => setSelectedProduct(null)}><X size={28}/></button>
        </header>
        <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
           <div className="space-y-4">
              <div className="aspect-square w-full bg-gray-50 rounded-[3rem] border-2 border-blue-600 overflow-hidden shadow-xl">
                 <img src={selectedProduct.image_url} className="w-full h-full object-cover" />
              </div>
              <div className="px-4 text-center">
                 <h3 className="text-2xl font-black italic uppercase leading-none text-gray-900">{selectedProduct.name}</h3>
                 <p className="text-[10px] text-gray-400 uppercase italic mt-2 tracking-widest">SKU: {selectedProduct.sku} | Unit: {selectedProduct.unit}</p>
              </div>
           </div>

           <div className="space-y-4">
              <h4 className="text-[11px] font-black uppercase text-blue-600 italic border-b-2 border-blue-50 pb-2 flex items-center gap-2 px-2">
                 <Package size={14}/> Dimension Matrix
              </h4>
              <div className="grid grid-cols-1 gap-3">
                 {selectedProduct.product_variants?.map((v: any, i: number) => (
                   <div key={i} className="p-5 bg-white rounded-3xl border-2 border-blue-600 flex justify-between items-center shadow-md animate-in slide-in-from-bottom duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                      <div className="font-black">
                         <p className="text-[10px] text-gray-400 uppercase italic">Variant Node</p>
                         <h5 className="text-lg uppercase italic font-black text-gray-900">{v.size}</h5>
                      </div>
                      <div className="text-right font-black">
                         <p className="text-[8px] text-gray-400 line-through font-black italic">MRP ₹{v.mrp}</p>
                         <p className="text-xl italic font-black text-emerald-600">₹{v.final_price}</p>
                      </div>
                   </div>
                 ))}
                 {(!selectedProduct.product_variants || selectedProduct.product_variants.length === 0) && (
                    <div className="py-10 text-center text-gray-300 uppercase italic text-[10px] font-black">Zero Matrix Nodes Detected</div>
                 )}
              </div>
           </div>
        </div>
      </div>
    );
  }

  if (selectedComp) {
    return (
      <div className="flex flex-col min-h-full bg-white animate-in slide-in-from-right duration-300 font-black text-left">
        <header className="px-6 py-8 bg-black text-white flex items-center gap-6 sticky top-0 z-[110]">
          <button onClick={() => setSelectedComp(null)}><ArrowLeft size={28}/></button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">{selectedComp.name}</h2>
        </header>
        <div className="p-6 grid grid-cols-2 gap-4 pb-32">
          {loading ? <div className="col-span-2 py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600"/></div> : compProducts.length === 0 ? <p className="col-span-2 text-center text-gray-300 font-black italic py-20 uppercase tracking-widest">No Assets Available</p> : compProducts.map(p => (
            <button key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white p-4 rounded-3xl border-2 border-blue-600 shadow-sm text-left active:scale-[0.98] transition-all flex flex-col">
               <img src={p.image_url} className="w-full aspect-square object-cover rounded-2xl mb-3 shadow-sm"/>
               <p className="text-[10px] font-black uppercase italic leading-tight truncate">{p.name}</p>
               <div className="flex items-center justify-between mt-2">
                  <p className="text-sm font-black italic text-emerald-600">₹{Math.round(p.price).toLocaleString()}</p>
                  <ChevronRight size={14} className="text-blue-600"/>
               </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32 px-4 font-black text-left">
      <div className="flex bg-gray-900 p-1.5 rounded-[1.5rem] shadow-xl items-center gap-2">
        <button onClick={() => { setActiveTab('Hardware'); setViewMode('REMOVE'); }} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'Hardware' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>Hardware</button>
        <button onClick={() => { setActiveTab('RCM'); setViewMode('REMOVE'); }} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'RCM' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>RCM</button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input type="text" placeholder="Search Authorized Brands..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-50 p-6 pl-14 rounded-[2rem] font-black uppercase italic outline-none shadow-sm transition-all focus:bg-white focus:ring-4 focus:ring-orange-500/5" />
      </div>

      <div className="flex bg-gray-100 p-1.5 rounded-2xl border border-gray-200">
        <button onClick={() => { setViewMode('ADD'); setIsEditing(false); setName(''); }} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'ADD' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>ADD BRAND</button>
        <button onClick={() => setViewMode('REMOVE')} className={`flex-1 py-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'REMOVE' ? 'bg-white text-rcm-red shadow-sm' : 'text-gray-400'}`}>{isEditing ? 'REVISE' : 'VIEW'}</button>
      </div>

      {viewMode === 'ADD' && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6 animate-in slide-in-from-top-4 duration-300">
           <input value={name} onChange={e => setName(e.target.value)} placeholder="BRAND NAME..." className="w-full p-6 bg-gray-50 rounded-2xl font-black italic uppercase outline-none border-none text-lg shadow-inner" />
           <button onClick={handleSave} className="w-full py-7 bg-orange-500 text-white rounded-[2rem] font-black uppercase italic tracking-[0.2em] shadow-xl active:scale-95 transition-all">
             {isEditing ? 'CONFIRM REVISION' : 'AUTHORIZE BRAND'}
           </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filteredComps.map(c => (
          <div key={c.id} className="w-full p-6 bg-white rounded-2xl border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm">
             <button onClick={() => { setSelectedComp(c); fetchProducts(c.id); }} className="flex-1 flex items-center gap-4 text-left">
                <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><Building2 size={18}/></div>
                <span className="font-black italic uppercase text-sm tracking-tight">{c.name}</span>
             </button>
             {viewMode === 'REMOVE' && (
               <div className="flex gap-2">
                 <button onClick={(e) => openEdit(e, c)} className="p-3 text-blue-600 bg-blue-50 rounded-xl active:scale-95 border border-blue-100 shadow-sm"><Edit3 size={18}/></button>
               </div>
             )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default Companies;
