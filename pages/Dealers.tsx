
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  Search, Loader2, ArrowLeft, X, Plus, Save, ChevronRight, CheckCircle2,
  Edit3, Tag, Camera, Lock, Unlock, Phone, Building2, Hash,
  ShieldCheck, User, MapPin, Ban, UserCheck, CheckCircle, BadgeCheck,
  Trash2, Image as ImageIcon, Smartphone, ZoomIn, Globe, Map
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSuccess } from '../App';
import { Dealer, Category } from '../types';

// High-End Input Component
const ModernInput = ({ label, value, onChange, placeholder, icon: Icon, disabled, type = "text" }: any) => (
  <div className="space-y-1.5 w-full">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 italic">{label}</label>
    <div className={`flex items-center gap-4 px-6 py-5 rounded-[1.8rem] border-2 transition-all ${disabled ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 focus-within:border-blue-600 focus-within:ring-8 focus-within:ring-blue-50/50 shadow-sm'}`}>
      {Icon && <Icon size={20} className={disabled ? 'text-slate-300' : 'text-blue-600'} />}
      <input
        type={type}
        disabled={disabled}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-sm font-black text-black placeholder:text-slate-300 uppercase italic tracking-tight"
      />
    </div>
  </div>
);

const Dealers: React.FC = () => {
  const navigate = useNavigate();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [mode, setMode] = useState<'list' | 'view' | 'edit' | 'create'>('list');
  const [activeRecord, setActiveRecord] = useState<Dealer | null>(null);

  const initialForm: Partial<Dealer> = {
    dealer_code: '', shop_name: '', owner_name: '', mobile: '',
    address: '', city: '', state: 'Bihar', pincode: '',
    status: 'Pending', is_verified: false,
    category_access: [], cheques_img_urls: [],
    profile_img: '', cheques_number: [],
    payment_block: false
  };

  const [form, setForm] = useState<any>(initialForm);
  const { triggerSuccess } = useSuccess();

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [{ data: d }, { data: c }] = await Promise.all([
        supabase.from('dealers').select('*').order('shop_name'),
        supabase.from('categories').select('*').order('name')
      ]);

      const sanitizedDealers = (d || []).map(item => ({
        ...item,
        payment_block: !!item.payment_block,
        status: item.status || 'Pending',
        is_verified: !!item.is_verified,
        cheques_img_urls: Array.isArray(item.cheques_img_urls) ? item.cheques_img_urls : [],
        cheques_number: Array.isArray(item.cheques_number) ? item.cheques_number : [],
        category_access: Array.isArray(item.category_access) ? item.category_access : []
      })) as Dealer[];

      setDealers(sanitizedDealers);
      setCategories(c || []);
    } catch (e) { toast.error("DB SYNC FAILED"); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBack = () => {
    if (mode === 'list') navigate('/');
    else if (mode === 'view') { setMode('list'); setActiveRecord(null); }
    else if (mode === 'edit') { setForm(activeRecord); setMode('view'); }
    else if (mode === 'create') setMode('list');
  };

  const handleOpenView = (dealer: Dealer) => {
    setActiveRecord(dealer);
    setForm(dealer);
    setMode('view');
  };

  const handleStatusSync = async (newStatus: 'Active' | 'Inactive') => {
    if (!activeRecord) return;
    const isVerifying = newStatus === 'Active';

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('dealers')
        .update({
          status: newStatus,
          is_verified: isVerifying
        })
        .eq('id', activeRecord.id)
        .select()
        .single();

      if (error) throw error;

      const updated = {
        ...data,
        cheques_number: Array.isArray(data.cheques_number) ? data.cheques_number : [],
        cheques_img_urls: Array.isArray(data.cheques_img_urls) ? data.cheques_img_urls : [],
        category_access: Array.isArray(data.category_access) ? data.category_access : []
      };
      setActiveRecord(updated);
      setForm(updated);
      await fetchData(true);
      toast.success(`NODE ${newStatus.toUpperCase()} ARCHIVED`);
    } catch (e) { toast.error("SYNC REJECTED"); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!form.shop_name?.trim()) return toast.error("SHOP NAME REQUIRED");
    if (!form.mobile?.trim()) return toast.error("MOBILE REQUIRED");

    setLoading(true);
    try {
      const payload = { ...form };
      delete payload.id;
      delete payload.created_at;
      payload.shop_name = payload.shop_name.toUpperCase();
      payload.owner_name = (payload.owner_name || '').toUpperCase();

      let response;
      if (mode === 'create') {
        const code = `RCM-${Math.floor(1000 + Math.random() * 9000)}`;
        response = await supabase.from('dealers').insert([{ ...payload, dealer_code: code }]).select().single();
      } else {
        response = await supabase.from('dealers').update(payload).eq('id', form.id).select().single();
      }

      if (response.error) throw response.error;

      await fetchData(true);
      handleOpenView(response.data);

      triggerSuccess({
        title: 'PROTOCOL SYNCED',
        message: 'HUB REGISTRY UPDATED SUCCESSFULLY',
        actionLabel: 'OK',
        onAction: () => {}
      });
    } catch (e) { toast.error("SAVE FAILED"); }
    finally { setLoading(false); }
  };

  const isEditing = mode === 'edit' || mode === 'create';

  if (mode === 'list') {
    return (
      <div className="flex flex-col h-full bg-slate-50 font-black animate-in fade-in duration-300">
        <header className="p-8 bg-white shrink-0 space-y-6 shadow-sm border-b-2 border-slate-100 rounded-b-[3rem]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
                <button onClick={handleBack} className="p-4 bg-slate-50 rounded-2xl active:scale-90 transition-all text-slate-400"><ArrowLeft size={24} strokeWidth={3} /></button>
                <h2 className="text-4xl italic uppercase tracking-tighter text-black">DEALER <span className="text-blue-600">HUB</span></h2>
            </div>
            <button onClick={() => { setForm(initialForm); setMode('create'); }} className="p-5 bg-blue-600 text-white rounded-[2rem] shadow-xl active:scale-95 transition-all"><Plus size={32} strokeWidth={4} /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300" size={24} strokeWidth={3} />
            <input placeholder="SEARCH NETWORK NODES..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 h-20 bg-slate-50 border-none rounded-[2.2rem] font-black uppercase text-xs tracking-widest shadow-inner outline-none text-black italic" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar pb-32">
          {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={42} /></div>
          ) : (
            dealers.filter(d => d.shop_name.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
              <button key={d.id} onClick={() => handleOpenView(d)} className="w-full bg-white p-6 rounded-[3rem] border-2 border-white flex items-center justify-between active:scale-[0.98] transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-6 truncate">
                  <div className="relative">
                    <img src={d.profile_img || `https://ui-avatars.com/api/?name=${d.shop_name}&background=2563EB&color=fff&bold=true`} className="w-16 h-16 rounded-[1.5rem] object-cover bg-slate-100 shadow-sm border-2 border-white"/>
                    {d.payment_block && <div className="absolute -top-1 -right-1 w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg animate-pulse"><Lock size={12} strokeWidth={4}/></div>}
                  </div>
                  <div className="truncate text-left">
                    <div className="flex items-center gap-2">
                       <h3 className="font-black text-base uppercase italic text-slate-900 leading-none truncate">{d.shop_name}</h3>
                       {d.is_verified && <BadgeCheck size={18} className="text-blue-600 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">#{d.dealer_code}</p>
                       <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase italic ${d.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                         {d.status?.toUpperCase()}
                       </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={22} className="text-slate-200" strokeWidth={3} />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[1000] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-black">
      <header className="px-8 py-6 bg-white border-b-2 border-slate-50 flex justify-between items-center sticky top-0 z-[1100] shrink-0 shadow-sm">
         <div className="flex items-center gap-5">
            <button onClick={handleBack} className="p-3 text-slate-400 bg-slate-50 rounded-2xl active:scale-90 transition-all"><ArrowLeft size={28} strokeWidth={3}/></button>
            <div className="truncate max-w-[220px]">
              <h2 className="text-lg font-black uppercase italic text-black leading-none truncate">{mode === 'create' ? 'NEW HUB REGISTRY' : form.shop_name}</h2>
              <p className="text-[10px] text-blue-600 font-black uppercase mt-1.5 italic tracking-[0.2em]">{form.dealer_code || 'INITIALIZING...'}</p>
            </div>
         </div>
         <div className="flex gap-3">
            {!isEditing ? (
              <button onClick={() => setMode('edit')} className="p-4 bg-blue-600 text-white rounded-2xl shadow-xl active:scale-90 transition-all"><Edit3 size={24}/></button>
            ) : (
              <button onClick={handleBack} className="p-4 bg-slate-50 text-slate-400 rounded-2xl active:scale-90 transition-all"><X size={24} strokeWidth={4}/></button>
            )}
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 pb-48 no-scrollbar bg-slate-50/50">

        {/* BIG STATUS CARDS */}
        {!isEditing && (
          <div className="bg-white p-8 rounded-[3.5rem] border-4 border-white shadow-2xl space-y-8 animate-in zoom-in duration-500">
             <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase italic text-slate-400 tracking-[0.3em] ml-2">NETWORK NODE AUTHORIZATION</h3>
                <div className={`px-5 py-2 rounded-full font-black uppercase italic text-[10px] border-2 ${form.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                   {form.status?.toUpperCase() || 'OFFLINE'}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-5">
                <button
                  onClick={() => handleStatusSync('Active')}
                  className={`flex flex-col items-center justify-center py-10 rounded-[2.5rem] border-4 transition-all active:scale-95 space-y-4 ${form.status === 'Active' ? 'bg-emerald-600 border-emerald-700 text-white shadow-emerald-200 shadow-2xl' : 'bg-slate-50 border-white text-slate-300'}`}
                >
                   <UserCheck size={48} strokeWidth={3}/>
                   <span className="text-xs font-black uppercase italic tracking-widest">ACTIVE + VERIFIED</span>
                </button>
                <button
                  onClick={() => handleStatusSync('Inactive')}
                  className={`flex flex-col items-center justify-center py-10 rounded-[2.5rem] border-4 transition-all active:scale-95 space-y-4 ${form.status === 'Inactive' ? 'bg-red-600 border-red-700 text-white shadow-red-200 shadow-2xl' : 'bg-slate-50 border-white text-slate-300'}`}
                >
                   <Ban size={48} strokeWidth={3}/>
                   <span className="text-xs font-black uppercase italic tracking-widest">INACTIVE</span>
                </button>
             </div>
          </div>
        )}

        {/* FINANCIAL HOLD BOX */}
        <div className={`p-8 rounded-[3.5rem] border-4 transition-all duration-700 shadow-2xl relative overflow-hidden flex items-center justify-between ${form.payment_block ? 'bg-red-600 border-red-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white'}`}>
            <div className="relative z-10 flex items-center gap-6">
                <div className="w-20 h-20 rounded-[1.8rem] bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/30 shadow-inner">
                   {form.payment_block ? <Lock size={40} strokeWidth={3}/> : <Unlock size={40} strokeWidth={3}/>}
                </div>
                <div>
                   <h3 className="text-2xl font-black italic uppercase leading-none tracking-tighter">{form.payment_block ? 'FINANCIAL HOLD' : 'HUB CLEARANCE OK'}</h3>
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80 mt-2 italic">{form.payment_block ? 'STOCK ACCESS DISABLED' : 'AUTHORIZED FOR DISPATCH'}</p>
                </div>
            </div>
            {isEditing && (
               <button onClick={() => setForm({...form, payment_block: !form.payment_block})} className="relative z-10 px-10 py-5 bg-white text-black rounded-3xl text-[10px] font-black uppercase italic shadow-2xl active:scale-95 transition-all tracking-widest">
                   {form.payment_block ? 'RELEASE' : 'EXECUTE'}
               </button>
            )}
            <div className="absolute top-[-40%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-[80px]"></div>
        </div>

        {/* HUB PROFILE SECTION */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-4 border-white space-y-10">
            <div className="flex flex-col items-center gap-10">
                <div className="relative group">
                    <img
                      src={form.profile_img || `https://ui-avatars.com/api/?name=${form.shop_name || 'NA'}&background=2563EB&color=fff&bold=true`}
                      onClick={() => form.profile_img && setPreviewImageUrl(form.profile_img)}
                      className={`w-40 h-40 rounded-[3.5rem] object-cover bg-slate-50 border-8 border-slate-50 shadow-2xl transition-transform active:scale-95 ${form.profile_img ? 'cursor-pointer' : ''}`}
                    />
                    {isEditing && (
                        <label className="absolute -bottom-4 -right-4 p-5 bg-blue-600 text-white rounded-[1.5rem] shadow-2xl cursor-pointer active:scale-90 border-4 border-white transition-all"><Camera size={28} strokeWidth={3}/><input type="file" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0]; if(!file) return; setUploading(true);
                            try {
                              const path = `dealers/p-${Date.now()}.png`;
                              await supabase.storage.from('products').upload(path, file);
                              const { data } = supabase.storage.from('products').getPublicUrl(path);
                              setForm({...form, profile_img: data.publicUrl});
                              toast.success("PROFILE UPDATED");
                            } catch(err) { toast.error("UPLOAD FAIL"); } finally { setUploading(false); }
                        }} /></label>
                    )}
                </div>

                {isEditing ? (
                  <div className="w-full space-y-6">
                      <ModernInput label="Trading Label" value={form.shop_name} onChange={(e: any) => setForm({...form, shop_name: e.target.value})} placeholder="SHOP NAME" icon={Building2} />
                      <ModernInput label="Hub Proprietor" value={form.owner_name} onChange={(e: any) => setForm({...form, owner_name: e.target.value})} placeholder="OWNER NAME" icon={User} />
                      <div className="grid grid-cols-2 gap-6">
                          <ModernInput label="Mobile Access" value={form.mobile} onChange={(e: any) => setForm({...form, mobile: e.target.value})} placeholder="MOBILE" icon={Smartphone} type="tel" />
                          <ModernInput label="Region Zip" value={form.pincode} onChange={(e: any) => setForm({...form, pincode: e.target.value})} placeholder="PINCODE" icon={Hash} />
                      </div>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-white shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Trading Label</p>
                        <p className="text-sm font-black text-slate-900 uppercase italic truncate">{form.shop_name}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-white shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Proprietor</p>
                        <p className="text-sm font-black text-slate-900 uppercase italic truncate">{form.owner_name}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-white shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Mobile</p>
                        <p className="text-sm font-black text-slate-900 uppercase italic">{form.mobile}</p>
                      </div>
                      <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-white shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Hub Code</p>
                        <p className="text-sm font-black text-blue-600 uppercase italic">{form.dealer_code}</p>
                      </div>
                  </div>
                )}
            </div>
            {!isEditing ? (
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 flex items-start gap-4">
                <MapPin className="text-blue-600 shrink-0 mt-1" size={24} strokeWidth={3}/>
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic mb-2">Registered Site Address</p>
                   <p className="text-xs font-black text-slate-700 uppercase leading-relaxed italic">{form.address || 'NO ADDRESS LOGGED IN REGISTRY'}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-3 italic">Registry Address</label>
                <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="FULL SITE ADDRESS..." rows={3} className="w-full p-8 rounded-[2.5rem] bg-slate-50 border-none font-black text-xs uppercase resize-none shadow-inner italic outline-none focus:ring-8 focus:ring-blue-50/50 transition-all" />
              </div>
            )}
        </div>

        {/* MULTI-CHEQUE SECURITY REGISTRY */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-4 border-white space-y-8 font-black">
            <div className="flex items-center justify-between border-b-2 border-slate-50 pb-6">
                <h3 className="text-[11px] font-black uppercase text-slate-900 italic tracking-[0.3em] flex items-center gap-3"><ShieldCheck size={20} className="text-blue-600" strokeWidth={3}/> SECURITY REGISTRY</h3>
                {isEditing && (
                   <button onClick={() => {
                     const num = prompt("ENTER CHEQUE NUMBER:");
                     if(num) setForm({...form, cheques_number: [...(form.cheques_number||[]), num.toUpperCase()]});
                   }} className="text-[9px] bg-blue-600 text-white px-6 py-3 rounded-full font-black uppercase italic shadow-lg active:scale-90 transition-all">+ ADD LOG</button>
                )}
            </div>

            <div className="flex flex-wrap gap-3">
               {(form.cheques_number || []).map((num: string, idx: number) => (
                 <div key={idx} className="flex items-center gap-4 px-5 py-3 bg-slate-900 text-white rounded-2xl font-black italic text-[11px] shadow-xl animate-in zoom-in duration-300">
                    <Hash size={14} className="text-blue-600"/>
                    <span>{num}</span>
                    {isEditing && <button onClick={() => setForm({...form, cheques_number: form.cheques_number.filter((_:any, i:number)=>i!==idx)})} className="text-red-500 ml-2 bg-white/10 p-1 rounded-lg"><X size={14} strokeWidth={4}/></button>}
                 </div>
               ))}
               {(!form.cheques_number || form.cheques_number.length === 0) && <p className="text-[10px] text-slate-300 italic p-10 border-4 border-dashed border-slate-50 w-full rounded-[2.5rem] text-center uppercase tracking-widest font-black">Registry Null</p>}
            </div>

            <div className="grid grid-cols-2 gap-5 pt-4">
               {(form.cheques_img_urls || []).map((url: string, idx: number) => (
                 <div key={idx} className="relative aspect-video bg-slate-50 rounded-[2.5rem] border-4 border-white overflow-hidden shadow-2xl group ring-2 ring-slate-100">
                    <img
                      src={url}
                      onClick={() => setPreviewImageUrl(url)}
                      className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                        {isEditing && (
                          <button onClick={(e) => { e.stopPropagation(); setForm({...form, cheques_img_urls: form.cheques_img_urls.filter((u:string)=>u!==url)}); }} className="p-2 bg-red-600 text-white rounded-xl shadow-2xl active:scale-75 transition-all"><Trash2 size={16} strokeWidth={3}/></button>
                        )}
                        <button className="p-2 bg-white/80 backdrop-blur-sm text-blue-600 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={16}/></button>
                    </div>
                 </div>
               ))}
               {isEditing && (
                 <label className="aspect-video border-4 border-dashed border-blue-200 rounded-[2.5rem] flex flex-col items-center justify-center text-blue-400 bg-blue-50/50 cursor-pointer active:scale-95 transition-all shadow-inner">
                    <Camera size={42} strokeWidth={2}/>
                    <span className="text-[10px] font-black mt-3 uppercase tracking-widest italic">UPLOAD ARTIFACT</span>
                    <input type="file" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if(!file) return; setUploading(true);
                      try {
                        const path = `dealers/ch-${Date.now()}.png`;
                        await supabase.storage.from('products').upload(path, file);
                        const { data } = supabase.storage.from('products').getPublicUrl(path);
                        setForm({...form, cheques_img_urls: [...(form.cheques_img_urls||[]), data.publicUrl]});
                        toast.success("ARTIFACT ARCHIVED");
                      } catch(err) { toast.error("FAIL"); } finally { setUploading(false); }
                    }} />
                 </label>
               )}
            </div>
            {uploading && <div className="flex items-center justify-center gap-4 text-[10px] text-blue-600 animate-pulse italic font-black uppercase"><Loader2 className="animate-spin" size={20}/> TRANSMITTING ARTIFACTS...</div>}
        </div>

        {/* ACCESS MATRIX SECTION */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl border-4 border-white space-y-6">
            <h3 className="text-[11px] font-black uppercase text-slate-900 italic tracking-[0.3em] flex items-center gap-3"><Tag size={20} className="text-blue-600" strokeWidth={3}/> ACCESS MATRIX</h3>
            <div className="flex flex-wrap gap-3">
               {categories.map(c => (
                 <button key={c.id} disabled={!isEditing} onClick={() => {
                    const current = form.category_access || [];
                    const next = current.includes(c.id) ? current.filter((id:any)=>id!==c.id) : [...current, c.id];
                    setForm({...form, category_access: next});
                 }} className={`px-7 py-4 rounded-[1.8rem] text-[10px] font-black uppercase italic border-2 transition-all ${form.category_access?.includes(c.id) ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                    {c.name}
                 </button>
               ))}
            </div>
        </div>

      </div>

      {/* FIXED FOOTER BAR */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t-4 border-slate-50 z-[1200] rounded-t-[4rem] shadow-[0_-30px_60px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-300">
            <button onClick={handleSave} disabled={loading} className="w-full h-24 bg-blue-600 text-white rounded-[2.5rem] font-black italic uppercase text-sm tracking-[0.4em] flex items-center justify-center gap-5 active:scale-95 transition-all shadow-blue-200 shadow-2xl">
                {loading ? <Loader2 className="animate-spin" size={32}/> : <><CheckCircle size={32} strokeWidth={4}/> AUTHORIZE HUB SYNC</>}
            </button>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black/95 z-[3000] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-md"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            className="absolute top-10 right-10 text-white/50 hover:text-white transition-colors p-4"
            onClick={() => setPreviewImageUrl(null)}
          >
            <X size={48} strokeWidth={3} />
          </button>

          <div className="relative max-w-full max-h-full">
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] rounded-[3rem] shadow-2xl animate-in zoom-in duration-500 border-8 border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dealers;
