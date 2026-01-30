
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Tag, Loader2, X, Search, ArrowLeft, Edit3, ChevronRight, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const Categories: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'Hardware' | 'RCM'>('Hardware');
  const [viewMode, setViewMode] = useState<'VIEW' | 'ADD'>('VIEW');
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [name, setName] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [selectedCat, setSelectedCat] = useState<any | null>(null);
  const [catProducts, setCatProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const fetchCats = useCallback(async () => {
    try {
      const { data } = await supabase.from('categories').select('*').eq('type', activeTab).order('name');
      setCats(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { 
    fetchCats(); 
    const channel = supabase.channel(`realtime-cats-${activeTab}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCats)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchCats, activeTab]);

  const fetchProducts = async (catId: string) => {
    setLoading(true);
    try {
      const { data } = await supabase.from('products').select('*, product_variants(*)').eq('category_id', catId).order('name');
      setCatProducts(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Label Required");
    setLoading(true);
    try {
      if (isEditing && editId) {
        const { error } = await supabase.from('categories').update({ name: name.toUpperCase() }).eq('id', editId);
        if (error) throw error;
        toast.success("REVISION LOGGED");
      } else {
        const { error } = await supabase.from('categories').insert([{ name: name.toUpperCase(), type: activeTab }]);
        if (error) throw error;
        toast.success("AUTHORIZED");
      }
      
      setName(''); 
      setIsEditing(false);
      setEditId(null);
      setViewMode('VIEW'); 
    } catch (e: any) { 
      toast.error("PROTOCOL FAIL"); 
    } finally { setLoading(false); }
  };

  const openEdit = (e: React.MouseEvent, cat: any) => {
    e.stopPropagation();
    setName(cat.name);
    setEditId(cat.id);
    setIsEditing(true);
    setViewMode('ADD');
  };

  const filteredCats = cats.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

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

  if (selectedCat) {
    return (
      <div className="flex flex-col min-h-full bg-white animate-in slide-in-from-right duration-300">
        <header className="px-6 py-6 bg-black text-white flex items-center gap-6 sticky top-0 z-[110] shadow-xl">
          <button onClick={() => setSelectedCat(null)} className="p-2 active:scale-90 transition-all"><ArrowLeft size={32}/></button>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">{selectedCat.name}</h2>
        </header>
        <div className="p-6 grid grid-cols-2 gap-4 pb-32">
          {loading ? <div className="col-span-2 py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={32}/></div> : catProducts.length === 0 ? <p className="col-span-2 text-center text-gray-300 font-black italic py-20 uppercase tracking-[0.4em]">Zero Assets</p> : catProducts.map(p => (
            <button key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white p-4 rounded-[2.5rem] border-2 border-blue-600 shadow-sm flex flex-col text-left active:scale-[0.98] transition-all">
               <div className="aspect-square bg-gray-50 rounded-[2rem] overflow-hidden mb-4 shadow-inner">
                  <img src={p.image_url || 'https://via.placeholder.com/300'} className="w-full h-full object-cover"/>
               </div>
               <p className="text-[11px] font-black uppercase italic leading-tight truncate px-2">{p.name}</p>
               <div className="flex items-center justify-between mt-2 px-2">
                  <p className="text-base font-black italic text-rcm-green tracking-tighter">₹{Math.round(p.price).toLocaleString()}</p>
                  <ChevronRight size={14} className="text-blue-600"/>
               </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32 px-4 pt-2 font-black text-left">
      <div className="flex bg-gray-900 p-2 rounded-[2.5rem] shadow-xl items-center gap-2">
        <button onClick={() => { setActiveTab('Hardware'); setViewMode('VIEW'); }} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'Hardware' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>Hardware</button>
        <button onClick={() => { setActiveTab('RCM'); setViewMode('VIEW'); }} className={`flex-1 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all italic ${activeTab === 'RCM' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>RCM Distribution</button>
      </div>

      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-600 transition-colors" size={24} />
        <input type="text" placeholder="Search Taxonomy..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border-none p-7 pl-16 rounded-[2.5rem] font-black uppercase italic outline-none shadow-sm focus:ring-4 focus:ring-blue-600/5 transition-all" />
      </div>

      <div className="flex bg-gray-100 p-2 rounded-[2.5rem] border border-gray-200">
        <button onClick={() => { setViewMode('VIEW'); setIsEditing(false); setName(''); }} className={`flex-1 py-4 rounded-[1.8rem] text-[9px] font-black uppercase tracking-widest transition-all italic ${viewMode === 'VIEW' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}>VIEW REGISTRY</button>
        <button onClick={() => setViewMode('ADD')} className={`flex-1 py-4 rounded-[1.8rem] text-[9px] font-black uppercase tracking-widest transition-all italic ${viewMode === 'ADD' ? 'bg-white text-blue-600 shadow-sm border border-gray-100' : 'text-gray-400'}`}>{isEditing ? 'REVISE' : 'ADD TAXONOMY'}</button>
      </div>

      {viewMode === 'ADD' ? (
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-xl space-y-8 animate-in slide-in-from-top-4 duration-300">
           <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-400 italic ml-4 tracking-widest">{isEditing ? 'Revise' : 'Category'} Label</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="ENTER LABEL..." className="w-full p-7 bg-gray-50 rounded-[2rem] font-black italic uppercase outline-none border-none text-lg shadow-inner" />
           </div>
           <div className="grid grid-cols-1 gap-3">
              <button onClick={handleSave} className="w-full py-8 bg-blue-600 text-white rounded-[2.5rem] font-black uppercase italic tracking-[0.4em] shadow-2xl active:scale-95 transition-all">
                {isEditing ? 'CONFIRM REVISION' : 'AUTHORIZE LOG'}
              </button>
              {isEditing && (
                <button onClick={() => { setIsEditing(false); setViewMode('VIEW'); setName(''); }} className="w-full py-4 text-[10px] font-black uppercase text-gray-400">Cancel Revision</button>
              )}
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em] ml-6 italic">Existing Nodes</h4>
          {filteredCats.map(c => (
            <div key={c.id} className="w-full p-7 bg-white rounded-[2.5rem] border border-gray-100 flex items-center justify-between group active:scale-[0.98] transition-all shadow-sm">
               <button onClick={() => { setSelectedCat(c); fetchProducts(c.id); }} className="flex-1 flex items-center gap-5 text-left">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all"><Tag size={22}/></div>
                  <span className="font-black italic uppercase text-sm tracking-tight text-gray-900">{c.name}</span>
               </button>
               <div className="flex gap-2">
                 <button onClick={(e) => openEdit(e, c)} className="p-4 text-blue-600 bg-blue-50 rounded-2xl active:scale-90 transition-all border border-blue-100"><Edit3 size={20}/></button>
               </div>
            </div>
          ))}
          {filteredCats.length === 0 && !loading && (
            <div className="py-20 text-center opacity-20 font-black italic uppercase tracking-[0.4em]">Empty Registry</div>
          )}
        </div>
      )}
    </div>
  );
};
export default Categories;
