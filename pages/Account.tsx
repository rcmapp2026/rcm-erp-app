
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Save, Loader2, Building2, Smartphone, 
  CreditCard, ShieldCheck, User, MapPin, Hash, Globe
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
    try {
      const { data, error } = await supabase.from('company_profile').select('*').limit(1).maybeSingle();
      if (error) throw error;
      if (data) {
        setProfile(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const toastId = toast.loading("Syncing with Global Hub...");
    try {
      // Removed alert_threshold_days to fix 'column not found' error
      const payload: any = {
        name: (profile.name || '').toUpperCase(),
        upi_id: profile.upi_id || '',
        mobile: profile.mobile || '',
        address: profile.address || ''
      };

      if (profile.id) {
        payload.id = profile.id;
      }

      const { data, error } = await supabase
        .from('company_profile')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;

      if (data) setProfile(data);
      toast.success("Identity Node Protocol Synced ✅", { id: toastId });
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error(`Sync Failed: Check Database Connectivity`, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" /></div>;

  return (
    <div className="p-6 space-y-10 animate-in fade-in duration-500 font-black text-left pb-40 bg-white min-h-full">
      <header className="space-y-1">
        <h2 className="text-3xl italic uppercase tracking-tighter text-gray-900">System <span className="text-blue-600">Profile</span></h2>
        <p className="text-[9px] uppercase text-gray-400 tracking-widest italic font-black">Central Administrative Hub</p>
      </header>

      <div className="space-y-8">
        <div className="space-y-1">
           <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1 tracking-widest">Brand Name</label>
           <div className="flex items-center gap-4 py-3 border-b-2 border-slate-100 focus-within:border-blue-600 transition-all">
              <Building2 size={20} className="text-blue-600" />
              <input
                value={profile?.name || ''}
                placeholder="ENTER BRAND NAME"
                className="flex-1 bg-transparent border-none outline-none font-black uppercase italic text-base text-black placeholder:text-slate-200"
                onChange={e => setProfile(p => p ? {...p, name: e.target.value} : null)}
              />
           </div>
        </div>

        <div className="space-y-1">
           <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1 tracking-widest">Support Contact</label>
           <div className="flex items-center gap-4 py-3 border-b-2 border-slate-100 focus-within:border-blue-600 transition-all">
              <Smartphone size={20} className="text-blue-600" />
              <input
                value={profile?.mobile || ''}
                placeholder="ENTER MOBILE"
                className="flex-1 bg-transparent border-none outline-none font-black italic text-base text-black placeholder:text-slate-200"
                onChange={e => setProfile(p => p ? {...p, mobile: e.target.value} : null)}
              />
           </div>
        </div>

        <div className="space-y-1">
           <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1 tracking-widest">Payment UPI ID</label>
           <div className="flex items-center gap-4 py-3 border-b-2 border-slate-100 focus-within:border-blue-600 transition-all">
              <CreditCard size={20} className="text-blue-600" />
              <input
                value={profile?.upi_id || ''}
                placeholder="UPI@BANK"
                className="flex-1 bg-transparent border-none outline-none font-black italic text-base text-black placeholder:text-slate-200"
                onChange={e => setProfile(p => p ? {...p, upi_id: e.target.value} : null)}
              />
           </div>
        </div>

        <div className="space-y-1">
           <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1 tracking-widest">Office Address</label>
           <div className="flex items-start gap-4 py-3 border-b-2 border-slate-100 focus-within:border-blue-600 transition-all">
              <MapPin size={20} className="text-blue-600 mt-1" />
              <textarea
                rows={2}
                value={profile?.address || ''}
                placeholder="FULL OFFICE ADDRESS"
                className="flex-1 bg-transparent border-none outline-none font-black italic text-base text-black resize-none placeholder:text-slate-200 uppercase"
                onChange={e => setProfile(p => p ? {...p, address: e.target.value} : null)}
              />
           </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-6 bg-black text-white rounded-2xl font-black uppercase italic tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all"
      >
        {saving ? <Loader2 className="animate-spin" /> : <ShieldCheck size={24}/>}
        AUTHORIZE GLOBAL SYNC
      </button>
    </div>
  );
};

export default Account;
