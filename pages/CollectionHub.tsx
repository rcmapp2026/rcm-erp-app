
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { 
  Search, Loader2, MessageCircle, BellRing, CheckCircle2, ArrowLeft, X, Eye, User, AlertTriangle
} from 'lucide-react';
import { PermissionHandler } from '../PermissionHandler';
import toast from 'react-hot-toast';
import { ImageGenerator } from '../services/ImageGenerator';

// Helper to convert base64 to Blob
const base64toBlob = (base64Data: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};

const CollectionHub: React.FC = () => {
  const [dealers, setDealers] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sentLog, setSentLog] = useState<Record<string, boolean>>({});
  
  const [selectedDealer, setSelectedDealer] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dData, lData, pData] = await Promise.all([
        supabase.from('dealers').select('*'),
        supabase.from('ledger').select('*').order('date', { ascending: true }),
        supabase.from('company_profile').select('*').limit(1).maybeSingle()
      ]);
      setProfile(pData.data);
      const threshold = pData.data?.alert_threshold_days || 15;
      
      const results = (dData.data || []).map(dealer => {
        const logs = (lData.data || []).filter(l => l.dealer_id === dealer.id);
        let bal = 0; 
        const firstDebit = logs.find(l => l.type === 'DEBIT')?.date;
        logs.forEach(l => { 
          if (l.type === 'DEBIT') bal += Number(l.amount); 
          else bal -= Number(l.amount); 
        });
        
        let daysLeft = threshold; 
        if (bal > 0 && firstDebit) {
            const debitDate = new Date(firstDebit);
            const today = new Date();
            // Normalize dates to midnight to ensure accurate day difference
            debitDate.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);
            const timeDiff = today.getTime() - debitDate.getTime();
            const daysPassed = Math.floor(timeDiff / (1000 * 3600 * 24));
            daysLeft = Math.max(0, threshold - daysPassed);
        }

        return { ...dealer, balance: bal, daysLeft };
      }).filter(d => d.balance > 0).sort((a, b) => a.daysLeft - b.daysLeft);
      
      setDealers(results);
    } catch (e) { toast.error("Error"); } finally { setLoading(false); } 
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sendAlert = async (dealer: any, mode: 'Standard' | 'Urgent') => {
    const toastId = toast.loading("GENERATING REMINDER...");
    try {
      const amountStr = Math.abs(dealer.balance).toLocaleString('en-IN');
      const shopName = dealer.shop_name.toUpperCase();
      const days = dealer.daysLeft; 

      const generatedImageData = await ImageGenerator.generateAlertCard({
        shopName: dealer.shop_name,
        amount: amountStr,
        days: days,
        mode: mode,
        profileName: profile?.name || 'RCM ERP'
      });
      
      // Optional: Upload backup to Supabase
      try {
        const blob = base64toBlob(generatedImageData, 'image/png');
        const path = `reminders/reminder-${dealer.id}-${Date.now()}.png`;
        await supabase.storage.from('products').upload(path, blob);
      } catch (e) { console.warn("Cloud backup skipped", e); }

      let waText = '';
      if (mode === 'Standard') {
        waText = `🔔 *PAYMENT REMINDER* 🔔\n\nHello *${shopName}*,\n\nThis is a friendly reminder that your balance of *₹${amountStr}* is outstanding.\n\n📍 *Pending Amount:* *₹${amountStr}* 💸\n⏳ *Remaining Time:* *${days} Days*\n\n_Sent via RCM ERP_ 🙏`;
      } else { // Urgent
        waText = `🚨*URGENT: PAYMENT OVERDUE*🚨\n\nHello *${shopName}*,\n\nYour account has reached a *CRITICAL* state with an outstanding balance of *₹${amountStr}*.\n\n📍*Overdue Amount:* ₹${amountStr}🛑\n⚠️ *Status:* *URGENT ACTION REQUIRED*\n⏳ *Deadline:* *${days} Days*\n\n_Authorized by RCM ERP_ ⚠️`;
      }

      // FIX: Use shareImageAndText to share Image + Text together via Native Share
      await PermissionHandler.shareImageAndText(generatedImageData, waText, 'Payment Reminder');
      
      setSentLog(prev => ({ ...prev, [`${dealer.id}-${mode}`]: true }));
      toast.dismiss(toastId);
      toast.success("Ready to Share!");
    } catch (e) { 
      toast.dismiss(toastId); 
      toast.error("Failed to prepare reminder.");
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white font-black">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3"><div className="w-2.5 h-10 bg-red-600"></div><h2 className="text-3xl font-black italic uppercase text-black">COLLECTION <span className="text-red-600">HUB</span></h2></div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-red-600" size={24} />
          <input placeholder="SEARCH..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-16 pl-12 border-4 border-red-600 rounded-2xl font-black uppercase text-blue-600 outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-32">
        {loading ? <Loader2 className="animate-spin text-red-600 mx-auto" /> : dealers.filter(d => (d.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
          <div key={d.id} className="bg-white p-5 rounded-3xl border border-blue-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600"><User size={20} /></div>
                <h4 className="text-sm font-black italic uppercase text-blue-600 truncate max-w-[150px]">{d.shop_name}</h4>
              </div>
              <div className={`px-3 py-1 rounded-lg border text-xs ${d.daysLeft <= 3 ? 'text-red-600 border-red-600' : 'text-green-600 border-green-600'}`}>{d.daysLeft} Days</div>
            </div>
            <div className="flex justify-between items-end border-t border-blue-50 pt-4">
              <div><p className="text-[10px] text-black opacity-50 uppercase">Outstanding</p><p className="text-xl font-black text-red-600">₹{d.balance.toLocaleString()}</p></div>
              <div className="flex gap-2">
                 <button onClick={() => sendAlert(d, 'Standard')} className="p-3 border-2 border-green-600 rounded-xl text-green-600">{sentLog[`${d.id}-Standard`] ? <CheckCircle2 size={20}/> : <MessageCircle size={20}/>}</button>
                 <button onClick={() => sendAlert(d, 'Urgent')} className="p-3 border-2 border-red-600 rounded-xl text-red-600">{sentLog[`${d.id}-Urgent`] ? <CheckCircle2 size={20}/> : <BellRing size={20}/>}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionHub;
