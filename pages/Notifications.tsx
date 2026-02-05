
import React, { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, Search, X, Users, User, BellRing, History, ShieldAlert, Trash2, Edit2 } from 'lucide-react';
import { supabase } from '../supabase';
import { PermissionHandler } from '../PermissionHandler';
import toast from 'react-hot-toast';

const Notifications: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'dealer'>('all');
  const [selectedDealerId, setSelectedDealerId] = useState('');
  const [form, setForm] = useState({ title: '', message: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dealerSearch, setDealerSearch] = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('broadcasts')
        .select(`
          id, 
          title, 
          message, 
          target_type, 
          target_id, 
          created_at,
          dealer:target_id(shop_name, dealer_code)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (e: any) {
      console.error("Fetch history error:", e);
      toast.error("Audit Log Sync Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    supabase.from('dealers')
      .select('id, shop_name, mobile, dealer_code')
      .eq('status', 'Active')
      .order('shop_name')
      .then(({data}) => setDealers(data || []));
  }, [fetchHistory]);

  const handleSend = async () => {
    if (!form.message.trim()) return toast.error("MESSAGE PAYLOAD REQUIRED");
    if (targetType === 'dealer' && !selectedDealerId) return toast.error("SELECT TARGET DEALER HUB");
    
    setSending(true);
    const loadingToast = toast.loading(editingId ? "UPDATING BROADCAST..." : "TRANSMITTING BROADCAST...");
    
    try {
      const payload = { 
        title: (form.title || "SYSTEM ALERT").toUpperCase(), 
        message: form.message.toUpperCase(),
        target_type: targetType,
        target_id: targetType === 'dealer' ? selectedDealerId : null 
      };

      if (editingId) {
        const { error } = await supabase.from('broadcasts').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('broadcasts').insert([payload]);
        if (error) throw error;
      }
      
      if (targetType === 'dealer') {
        const dealer = dealers.find(d => d.id === selectedDealerId);
        if (dealer) {
          const waMsg = `*${payload.title}*\n\n${payload.message}\n\n— RCM Distribution Admin`;
          PermissionHandler.openWhatsApp(dealer.mobile, waMsg);
        }
      }

      setForm({ title: '', message: '' });
      setSelectedDealerId('');
      setEditingId(null);
      toast.dismiss(loadingToast);
      toast.success(editingId ? "BROADCAST UPDATED" : (targetType === 'all' ? "GLOBAL BROADCAST AUTHORIZED" : "NODE DISPATCH SUCCESSFUL"));
      fetchHistory();
    } catch (e: any) { 
      toast.dismiss(loadingToast);
      toast.error(`PROTOCOL FAILED: ${e.message}`); 
    } finally { 
      setSending(false); 
    }
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setForm({ title: item.title, message: item.message });
    setTargetType(item.target_type);
    setSelectedDealerId(item.target_id || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLog = async (id: string) => {
    if(!confirm("PURGE THIS LOG PERMANENTLY?")) return;
    try {
      const { error } = await supabase.from('broadcasts').delete().eq('id', id);
      if (error) throw error;
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success("LOG PURGED");
    } catch (e) {
      toast.error("DELETE FAILED");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-32 px-5 pt-4 font-black text-left bg-white min-h-full">
      {/* Broadcast Control Module */}
      <div className="bg-white p-8 rounded-[3rem] border-2 border-blue-600 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                 <BellRing size={20} strokeWidth={3}/>
              </div>
              <h3 className="text-sm font-black uppercase text-gray-900 italic tracking-widest">
                {editingId ? 'Edit Broadcast' : 'Broadcast Command'}
              </h3>
           </div>
           {editingId && (
             <button
               onClick={() => {
                 setEditingId(null);
                 setForm({ title: '', message: '' });
                 setSelectedDealerId('');
               }}
               className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
             >
                <X size={20}/>
             </button>
           )}
        </div>
        
        <div className="space-y-4">
           <input 
             value={form.title} 
             onChange={e => setForm({...form, title: e.target.value})} 
             placeholder="PROTOCOL TITLE (E.G. NEW ARRIVALS)" 
             className="w-full p-5 bg-slate-50 border-transparent rounded-2xl font-black italic uppercase text-xs focus:ring-2 focus:ring-blue-600/20 leading-normal" 
           />
           <textarea 
             rows={4} 
             value={form.message} 
             onChange={e => setForm({...form, message: e.target.value})} 
             placeholder="MESSAGE CONTENT / PAYLOAD..." 
             className="w-full bg-slate-50 border-transparent p-5 rounded-2xl font-black italic uppercase text-xs resize-none focus:ring-2 focus:ring-blue-600/20 leading-relaxed" 
           />
        </div>
        
        <div className="space-y-3 pt-2">
           <p className="text-[9px] font-black uppercase text-gray-400 italic ml-2">Targeting Scope</p>
           <div className="flex gap-2">
              <button 
                onClick={() => setTargetType('all')} 
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 ${targetType === 'all' ? 'bg-blue-600 text-white shadow-lg active:scale-95' : 'bg-slate-100 text-gray-400'}`}
              >
                 <Users size={16}/> ALL DEALERS
              </button>
              <button 
                onClick={() => setTargetType('dealer')} 
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase italic transition-all flex items-center justify-center gap-2 ${targetType === 'dealer' ? 'bg-blue-600 text-white shadow-lg active:scale-95' : 'bg-slate-100 text-gray-400'}`}
              >
                 <User size={16}/> SINGLE NODE
              </button>
           </div>
        </div>

        {targetType === 'dealer' && (
          <div className="animate-in slide-in-from-top duration-300 space-y-2">
             <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"/>
                <input
                  type="text"
                  placeholder="SEARCH DEALER NAME..."
                  value={dealerSearch}
                  onChange={e => setDealerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-blue-50 border-blue-200 border-2 font-black italic uppercase text-[10px] rounded-xl text-blue-900 placeholder:text-blue-300 focus:outline-none"
                />
             </div>
             <select 
               value={selectedDealerId} 
               onChange={e => setSelectedDealerId(e.target.value)} 
               className="w-full !p-4 bg-blue-50 border-blue-200 border-2 font-black italic uppercase text-xs rounded-xl text-blue-900"
             >
                <option value="">CHOOSE TARGETED HUB...</option>
                {dealers
                  .filter(d => d.shop_name.toLowerCase().includes(dealerSearch.toLowerCase()))
                  .map(d => <option key={d.id} value={d.id}>{d.shop_name}</option>)
                }
             </select>
          </div>
        )}

        <button 
          onClick={handleSend} 
          disabled={sending} 
          className="w-full bg-black text-white p-6 rounded-[2rem] font-black uppercase italic shadow-2xl flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-blue-600 group"
        >
          {sending ? <Loader2 className="animate-spin"/> : <Send size={22} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"/>} 
          {editingId ? 'UPDATE BROADCAST' : (targetType === 'all' ? 'AUTHORIZE GLOBAL DISPATCH' : 'DISPATCH TO NODE')}
        </button>
      </div>

      {/* Audit Registry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-4">
           <h4 className="text-[10px] font-black uppercase text-gray-400 italic tracking-[0.3em] flex items-center gap-2">
              <History size={14}/> Transmission Registry
           </h4>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div key={item.id} className="p-6 bg-white rounded-3xl border-2 border-slate-50 space-y-4 font-black shadow-sm group relative overflow-hidden transition-all hover:border-blue-100">
                 <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 space-y-1">
                       <h5 className="text-xs font-black text-black uppercase italic truncate">{item.title}</h5>
                       <p className="text-[8px] text-gray-300 font-black uppercase italic">{new Date(item.created_at).toLocaleString('en-GB')}</p>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-1">
                       <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase italic truncate max-w-[100px] ${item.target_type === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                         {item.target_type === 'all' ? 'GLOBAL' : (item.dealer?.shop_name || 'NODE')}
                       </span>
                       <button onClick={() => handleEdit(item)} className="p-2 text-slate-200 hover:text-blue-600 transition-colors">
                          <Edit2 size={16}/>
                       </button>
                       <button onClick={() => deleteLog(item.id)} className="p-2 text-slate-200 hover:text-red-600 transition-colors">
                          <Trash2 size={16}/>
                       </button>
                    </div>
                 </div>
                 <p className="text-[11px] font-black italic text-gray-600 uppercase leading-relaxed border-l-4 border-slate-100 pl-4 py-1">
                    {item.message}
                 </p>
                 {item.target_type === 'dealer' && item.dealer && (
                   <div className="flex items-center gap-1.5 pt-1">
                      <ShieldAlert size={10} className="text-blue-400"/>
                      <p className="text-[8px] text-blue-400 font-black uppercase italic">Target Authenticated: {item.dealer.dealer_code}</p>
                   </div>
                 )}
              </div>
            ))}
            {history.length === 0 && (
              <div className="py-20 text-center opacity-20 italic font-black text-xs uppercase tracking-widest">Audit Registry Empty</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
