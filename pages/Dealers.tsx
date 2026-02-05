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
import { PermissionHandler } from '../PermissionHandler';

// Simplified Input Component - Single Clean Box, No Nested Borders
const ModernInput = ({ label, value, onChange, placeholder, icon: Icon, disabled, type = "text" }: any) => (
  <div className="w-full space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">{label}</label>
    <div className={`flex items-center gap-3 px-5 py-4 rounded-2xl bg-slate-50 transition-all ${disabled ? 'opacity-50' : 'focus-within:bg-blue-50/50 focus-within:ring-2 focus-within:ring-blue-100'}`}>
      {Icon && <Icon size={18} className={disabled ? 'text-slate-300' : 'text-blue-600'} />}
      <input
        type={type}
        disabled={disabled}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-none outline-none text-base font-black text-black placeholder:text-slate-200 uppercase italic"
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

      // Automatic WhatsApp Notification for Activation/Verification
      if (newStatus === 'Active') {
        const cleanShop = updated.shop_name?.trim();
        const cleanCode = updated.dealer_code?.trim();
        const cleanMobile = updated.mobile?.trim();

        const waMsg = `🎊 *ACCOUNT ACTIVATED & VERIFIED* 🎊\n\nDear *${cleanShop}*,\n\nYour RCM Dealer account is now *OFFICIALLY VERIFIED*! ✅\n\n🆔 *ID:* ${cleanCode}\n🔑 *Password:* ${cleanMobile}\n\nYou can now login and access the app. 🚀🤝\n\n— *RCM ERP Admin*`;
        PermissionHandler.openWhatsApp(updated.mobile, waMsg);
      }

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
      payload.shop_name = payload.shop_name.toUpperCase().trim();
      payload.owner_name = (payload.owner_name || '').toUpperCase().trim();
      payload.city = (payload.city || '').toUpperCase().trim();

      let response;
      if (mode === 'create') {
        const code = `RCM-${Math.floor(1000 + Math.random() * 9000)}`;
        response = await supabase.from('dealers').insert([{ ...payload, dealer_code: code }]).select().single();
      } else {
        const wasBlocked = activeRecord?.payment_block;
        const isBlocked = form.payment_block;

        response = await supabase.from('dealers').update(payload).eq('id', form.id).select().single();

        if (!response.error && response.data && wasBlocked !== isBlocked) {
          const updatedDealer = response.data;
          const cleanShop = updatedDealer.shop_name?.trim();
          let waMsg = '';

          if (isBlocked) {
            waMsg = `⚠️ *ACCOUNT ON HOLD* ⚠️\n\nDear *${cleanShop}*,\n\nYour app is *currently close* 🔒. Please *clr your dues balance* then access the app. ⏳\n\n— *RCM ERP Admin*`;
          } else {
            waMsg = `✅ *PAYMENT RELEASED* ✅\n\nGreat news! The financial hold for *${cleanShop}* has been *RELEASED* 🔓.\n\n📦 *Status:* CLEAR FOR DISPATCH\n\nThank you for your cooperation! 🚀\n\n— *RCM ERP Admin*`;
          }
          PermissionHandler.openWhatsApp(updatedDealer.mobile, waMsg);
        }
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
      <div className="flex flex-col h-full bg-white font-black animate-in fade-in duration-300">
        <header className="p-6 bg-white shrink-0 space-y-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={handleBack} className="p-3 bg-gray-50 rounded-xl active:scale-90 transition-all text-gray-400"><ArrowLeft size={20} strokeWidth={3} /></button>
                <h2 className="text-2xl italic uppercase tracking-tighter text-black">DEALER <span className="text-blue-600">HUB</span></h2>
            </div>
            <button onClick={() => { setForm(initialForm); setMode('create'); }} className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"><Plus size={24} strokeWidth={4} /></button>
          </div>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} strokeWidth={3} />
            <input placeholder="SEARCH NETWORK NODES..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 h-14 bg-gray-50 border-none rounded-2xl font-black uppercase text-[10px] tracking-widest outline-none text-black italic" />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-32">
          {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
          ) : (
            dealers.filter(d => d.shop_name.toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
              <button key={d.id} onClick={() => handleOpenView(d)} className="w-full bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between active:scale-[0.98] transition-all shadow-sm">
                <div className="flex items-center gap-4 truncate">
                  <div className="relative">
                    <img src={d.profile_img || `https://ui-avatars.com/api/?name=${d.shop_name}&background=2563EB&color=fff&bold=true`} className="w-12 h-12 rounded-xl object-cover bg-slate-100 shadow-sm border border-white"/>
                    {d.payment_block && <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center border border-white shadow-lg"><Lock size={10} strokeWidth={4}/></div>}
                  </div>
                  <div className="truncate text-left">
                    <div className="flex items-center gap-2">
                       <h3 className="font-black text-sm uppercase italic text-slate-900 leading-none truncate">{d.shop_name}</h3>
                       {d.is_verified && <BadgeCheck size={16} className="text-blue-600 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                       <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest italic">#{d.dealer_code}</p>
                       <span className={`text-[7px] px-2 py-0.5 rounded-full font-black uppercase italic ${d.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                         {d.status?.toUpperCase()}
                       </span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} className="text-slate-200" strokeWidth={3} />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-[1000] flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden font-black">
      <header className="px-6 py-4 bg-white border-b border-gray-100 flex justify-between items-center sticky top-0 z-[1100] shrink-0">
         <div className="flex items-center gap-4">
            <button onClick={handleBack} className="p-2 text-slate-400 bg-gray-50 rounded-xl active:scale-90 transition-all"><ArrowLeft size={24} strokeWidth={3}/></button>
            <div className="truncate max-w-[200px]">
              <h2 className="text-sm font-black uppercase italic text-black leading-none truncate">{mode === 'create' ? 'NEW HUB REGISTRY' : form.shop_name}</h2>
              <p className="text-[9px] text-blue-600 font-black uppercase mt-1 italic tracking-widest">{form.dealer_code || 'INITIALIZING...'}</p>
            </div>
         </div>
         <div className="flex gap-2">
            {!isEditing ? (
              <button onClick={() => setMode('edit')} className="p-3 bg-blue-600 text-white rounded-xl shadow-lg active:scale-90 transition-all"><Edit3 size={20}/></button>
            ) : (
              <button onClick={handleBack} className="p-3 bg-gray-50 text-slate-400 rounded-xl active:scale-90 transition-all"><X size={20} strokeWidth={4}/></button>
            )}
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-48 no-scrollbar bg-white">

        {/* BIG STATUS CARDS */}
        {!isEditing && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg space-y-6">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-[9px] font-black uppercase italic text-slate-400 tracking-widest">NETWORK NODE AUTHORIZATION</h3>
                <div className={`px-4 py-1.5 rounded-full font-black uppercase italic text-[8px] border ${form.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                   {form.status?.toUpperCase() || 'OFFLINE'}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleStatusSync('Active')}
                  className={`flex flex-col items-center justify-center py-8 rounded-2xl border border-gray-100 transition-all active:scale-95 space-y-3 ${form.status === 'Active' ? 'bg-emerald-600 border-emerald-700 text-white shadow-lg' : 'bg-gray-50 text-slate-300'}`}
                >
                   <UserCheck size={32} strokeWidth={3}/>
                   <span className="text-[9px] font-black uppercase italic tracking-widest">ACTIVE + VERIFIED</span>
                </button>
                <button
                  onClick={() => handleStatusSync('Inactive')}
                  className={`flex flex-col items-center justify-center py-8 rounded-2xl border border-gray-100 transition-all active:scale-95 space-y-3 ${form.status === 'Inactive' ? 'bg-red-600 border-red-700 text-white shadow-lg' : 'bg-gray-50 text-slate-300'}`}
                >
                   <Ban size={32} strokeWidth={3}/>
                   <span className="text-[9px] font-black uppercase italic tracking-widest">INACTIVE</span>
                </button>
             </div>
          </div>
        )}

        {/* FINANCIAL HOLD BOX */}
        <div className={`p-6 rounded-3xl border border-gray-100 transition-all duration-500 shadow-md relative overflow-hidden flex items-center justify-between ${form.payment_block ? 'bg-red-600 border-red-700 text-white' : 'bg-emerald-600 border-emerald-700 text-white'}`}>
            <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xl border border-white/30">
                   {form.payment_block ? <Lock size={28} strokeWidth={3}/> : <Unlock size={28} strokeWidth={3}/>}
                </div>
                <div>
                   <h3 className="text-lg font-black italic uppercase leading-none tracking-tighter">{form.payment_block ? 'FINANCIAL HOLD' : 'HUB CLEARANCE OK'}</h3>
                   <p className="text-[8px] font-black uppercase tracking-widest opacity-80 mt-1 italic">{form.payment_block ? 'STOCK ACCESS DISABLED' : 'AUTHORIZED FOR DISPATCH'}</p>
                </div>
            </div>
            {isEditing && (
               <button onClick={() => setForm({...form, payment_block: !form.payment_block})} className="relative z-10 px-6 py-3 bg-white text-black rounded-xl text-[8px] font-black uppercase italic shadow-lg active:scale-95 transition-all">
                   {form.payment_block ? 'RELEASE' : 'EXECUTE'}
               </button>
            )}
        </div>

        {/* HUB PROFILE SECTION */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
            <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                    <img
                      src={form.profile_img || `https://ui-avatars.com/api/?name=${form.shop_name || 'NA'}&background=2563EB&color=fff&bold=true`}
                      onClick={() => form.profile_img && setPreviewImageUrl(form.profile_img)}
                      className={`w-28 h-28 rounded-full object-cover bg-slate-50 border-4 border-white shadow-lg transition-transform active:scale-95 ${form.profile_img ? 'cursor-pointer' : ''}`}
                    />
                    {isEditing && (
                        <label className="absolute bottom-0 right-0 p-3 bg-blue-600 text-white rounded-full shadow-lg cursor-pointer active:scale-90 border-2 border-white"><Camera size={18} strokeWidth={3}/><input type="file" className="hidden" onChange={async (e) => {
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
                  <div className="w-full space-y-4">
                      <ModernInput label="Trading Label (Shop Name)" value={form.shop_name} onChange={(e: any) => setForm({...form, shop_name: e.target.value})} placeholder="SHOP NAME" icon={Building2} />
                      <ModernInput label="Hub Proprietor (Owner)" value={form.owner_name} onChange={(e: any) => setForm({...form, owner_name: e.target.value})} placeholder="OWNER NAME" icon={User} />
                      <ModernInput label="Mobile Access" value={form.mobile} onChange={(e: any) => setForm({...form, mobile: e.target.value})} placeholder="MOBILE NUMBER" icon={Smartphone} type="tel" />
                      <ModernInput label="City Location" value={form.city} onChange={(e: any) => setForm({...form, city: e.target.value})} placeholder="CITY" icon={Map} />
                      <ModernInput label="Region Zip (Pincode)" value={form.pincode} onChange={(e: any) => setForm({...form, pincode: e.target.value})} placeholder="PINCODE" icon={Hash} />
                      <ModernInput label="State" value={form.state} onChange={(e: any) => setForm({...form, state: e.target.value})} placeholder="STATE" icon={Globe} />

                      <div className="w-full space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic ml-1">Full Site Address</label>
                         <textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="FULL ADDRESS..." rows={3} className="w-full p-5 rounded-2xl bg-slate-50 border-none font-black text-xs uppercase resize-none italic outline-none focus:bg-blue-50/50 focus:ring-2 focus:ring-blue-100 transition-all" />
                      </div>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 gap-4">
                      <div className="p-4 border-b border-gray-50">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Trading Label</p>
                        <p className="text-[13px] font-black text-slate-900 uppercase italic truncate">{form.shop_name}</p>
                      </div>
                      <div className="p-4 border-b border-gray-50">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Proprietor</p>
                        <p className="text-[13px] font-black text-slate-900 uppercase italic truncate">{form.owner_name}</p>
                      </div>
                      <div className="p-4 border-b border-gray-50">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Mobile</p>
                        <p className="text-[13px] font-black text-slate-900 uppercase italic">{form.mobile}</p>
                      </div>
                      <div className="p-4 border-b border-gray-50">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Location</p>
                        <p className="text-[13px] font-black text-slate-900 uppercase italic truncate">{form.city || 'NA'} {form.pincode && `(${form.pincode})`}</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl flex items-start gap-3">
                         <MapPin className="text-blue-600 shrink-0 mt-0.5" size={18} strokeWidth={3}/>
                         <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Registered Site Address</p>
                            <p className="text-[10px] font-black text-slate-700 uppercase leading-relaxed italic">{form.address || 'NO ADDRESS LOGGED'}</p>
                         </div>
                      </div>
                  </div>
                )}
            </div>
        </div>

        {/* SECURITY REGISTRY */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h3 className="text-[10px] font-black uppercase text-slate-900 italic tracking-widest flex items-center gap-2"><ShieldCheck size={18} className="text-blue-600" strokeWidth={3}/> SECURITY REGISTRY</h3>
                {isEditing && (
                   <button onClick={() => {
                     const num = prompt("ENTER CHEQUE NUMBER:");
                     if(num) setForm({...form, cheques_number: [...(form.cheques_number||[]), num.toUpperCase()]});
                   }} className="text-[8px] bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase italic shadow-md active:scale-90 transition-all">+ ADD LOG</button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
               {(form.cheques_number || []).map((num: string, idx: number) => (
                 <div key={idx} className="flex items-center gap-3 px-4 py-2 bg-slate-900 text-white rounded-xl font-black italic text-[9px] shadow-md animate-in zoom-in duration-300">
                    <Hash size={12} className="text-blue-600"/>
                    <span>{num}</span>
                    {isEditing && <button onClick={() => setForm({...form, cheques_number: form.cheques_number.filter((_:any, i:number)=>i!==idx)})} className="text-red-500 ml-1 bg-white/10 p-0.5 rounded-md"><X size={12} strokeWidth={4}/></button>}
                 </div>
               ))}
               {(!form.cheques_number || form.cheques_number.length === 0) && <p className="text-[9px] text-slate-300 italic p-6 border-2 border-dashed border-gray-50 w-full rounded-2xl text-center uppercase tracking-widest font-black">Registry Null</p>}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
               {(form.cheques_img_urls || []).map((url: string, idx: number) => (
                 <div key={idx} className="relative aspect-video bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden shadow-sm group">
                    <img
                      src={url}
                      onClick={() => setPreviewImageUrl(url)}
                      className="w-full h-full object-cover cursor-pointer transition-transform hover:scale-105 active:scale-95"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                        {isEditing && (
                          <button onClick={(e) => { e.stopPropagation(); setForm({...form, cheques_img_urls: form.cheques_img_urls.filter((u:string)=>u!==url)}); }} className="p-1.5 bg-red-600 text-white rounded-lg shadow-lg active:scale-75 transition-all"><Trash2 size={12} strokeWidth={3}/></button>
                        )}
                        <button className="p-1.5 bg-white/80 backdrop-blur-sm text-blue-600 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><ZoomIn size={12}/></button>
                    </div>
                 </div>
               ))}
               {isEditing && (
                 <label className="aspect-video border border-dashed border-blue-200 rounded-2xl flex flex-col items-center justify-center text-blue-400 bg-blue-50/30 cursor-pointer active:scale-95 transition-all shadow-inner">
                    <Camera size={28} strokeWidth={2}/>
                    <span className="text-[8px] font-black mt-2 uppercase tracking-widest italic">UPLOAD ARTIFACT</span>
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
        </div>

        {/* ACCESS MATRIX SECTION */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase text-slate-900 italic tracking-widest flex items-center gap-2"><Tag size={18} className="text-blue-600" strokeWidth={3}/> ACCESS MATRIX</h3>
                {isEditing && (
                   <button onClick={() => {
                      const allIds = categories.map(c => c.id);
                      setForm({...form, category_access: allIds});
                      toast.success("FULL ACCESS GRANTED");
                   }} className="text-[10px] font-black uppercase italic text-blue-600 px-4 py-1.5 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">Grant All Access</button>
                )}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
               {categories.map(c => (
                 <button key={c.id} disabled={!isEditing} onClick={() => {
                    const current = form.category_access || [];
                    const next = current.includes(c.id) ? current.filter((id:any)=>id!==c.id) : [...current, id];
                    setForm({...form, category_access: next});
                 }} className={`px-5 py-3 rounded-xl text-[8px] font-black uppercase italic border border-gray-100 transition-all ${form.category_access?.includes(c.id) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-gray-50 text-slate-400'}`}>
                    {c.name}
                 </button>
               ))}
            </div>
        </div>

      </div>

      {/* FIXED FOOTER BAR */}
      {isEditing && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 z-[1200] rounded-t-[3rem] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <button onClick={handleSave} disabled={loading} className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black italic uppercase text-xs tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg">
                {loading ? <Loader2 className="animate-spin" size={24}/> : <><CheckCircle size={24} strokeWidth={4}/> AUTHORIZE HUB SYNC</>}
            </button>
        </div>
      )}

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[3000] flex items-center justify-center p-6 animate-in fade-in duration-300 backdrop-blur-sm"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-3"
            onClick={() => setPreviewImageUrl(null)}
          >
            <X size={32} strokeWidth={3} />
          </button>

          <div className="relative max-w-full max-h-full">
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] rounded-3xl shadow-2xl animate-in zoom-in duration-300 border-4 border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dealers;
