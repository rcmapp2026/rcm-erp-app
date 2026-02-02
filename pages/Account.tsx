
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { 
  Save, Loader2, Building2, Smartphone, 
  CreditCard, ShieldCheck, MessageSquare, 
  RefreshCcw, Type, Palette, Layout, User, 
  Clock, AlertTriangle, Eye, Settings2, Copy, Check, Zap, Camera, ImageIcon, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CompanyProfile } from '../types';

const Account: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data } = await supabase.from('company_profile').select('*').limit(1).maybeSingle();
    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const toastId = toast.loading("Syncing with Global Hub...");
    try {
      const { error } = await supabase.from('company_profile').update({
        name: profile.name.toUpperCase(),
        upi_id: profile.upi_id,
        mobile: profile.mobile,
        address: profile.address,
        alert_threshold_days: Number(profile.alert_threshold_days) || 15
      }).eq('id', profile.id);

      if (error) throw error;

      toast.success("Identity Node Protocol Synced ✅", { id: toastId });
      fetchProfile(); // Refresh local state
    } catch (e) {
      console.error(e);
      toast.error("Global Transmission Fail", { id: toastId });
    }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-500 font-black text-left pb-32 bg-white min-h-full">
      <header className="space-y-1">
        <h2 className="text-3xl italic uppercase tracking-tighter text-gray-900">System <span className="text-blue-600">Profile</span></h2>
        <p className="text-[9px] uppercase text-gray-400 tracking-widest italic font-black">Central Administrative Hub</p>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border-2 border-blue-600 shadow-xl space-y-6">
        <h3 className="text-xs font-black uppercase text-blue-600 flex items-center gap-2 italic tracking-widest font-black"><Building2 size={16}/> Business Meta Hub</h3>
        <div className="space-y-4">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Authorized Brand Label</label>
              <input value={profile?.name || ''} className="w-full p-4 border-2 border-slate-100 rounded-xl font-black uppercase italic outline-none focus:border-blue-600 transition-all" onChange={e => setProfile(p => p ? {...p, name: e.target.value} : null)} />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Support Number</label>
                 <input value={profile?.mobile || ''} className="w-full p-4 border-2 border-slate-100 rounded-xl font-black italic outline-none focus:border-blue-600 transition-all" onChange={e => setProfile(p => p ? {...p, mobile: e.target.value} : null)} />
              </div>
              <div className="space-y-1">
                 <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Alert Threshold (Days)</label>
                 <input type="number" value={profile?.alert_threshold_days || ''} className="w-full p-4 border-2 border-slate-100 rounded-xl font-black italic outline-none focus:border-blue-600 transition-all" onChange={e => setProfile(p => p ? {...p, alert_threshold_days: Number(e.target.value)} : null)} />
              </div>
           </div>

           <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">UPI Node Endpoint</label>
              <input value={profile?.upi_id || ''} className="w-full p-4 border-2 border-slate-100 rounded-xl font-black italic outline-none focus:border-blue-600 transition-all" onChange={e => setProfile(p => p ? {...p, upi_id: e.target.value} : null)} />
           </div>

           <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase italic ml-2">Logistics Hub Address</label>
              <textarea rows={3} value={profile?.address || ''} className="w-full p-4 border-2 border-slate-100 rounded-xl font-black italic outline-none focus:border-blue-600 transition-all resize-none" onChange={e => setProfile(p => p ? {...p, address: e.target.value} : null)} />
           </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full py-8 bg-black text-white rounded-[3.5rem] font-black uppercase italic tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50">
        {saving ? <Loader2 className="animate-spin" /> : <ShieldCheck size={32}/>} AUTHORIZE GLOBAL SYNC
      </button>
    </div>
  );
};

export default Account;
