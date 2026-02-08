
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Plus, Loader2, X, Search, ImageIcon, Sparkles, ArrowLeft, Save, Edit3 } from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { FileUtils } from '../utils/fileUtils';

const Offers: React.FC = () => {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({ 
    title: '', description: '', image_url: '', is_active: true, 
    variants: [{ amount: 0, gift: '' }], terms: ['']
  });
  
  const fetchOffers = useCallback(async () => {
    try {
      const { data } = await supabase.from('offers').select('*').order('created_at', { ascending: false });
      setOffers(data || []);
    } catch (e) {
      console.error("Offers fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    fetchOffers(); 
    const channel = supabase.channel('realtime-offers-hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, fetchOffers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOffers]);

  const handleSave = async () => {
    if (!form.title) return toast.error("TITLE REQUIRED");
    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('offers').update(form).eq('id', editingId);
        if (error) throw error;
        toast.success("CAMPAIGN UPDATED");
      } else {
        const { error } = await supabase.from('offers').insert([form]);
        if (error) throw error;
        toast.success("CAMPAIGN AUTHORIZED");
      }
      setIsEditorOpen(false); 
      setEditingId(null); 
    } catch (e) { toast.error("PROTOCOL FAIL"); }
    finally { setLoading(false); }
  };

  const handleEdit = (offer: any) => {
    setEditingId(offer.id);
    setForm({
      title: offer.title,
      description: offer.description || '',
      image_url: offer.image_url || '',
      is_active: offer.is_active,
      variants: Array.isArray(offer.variants) ? offer.variants : [{ amount: 0, gift: '' }],
      terms: Array.isArray(offer.terms) ? offer.terms : ['']
    });
    setIsEditorOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const compressedFile = await FileUtils.compressImage(file);
      const path = `offers/off-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from('products').upload(path, compressedFile);
      if (error) throw error;
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setForm({...form, image_url: data.publicUrl});
      toast.success("POSTER READY");
    } catch (e) { toast.error("UPLOAD FAILED"); }
    finally { setUploading(false); }
  };

  const addVariant = () => {
    setForm({...form, variants: [...form.variants, { amount: 0, gift: '' }]});
  };

  const filteredOffers = offers.filter(o => o.title.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isEditorOpen) {
    return (
      <div className="fixed inset-0 bg-white z-[300] flex flex-col no-print animate-in slide-in-from-right duration-300 font-black">
        <header className="px-4 py-4 flex items-center justify-between text-white bg-blue-600">
          <div className="flex items-center gap-3">
             <button onClick={() => { setIsEditorOpen(false); setEditingId(null); }}><ArrowLeft size={24} /></button>
             <h2 className="text-lg font-black italic uppercase tracking-tighter">{editingId ? 'Edit Campaign' : 'New Campaign'}</h2>
          </div>
          <button onClick={handleSave} disabled={loading} className="p-2 bg-white text-blue-600 rounded-lg"><Save size={18} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 font-black">
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] uppercase italic text-gray-400 tracking-widest block ml-2">Offer Poster Image</label>
                 <div className="w-full aspect-video bg-gray-50 rounded-[2rem] border-2 border-blue-400 border-dashed relative overflow-hidden flex flex-col items-center justify-center">
                    {form.image_url ? (
                      <img src={form.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center opacity-30">
                         <ImageIcon size={48} className="mx-auto mb-2" />
                         <p className="text-[10px] uppercase font-black">Upload Visual</p>
                      </div>
                    )}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                    {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] uppercase italic text-gray-400 tracking-widest block ml-2">Offer Title</label>
                 <input 
                   value={form.title} 
                   onChange={e => setForm({...form, title: e.target.value.toUpperCase()})} 
                   placeholder="E.G. NEW YEAR DHAMAKA" 
                   className="w-full p-5 bg-white border-2 border-blue-400 rounded-2xl font-black italic uppercase text-sm" 
                 />
              </div>
           </div>

           <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                 <label className="text-[10px] uppercase italic text-gray-400 tracking-widest">Variant Registry (Serial List)</label>
                 <button onClick={addVariant} className="text-[9px] font-black text-blue-600 uppercase border-b-2 border-blue-600 italic">+ ADD ROW</button>
              </div>
              <div className="space-y-4">
                 {form.variants.map((v, i) => (
                   <div key={i} className="bg-white p-5 rounded-2xl border-2 border-purple-300 shadow-sm relative space-y-4">
                      <div className="absolute -top-2 -left-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                        {i + 1}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <p className="text-[8px] uppercase text-gray-400 italic font-black">Amount ₹</p>
                            <input 
                              type="number" 
                              value={v.amount} 
                              onChange={e => {
                                const next = [...form.variants];
                                next[i].amount = Number(e.target.value);
                                setForm({...form, variants: next});
                              }} 
                              className="w-full p-3 border-2 border-blue-100 rounded-xl font-black text-sm outline-none" 
                            />
                         </div>
                         <div className="space-y-1">
                            <p className="text-[8px] uppercase text-gray-400 italic font-black">Gift Name</p>
                            <input 
                              value={v.gift} 
                              onChange={e => {
                                const next = [...form.variants];
                                next[i].gift = e.target.value.toUpperCase();
                                setForm({...form, variants: next});
                              }} 
                              className="w-full p-3 border-2 border-blue-100 rounded-xl font-black italic text-xs uppercase outline-none" 
                            />
                         </div>
                      </div>
                      {i > 0 && (
                        <button 
                          onClick={() => setForm({...form, variants: form.variants.filter((_, idx) => idx !== i)})} 
                          className="absolute -top-2 -right-2 p-1.5 bg-red-600 text-white rounded-full shadow-lg"
                        >
                          <X size={12}/>
                        </button>
                      )}
                   </div>
                 ))}
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-[10px] uppercase italic text-gray-400 tracking-widest block ml-2">Terms & Conditions</label>
              <textarea 
                value={form.terms[0]} 
                onChange={e => setForm({...form, terms: [e.target.value.toUpperCase()]})} 
                rows={4} 
                className="w-full p-5 bg-white border-2 border-blue-600 rounded-2xl font-black italic uppercase text-xs leading-relaxed resize-none outline-none" 
                placeholder="RULES & GUIDELINES..." 
              />
           </div>

           <button 
             onClick={handleSave} 
             className="w-full py-6 bg-blue-600 text-white rounded-2xl font-black uppercase italic tracking-widest text-sm shadow-xl active:scale-95 transition-all"
           >
              {loading ? <Loader2 className="animate-spin mx-auto" /> : (editingId ? 'UPDATE PROTOCOL' : 'SAVE CAMPAIGN')}
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 px-4 pt-4 pb-20 font-black">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
        <input 
          type="text" 
          placeholder="Search Campaigns..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          className="w-full pl-12 p-4 bg-white border-2 border-blue-600 rounded-2xl text-xs uppercase italic" 
        />
      </div>

      <button onClick={() => setIsEditorOpen(true)} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase italic text-xs flex items-center justify-center gap-2 shadow-lg">
        <Sparkles size={16}/> NEW CAMPAIGN
      </button>

      <div className="space-y-6 pb-20 font-black">
        {loading ? <div className="py-20 text-center font-black"><Loader2 className="animate-spin text-blue-600" /></div> : filteredOffers.map((o) => (
          <div key={o.id} className="bg-white rounded-[2rem] border-2 border-blue-600 overflow-hidden relative shadow-md">
            <div className="aspect-[16/8] bg-gray-50 border-b-2 border-blue-600">
               <img src={o.image_url || 'https://via.placeholder.com/600x400?text=RCM+OFFER'} className="w-full h-full object-cover" />
            </div>
            <div className="p-6">
               <h3 className="text-lg font-black italic uppercase tracking-tighter text-gray-900">{o.title}</h3>
               <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => handleEdit(o)} 
                    className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-black uppercase italic text-[10px] tracking-widest flex items-center justify-center gap-2"
                  >
                     <Edit3 size={14}/> EDIT
                  </button>
               </div>
            </div>
          </div>
        ))}
        {filteredOffers.length === 0 && !loading && (
          <div className="py-20 text-center text-gray-300 uppercase italic text-[10px] tracking-widest font-black">Zero Campaigns Detected</div>
        )}
      </div>
    </div>
  );
};

export default Offers;
