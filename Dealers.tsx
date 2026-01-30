
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { 
  Search, Loader2, ArrowLeft, User, Phone, 
  MapPin, X, Plus, Save, ChevronRight, CheckCircle2, AlertCircle,
  Edit3, ShieldCheck, Tag, Camera, Image as ImageIcon,
  Settings2, Hash, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSuccess } from './App';

const Dealers: React.FC = () => {
  const [dealers, setDealers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<any | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const initialForm = { 
    id: '', 
    dealer_code: '', 
    shop_name: '', 
    owner_name: '', 
    mobile: '', 
    address: '', 
    city: '', 
    pincode: '', 
    state: 'Bihar',
    is_active: false, 
    is_verified: false, 
    status: 'Pending', 
    cheques_number: '', 
    cheques_img_url: '', 
    profile_img: '', 
    category_access: [] as string[],
    payment_block: false
  };

  const [form, setForm] = useState<any>(initialForm);
  const { triggerSuccess } = useSuccess();

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [{ data: dData, error: dError }, { data: cData, error: cError }] = await Promise.all([
        supabase.from('dealers').select('*').order('shop_name'),
        supabase.from('categories').select('*').order('name')
      ]);
      if (dError) throw dError;
      if (cError) throw cError;
      setDealers(dData || []);
      setCategories(cData || []);
    } catch (err) {
      toast.error("FETCH FAILED");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `dealers/cheque-${Date.now()}.png`;
      const { error } = await supabase.storage.from('products').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('products').getPublicUrl(path);
      setForm((prev: any) => ({...prev, cheques_img_url: data.publicUrl}));
      toast.success("ARTIFACT READY");
    } catch (e) { toast.error("UPLOAD FAILED"); }
    finally { setUploading(false); }
  };

  const toggleStatus = () => {
    if (!isEditing) return;
    const nextActive = !form.is_active;
    setForm({
      ...form,
      is_active: nextActive,
      is_verified: nextActive,
      status: nextActive ? 'Active' : 'Inactive'
    });
  };

  const togglePaymentBlock = () => {
    if (!isEditing) return;
    setForm({
      ...form,
      payment_block: !form.payment_block
    });
  };

  const toggleCategory = (catId: string) => {
    if (!isEditing) return;
    const current = form.category_access || [];
    const next = current.includes(catId) 
      ? current.filter((id: string) => id !== catId)
      : [...current, catId];
    setForm({...form, category_access: next});
  };

  const handleSave = async () => {
    if (!form.shop_name?.trim()) return toast.error("SHOP NAME REQUIRED");
    if (!form.mobile?.trim()) return toast.error("MOBILE REQUIRED");
    
    setLoading(true);
    try {
      const payload: any = { 
        shop_name: form.shop_name.toUpperCase(), 
        owner_name: (form.owner_name || '').toUpperCase(),
        mobile: form.mobile,
        address: (form.address || '').toUpperCase(),
        city: (form.city || '').toUpperCase(),
        pincode: form.pincode,
        state: form.state || 'Bihar',
        is_active: Boolean(form.is_active),
        is_verified: Boolean(form.is_verified), 
        status: form.status,
        cheques_number: form.cheques_number || '',
        cheques_img_url: form.cheques_img_url || '',
        category_access: form.category_access || [],
        profile_img: form.profile_img || '',
        payment_block: Boolean(form.payment_block)
      };
      
      if (form.id) {
        const { error } = await supabase.from('dealers').update(payload).eq('id', form.id);
        if (error) throw error;
        toast.success("CORE SYNC COMPLETED ✅");
        setSelectedDealer({ ...form, ...payload });
        setIsEditing(false);
        fetchData(true);
      } else {
        const code = `RCM-${Math.floor(1000 + Math.random() * 9000)}`;
        const { error } = await supabase.from('dealers').insert([{ ...payload, dealer_code: code }]);
        if (error) throw error;
        setIsModalOpen(false);
        triggerSuccess({ 
          title: 'Success', 
          message: 'NEW HUB REGISTERED', 
          actionLabel: 'OK', 
          onAction: () => fetchData(true) 
        });
      }
    } catch (e: any) { 
      console.error("Supabase Error:", e);
      toast.error(`SYNC FAILED: ${e.message || 'DATABASE REJECTED'}`); 
    } finally { 
      setLoading(false); 
    }
  };

  const filteredDealers = dealers.filter(d => 
    (d.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.dealer_code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden font-black">
      {!selectedDealer && !isModalOpen ? (
        <div className="p-6 space-y-4 animate-in fade-in duration-300">
          <div className="relative pt-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              placeholder="Search Dealer Network..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="w-full h-16 pl-14 bg-slate-50 border-transparent rounded-[1.8rem] italic font-black text-xs uppercase shadow-inner" 
            />
          </div>
          <button 
            onClick={() => { setForm(initialForm); setIsEditing(true); setIsModalOpen(true); }} 
            className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black uppercase italic text-xs shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <Plus size={20} strokeWidth={4}/> REGISTER NEW HUB
          </button>
          
          <div className="grid grid-cols-1 gap-3 pt-4 pb-32 overflow-y-auto no-scrollbar h-[calc(100vh-250px)]">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" /></div>
            ) : filteredDealers.map(d => (
              <button 
                key={d.id} 
                onClick={() => { setSelectedDealer(d); setForm(d); setIsEditing(false); }} 
                className="w-full bg-white p-5 rounded-[2rem] border-2 border-slate-50 flex justify-between items-center shadow-sm active:scale-[0.98] transition-all relative overflow-hidden"
              >
                <div className="flex items-center gap-4 truncate">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${d.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {d.payment_block ? <Lock size={22} className="text-red-700" /> : (d.is_active ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />)}
                  </div>
                  <div className="truncate text-left">
                    <h3 className="text-sm font-black italic uppercase text-black leading-none truncate">{d.shop_name}</h3>
                    <p className="text-[9px] text-gray-400 font-black uppercase italic mt-1.5 tracking-tighter">#{d.dealer_code} • {d.city || 'BIHAR'}</p>
                  </div>
                </div>
                {d.payment_block && (
                  <div className="absolute top-0 right-10 bg-red-600 text-white text-[7px] px-2 py-1 rounded-b-lg font-black italic uppercase">Financial Hold</div>
                )}
                <ChevronRight size={18} className="text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-white z-[700] flex flex-col animate-in slide-in-from-right duration-300 h-full w-full">
          <header className="px-6 py-6 border-b flex justify-between items-center bg-white sticky top-0 z-[800]">
            <div className="flex items-center gap-4">
              <button onClick={() => { setSelectedDealer(null); setIsModalOpen(false); setIsEditing(false); }} className="p-2 bg-slate-100 rounded-xl active:scale-90"><ArrowLeft size={24}/></button>
              <div className="truncate max-w-[180px]">
                <h2 className="text-lg font-black italic uppercase text-black leading-none truncate">{form.shop_name || 'NEW HUB'}</h2>
                <p className="text-[8px] text-gray-400 font-black italic mt-1 uppercase">CODE: {form.dealer_code || 'PENDING'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`p-3 rounded-xl transition-all active:scale-90 ${isEditing ? 'bg-blue-600 text-white' : 'bg-slate-100 text-blue-600'}`}
              >
                <Edit3 size={20}/>
              </button>
              <button onClick={() => { setSelectedDealer(null); setIsModalOpen(false); setIsEditing(false); }}><X size={32}/></button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 no-scrollbar pb-40">
             
             {/* Financial Lock Control Panel */}
             <div className="bg-white p-7 rounded-[2.5rem] shadow-xl border-2 border-red-600 space-y-4 animate-in fade-in zoom-in duration-500">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <Lock size={18} className="text-red-600" />
                  <h4 className="text-[10px] font-black uppercase text-red-600 italic tracking-widest">Financial Hold Command</h4>
                </div>
                <div className="flex flex-col gap-4">
                  <p className="text-[9px] text-gray-400 font-black italic uppercase leading-relaxed">
                    Enable this to block the dealer from accessing RCM & Hardware stock sections due to overdue payments.
                  </p>
                  <button 
                    disabled={!isEditing}
                    onClick={togglePaymentBlock}
                    className={`w-full py-6 rounded-2xl flex items-center justify-center gap-4 border-2 transition-all active:scale-95 ${form.payment_block ? 'bg-red-600 border-red-700 text-white shadow-2xl' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                  >
                     {form.payment_block ? <Lock size={28} /> : <Unlock size={28} />}
                     <div className="text-left">
                        <span className="text-lg font-black italic uppercase tracking-tighter block leading-none">
                          {form.payment_block ? 'HOLD ACTIVE' : 'NO HOLD'}
                        </span>
                        <span className="text-[7px] font-black uppercase tracking-widest italic opacity-70">
                          Target App: Product Access Blocked
                        </span>
                     </div>
                  </button>
                </div>
             </div>

             <div className="bg-white p-7 rounded-[2.5rem] shadow-md border-2 border-slate-50 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <User size={18} className="text-blue-600" />
                  <h4 className="text-[10px] font-black uppercase text-gray-900 italic tracking-widest">Dealer Hub Profile</h4>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Shop Name</label>
                      <input 
                        disabled={!isEditing}
                        placeholder="SHOP NAME" 
                        value={form.shop_name} 
                        onChange={e => setForm({...form, shop_name: e.target.value})} 
                        className={`w-full !p-4 border-none font-black italic uppercase text-sm rounded-2xl ${isEditing ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-slate-100'}`}
                      />
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Owner Name</label>
                      <input 
                        disabled={!isEditing}
                        placeholder="OWNER NAME" 
                        value={form.owner_name} 
                        onChange={e => setForm({...form, owner_name: e.target.value})} 
                        className={`w-full !p-4 border-none font-black italic uppercase text-sm rounded-2xl ${isEditing ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-slate-100'}`}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Mobile</label>
                         <input 
                           disabled={!isEditing}
                           placeholder="MOBILE" 
                           value={form.mobile} 
                           onChange={e => setForm({...form, mobile: e.target.value})} 
                           className={`w-full !p-4 border-none font-black italic text-sm rounded-2xl ${isEditing ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-slate-100'}`}
                         />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">PIN Code</label>
                         <input 
                           disabled={!isEditing}
                           placeholder="PINCODE" 
                           value={form.pincode} 
                           onChange={e => setForm({...form, pincode: e.target.value})} 
                           className={`w-full !p-4 border-none font-black italic text-sm rounded-2xl ${isEditing ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-slate-100'}`}
                         />
                      </div>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Hub Address</label>
                      <textarea 
                        disabled={!isEditing}
                        placeholder="FULL ADDRESS" 
                        value={form.address} 
                        rows={2}
                        onChange={e => setForm({...form, address: e.target.value})} 
                        className={`w-full !p-4 border-none font-black italic uppercase text-sm rounded-2xl resize-none ${isEditing ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-slate-100'}`}
                      />
                   </div>
                </div>
             </div>

             <div className="bg-white p-7 rounded-[2.5rem] shadow-md border-2 border-slate-50 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <Tag size={18} className="text-blue-600" />
                  <h4 className="text-[10px] font-black uppercase text-gray-900 italic tracking-widest">Category Permissions</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                   {categories.map(cat => (
                     <button 
                       key={cat.id}
                       disabled={!isEditing}
                       onClick={() => toggleCategory(cat.id)}
                       className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic transition-all ${
                         (form.category_access || []).includes(cat.id)
                           ? 'bg-blue-600 text-white shadow-md'
                           : 'bg-slate-100 text-slate-400'
                       } ${!isEditing && 'opacity-80'}`}
                     >
                       {cat.name}
                     </button>
                   ))}
                </div>
             </div>

             <div className="bg-white p-7 rounded-[2.5rem] shadow-md border-2 border-slate-50 space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <ShieldCheck size={18} className="text-blue-600" />
                  <h4 className="text-[10px] font-black uppercase text-gray-900 italic tracking-widest">Security Credentials</h4>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Cheque Number</label>
                      <div className="relative flex items-center">
                         <Hash className="absolute left-4 text-blue-600" size={16}/>
                         <input 
                           disabled={!isEditing}
                           placeholder="CHEQUE #" 
                           value={form.cheques_number} 
                           onChange={e => setForm({...form, cheques_number: e.target.value})} 
                           className={`w-full !p-4 pl-12 border-none font-black italic uppercase text-sm rounded-2xl ${isEditing ? 'bg-blue-50 ring-2 ring-blue-100' : 'bg-slate-100'}`}
                         />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-gray-400 italic ml-2">Cheque Photo</label>
                      <div className={`relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-dashed flex items-center justify-center ${isEditing ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-100'}`}>
                         {form.cheques_img_url ? (
                            <img src={form.cheques_img_url} className="w-full h-full object-cover" />
                         ) : (
                            <div className="text-center opacity-30">
                               <ImageIcon size={42} className="mx-auto mb-2" />
                               <p className="text-[9px] font-black uppercase italic">No Doc Uploaded</p>
                            </div>
                         )}
                         {isEditing && (
                           <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Camera className="text-white" size={32} />
                              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                           </div>
                         )}
                         {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}
                      </div>
                   </div>
                </div>
             </div>

             <div className="bg-white p-7 rounded-[2.5rem] shadow-md border-2 border-slate-50 space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <Settings2 size={18} className="text-blue-600" />
                  <h4 className="text-[10px] font-black uppercase text-gray-900 italic tracking-widest">Network Authorization</h4>
                </div>
                <button 
                  disabled={!isEditing}
                  onClick={toggleStatus}
                  className={`w-full py-6 rounded-[2rem] flex items-center justify-center gap-4 border-2 transition-all active:scale-95 ${form.is_active ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'} ${!isEditing && 'opacity-60'}`}
                >
                   {form.is_active ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
                   <div className="text-left">
                      <span className="text-lg font-black italic uppercase tracking-tighter block leading-none">
                        {form.is_active ? 'HUB ACTIVE' : 'HUB INACTIVE'}
                      </span>
                      <span className="text-[7px] font-black uppercase tracking-widest italic opacity-60">
                        Status: {form.status} • Verified: {form.is_verified ? 'YES' : 'NO'}
                      </span>
                   </div>
                </button>
             </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t z-[900] shadow-2xl shrink-0 flex gap-4">
             {isEditing && (
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="w-full bg-blue-600 text-white p-6 rounded-2xl font-black uppercase italic shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-sm tracking-[0.2em]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Save size={24} strokeWidth={3}/>} 
                  AUTHORIZE CORE SYNC
                </button>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dealers;
