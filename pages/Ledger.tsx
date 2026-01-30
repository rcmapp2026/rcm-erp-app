
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import {
  Search, Loader2, MessageCircle, ArrowLeft, X,
  BellRing, Save, CheckCircle2, Palette, RefreshCcw, Send,
  Image as ImageIcon, Trash2, Plus, Camera, FileText, Calendar, Maximize2, Info, Edit3, Trash
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PermissionHandler } from '../PermissionHandler';
import { useSuccess } from '../App';
import { ImageGenerator } from '../services/ImageGenerator';

const Ledger: React.FC = () => {
  const [dealers, setDealers] = useState<any[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<any | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingTx, setViewingTx] = useState<any | null>(null);
  const [txType, setTxType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [sentLog, setSentLog] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const initialTxForm = {
    amount: '',
    narration: '',
    date: new Date().toISOString().split('T')[0],
    images: [] as string[]
  };
  const [txForm, setTxForm] = useState<any>(initialTxForm);
  const [profile, setProfile] = useState<any>(null);
  const { triggerSuccess } = useSuccess();

  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [cardPreview, setCardPreview] = useState<string | null>(null);
  const [designerMode, setDesignerMode] = useState<'Standard' | 'Urgent'>('Standard');
  const [isSpoolingCard, setIsSpoolingCard] = useState(false);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [dData, lData, pData] = await Promise.all([
        supabase.from('dealers').select('*').order('shop_name'),
        supabase.from('ledger').select('*').order('created_at', { ascending: false }),
        supabase.from('company_profile').select('*').limit(1).maybeSingle()
      ]);
      setProfile(pData.data);
      
      const balances: Record<string, number> = {};
      const latestUpdate: Record<string, string> = {};
      
      lData.data?.forEach(l => {
        if (!balances[l.dealer_id]) {
          balances[l.dealer_id] = 0;
          latestUpdate[l.dealer_id] = l.created_at; 
        }
        balances[l.dealer_id] += l.type === 'DEBIT' ? Number(l.amount) : -Number(l.amount);
      });

      const dealerList = (dData.data || []).map(d => ({ 
        ...d, 
        balance: balances[d.id] || 0,
        last_activity: latestUpdate[d.id] || '1970-01-01'
      }));

      dealerList.sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime());
      
      setDealers(dealerList);
    } catch (err) { toast.error("FETCH FAILED"); }
    finally { if (!isSilent) setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchTransactions = async (dealerId: string) => {
    setLoading(true);
    const { data } = await supabase.from('ledger').select('*').eq('dealer_id', dealerId).order('date', { ascending: false });
    setTransactions(data || []);
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls = [...(txForm.images || [])];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = `ledger/tx-${Date.now()}-${i}.png`;
        await supabase.storage.from('products').upload(path, file);
        const { data } = supabase.storage.from('products').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setTxForm({ ...txForm, images: urls });
      toast.success("Artifacts synced");
    } catch (e) { toast.error("Upload error"); }
    finally { setUploading(false); }
  };

  const dispatchWA = async (mode: 'Standard' | 'Urgent') => {
    if (!selectedDealer) return;
    const toastId = toast.loading("GENERATING REMINDER...");
    try {
      const amountStr = Math.abs(selectedDealer.balance).toLocaleString('en-IN');
      const shopName = selectedDealer.shop_name.toUpperCase();
      const days = 11; // As per user's template

      const generatedImageData = await ImageGenerator.generateAlertCard({
        shopName: selectedDealer.shop_name,
        amount: amountStr,
        days: days,
        mode: mode,
        profileName: profile?.name || 'RCM ERP'
      });
      
      let waText = '';
      if (mode === 'Standard') {
        waText = `🔔 *PAYMENT REMINDER* 🔔\n\nHello *${shopName}*,\n\nThis is a friendly reminder that your balance of *₹${amountStr}* is outstanding.\n\n📍*Pending Amount:* *₹${amountStr}*💸\n⏳ *Remaining Time:* *${days} Days*\n\n_Sent via RCM ERP_ 🙏`;
      } else { // Urgent
        waText = `🚨*URGENT: PAYMENT OVERDUE*🚨\n\nHello *${shopName}*,\n\nYour account has reached a *CRITICAL* state with an outstanding balance of *₹${amountStr}*.\n\n📍*Overdue Amount:* ₹${amountStr}🛑\n⚠️*Status:* *URGENT ACTION REQUIRED*\n⏳ *Deadline:* *${days} Days*\n\n_Authorized by RCM ERP_ ⚠️`;
      }

      await PermissionHandler.shareImageAndText(generatedImageData, waText, selectedDealer.mobile);
      setSentLog(prev => ({ ...prev, [`${selectedDealer.id}-${mode}`]: true }));
      toast.dismiss(toastId);
      toast.success("Reminder Sent!");
    } catch (e) { 
      toast.dismiss(toastId); 
      toast.error("Failed to send reminder."); 
      console.error(e);
    }
  };

  const handleSaveTx = async () => {
    if (!txForm.amount) return toast.error("AMOUNT REQUIRED");
    setLoading(true);
    try {
      const payload = { ...txForm, dealer_id: selectedDealer.id, type: txType, narration: (txForm.narration || '').toUpperCase() };
      delete payload.id;
      if (editingTxId) await supabase.from('ledger').update(payload).eq('id', editingTxId);
      else await supabase.from('ledger').insert([payload]);
      
      toast.success("LOGGED ✅");
      setIsTxModalOpen(false);
      setEditingTxId(null);
      setTxForm(initialTxForm);
      fetchData(true);
      fetchTransactions(selectedDealer.id);
    } catch (e) { toast.error("SYNC ERROR"); }
    finally { setLoading(false); }
  };

  const handleDeleteTx = async () => {
    if (!viewingTx) return;
    if (!confirm("DELETE RECORD?")) return;
    setLoading(true);
    try {
      await supabase.from('ledger').delete().eq('id', viewingTx.id);
      setIsViewModalOpen(false);
      fetchData(true);
      fetchTransactions(selectedDealer.id);
    } catch (e) { toast.error("FAILED"); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full w-full bg-white font-black">
      <div className="px-5 pt-4 space-y-6 shrink-0">
        <div className="flex items-center gap-3">
           <div className="w-2.5 h-10 bg-green-600"></div>
           <h2 className="text-3xl font-black italic uppercase text-black">LEDGER <span className="text-green-600">HUB</span></h2>
        </div>
        <div className="relative h-14">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black z-10" size={24} />
          <input placeholder="SEARCH DEALER..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-full !pl-14 !pr-4 border border-blue-100 rounded-xl bg-white text-blue-600 font-black uppercase outline-none" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-6 space-y-4 pb-32">
        {dealers.filter(d => (d.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
          <div key={d.id} onClick={() => { setSelectedDealer(d); fetchTransactions(d.id); }} className={`p-6 rounded-[2rem] border transition-all flex justify-between items-center ${selectedDealer?.id === d.id ? 'border-green-600 bg-white' : 'border-blue-100'}`}>
            <div className="flex-1 truncate">
              <h3 className={`text-lg font-black italic uppercase truncate ${selectedDealer?.id === d.id ? 'text-green-600' : 'text-blue-600'}`}>{d.shop_name}</h3>
              <p className="text-[10px] text-black font-black italic mt-1 uppercase opacity-60">#{d.dealer_code}</p>
            </div>
            <p className={`text-sm font-black italic ${d.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(d.balance).toLocaleString()}</p>
          </div>
        ))}
      </div>

      {selectedDealer && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col h-full w-full animate-in slide-in-from-right duration-300">
           <header className="px-6 py-6 border-b border-blue-100 flex justify-between items-center bg-white sticky top-0 shrink-0">
             <button onClick={() => setSelectedDealer(null)} className="p-2 border border-blue-100 rounded-xl"><ArrowLeft size={24} /></button>
             <h2 className="text-xl font-black uppercase text-green-600 truncate max-w-[200px]">{selectedDealer.shop_name}</h2>
             <button onClick={() => setSelectedDealer(null)}><X size={32}/></button>
           </header>

           <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-40">
              <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 text-center">
                <p className="text-[10px] uppercase font-black text-black opacity-50 italic mb-1 tracking-widest">Outstanding Balance</p>
                <h3 className={`text-4xl font-black italic tracking-tighter ${selectedDealer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{Math.abs(selectedDealer.balance).toLocaleString()}</h3>
              </div>

              <div className="flex gap-4 w-full">
                 <button onClick={() => dispatchWA('Standard')} className="flex-1 py-4 bg-white rounded-2xl border border-blue-100 text-blue-600 flex flex-col items-center gap-1">
                    <MessageCircle size={24} strokeWidth={4}/>
                    <span className="text-[8px] font-black uppercase italic">Soft Alert</span>
                 </button>
                 <button onClick={() => dispatchWA('Urgent')} className="flex-1 py-4 bg-white rounded-2xl border border-red-100 text-red-600 flex flex-col items-center gap-1">
                    <BellRing size={24} strokeWidth={4}/>
                    <span className="text-[8px] font-black uppercase italic">Urgent Alert</span>
                 </button>
                 <button onClick={() => setIsDesignerOpen(true)} className="flex-1 py-4 bg-white rounded-2xl border border-green-100 text-green-600 flex flex-col items-center gap-1">
                    <Palette size={24} strokeWidth={4}/>
                    <span className="text-[8px] font-black uppercase italic">Card Hub</span>
                 </button>
              </div>

              <div className="space-y-4">
                 <h4 className="text-xs font-black uppercase text-black italic border-b border-blue-100 pb-2">Audit History</h4>
                 {transactions.map(tx => (
                   <div key={tx.id} onClick={() => { setViewingTx(tx); setIsViewModalOpen(true); }} className="bg-white p-5 rounded-2xl border border-blue-100 flex flex-col gap-3 active:scale-[0.98]">
                      <div className="flex justify-between items-center">
                         <div className="flex-1 pr-4 min-w-0">
                            <p className="text-[12px] font-black uppercase italic truncate text-blue-600 leading-tight">{tx.narration || 'TRANSACTION'}</p>
                            <p className="text-[10px] text-black font-black mt-1 uppercase italic opacity-60">{tx.date}</p>
                         </div>
                         <p className={`text-base font-black italic whitespace-nowrap ${tx.type === 'DEBIT' ? 'text-red-600' : 'text-green-600'}`}>{tx.type === 'DEBIT' ? '-' : '+'} ₹{Number(tx.amount).toLocaleString()}</p>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t border-blue-100 rounded-t-[3rem] flex gap-4">
             <button onClick={() => { setTxType('DEBIT'); setTxForm(initialTxForm); setEditingTxId(null); setIsTxModalOpen(true); }} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black uppercase italic border-none">DEBIT (-)</button>
             <button onClick={() => { setTxType('CREDIT'); setTxForm(initialTxForm); setEditingTxId(null); setIsTxModalOpen(true); }} className="flex-1 py-5 bg-green-600 text-white rounded-2xl font-black uppercase italic border-none">CREDIT (+)</button>
           </div>
        </div>
      )}

      {/* Detail View Modal */}
      {isViewModalOpen && viewingTx && (
        <div className="fixed inset-0 bg-white z-[1200] flex flex-col h-full w-full animate-in slide-in-from-bottom duration-300">
           <header className="px-6 py-5 border-b border-blue-100 flex justify-between items-center sticky top-0 shrink-0 bg-white">
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 border border-blue-100 rounded-xl"><ArrowLeft size={24}/></button>
              <h3 className="text-xl font-black italic uppercase text-blue-600">Audit Detail</h3>
              <button onClick={() => setIsViewModalOpen(false)}><X size={32}/></button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-40">
              <div className={`p-10 rounded-[3rem] border text-center ${viewingTx.type === 'DEBIT' ? 'border-red-100 text-red-600' : 'border-green-100 text-green-600'}`}>
                 <h2 className="text-5xl font-black italic">₹{Number(viewingTx.amount).toLocaleString()}</h2>
                 <p className="text-[10px] font-black uppercase italic mt-2 opacity-50">{viewingTx.type}</p>
              </div>
              <div className="p-6 rounded-3xl border border-blue-100 space-y-8 shadow-sm bg-white">
                 <div className="border-b border-blue-50 pb-6">
                    <label className="text-[10px] font-black uppercase text-black opacity-40 block mb-3">Narration / Label</label>
                    <p className="text-lg font-black italic uppercase text-blue-600 leading-relaxed break-words">{viewingTx.narration || 'HUB TRANSACTION'}</p>
                 </div>
                 <div>
                    <label className="text-[10px] font-black uppercase text-black opacity-40 block mb-3">Execution Date</label>
                    <p className="text-sm font-black italic text-black opacity-60 uppercase">{viewingTx.date}</p>
                 </div>
              </div>
              {viewingTx.images && viewingTx.images.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                   {viewingTx.images.map((img: string, i: number) => (
                     <div key={i} onClick={() => setPreviewImage(img)} className="aspect-square bg-white rounded-3xl border border-blue-100 overflow-hidden shadow-none"><img src={img} className="w-full h-full object-cover" /></div>
                   ))}
                </div>
              )}
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-8 bg-white border-t border-blue-100 rounded-t-[3rem] flex gap-4 shadow-lg">
              <button onClick={handleDeleteTx} className="flex-1 py-6 bg-red-100 text-red-600 rounded-2xl font-black uppercase italic border-none"><Trash size={18}/></button>
              <button onClick={() => { setEditingTxId(viewingTx.id); setTxForm(viewingTx); setTxType(viewingTx.type); setIsViewModalOpen(false); setIsTxModalOpen(true); }} className="flex-[2] py-6 bg-blue-600 text-white rounded-2xl font-black uppercase italic border-none">EDIT RECORD</button>
           </div>
        </div>
      )}

      {isDesignerOpen && (
        <div className="fixed inset-0 bg-white z-[1100] flex flex-col h-full w-full">
           <header className="px-6 py-6 border-b border-blue-100 flex justify-between items-center bg-white shrink-0">
             <button onClick={() => setIsDesignerOpen(false)} className="p-2 border border-blue-100 rounded-xl"><ArrowLeft size={24}/></button>
             <h3 className="text-xl font-black italic uppercase text-green-600">Hub Designer</h3>
             <button onClick={() => setIsDesignerOpen(false)}><X size={32}/></button>
           </header>
           <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar pb-32">
             <div className="bg-white p-8 rounded-[2.5rem] border border-blue-100 space-y-4">
                <p className="text-xs font-black uppercase text-blue-600 italic">Select Template</p>
                <div className="grid grid-cols-2 gap-4">
                   <button onClick={() => setDesignerMode('Standard')} className={`py-4 rounded-xl border ${designerMode === 'Standard' ? 'bg-blue-600 text-white' : 'bg-white text-black border-blue-100'}`}>Standard</button>
                   <button onClick={() => setDesignerMode('Urgent')} className={`py-4 rounded-xl border ${designerMode === 'Urgent' ? 'bg-red-600 text-white' : 'bg-white text-black border-red-100'}`}>Urgent</button>
                </div>
                <button onClick={async () => {
                  setIsSpoolingCard(true);
                  const amountStr = Math.abs(selectedDealer.balance).toLocaleString();
                  const img = await ImageGenerator.generateAlertCard({ shopName: selectedDealer.shop_name, amount: amountStr, days: 15, mode: designerMode, profileName: profile?.name || 'RCM ERP' });
                  setCardPreview(img);
                  setIsSpoolingCard(false);
                }} disabled={isSpoolingCard} className="w-full py-5 bg-black text-white rounded-2xl font-black uppercase italic border-none flex items-center justify-center">
                  {isSpoolingCard ? <Loader2 className="animate-spin mx-auto"/> : 'GENERATE CARD'}
                </button>
             </div>
             {cardPreview && (
               <div className="space-y-4 animate-in">
                  <div className="bg-white p-4 rounded-[2.5rem] border border-blue-100 overflow-hidden shadow-none"><img src={cardPreview} className="w-full h-full object-contain rounded-2xl" /></div>
                  <button onClick={async () => {
                    if (!cardPreview) return toast.error("Generate card first!");
                    const toastId = toast.loading("Sharing...");
                    try {
                      await PermissionHandler.shareImageAndText(cardPreview, '', selectedDealer.mobile);
                      toast.dismiss(toastId);
                      toast.success("Shared to Hub!");
                    } catch(e) {
                      toast.dismiss(toastId);
                      toast.error("Sharing failed.");
                      console.error(e);
                    }
                  }} className="w-full py-6 bg-green-600 text-white rounded-[2rem] font-black uppercase italic border-none flex items-center justify-center gap-3"><Send size={24}/> SHARE TO HUB</button>
               </div>
             )}
           </div>
        </div>
      )}

      {isTxModalOpen && (
        <div className="fixed inset-0 bg-white z-[1300] flex flex-col h-full w-full">
           <header className="px-6 py-6 border-b border-blue-100 flex justify-between items-center sticky top-0 shrink-0 bg-white">
             <button onClick={() => setIsTxModalOpen(false)} className="p-2 border border-blue-100 rounded-xl"><ArrowLeft size={24}/></button>
             <h3 className="text-xl font-black italic uppercase">{txType} COMMIT</h3>
             <button onClick={() => setIsTxModalOpen(false)}><X size={32}/></button>
           </header>
           <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar pb-40">
              <div className={`p-8 rounded-[2.5rem] border ${txType === 'DEBIT' ? 'border-red-100' : 'border-green-100'} space-y-6`}>
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase italic">Amount (₹)</label><input type="number" placeholder="0.00" value={txForm.amount} onChange={e => setTxForm({...txForm, amount: e.target.value})} className="text-2xl font-black uppercase !px-4" /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase italic">Narration</label><input placeholder="REMARK" value={txForm.narration} onChange={e => setTxForm({...txForm, narration: e.target.value})} className="uppercase font-black !px-4" /></div>
                 <div className="space-y-2"><label className="text-[10px] font-black uppercase italic">Date</label><input type="date" value={txForm.date} onChange={e => setTxForm({...txForm, date: e.target.value})} className="font-black uppercase !px-4" /></div>
                 <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase italic">Artifacts</label>
                    <div className="flex flex-wrap gap-4">
                       {txForm.images?.map((img: string, i: number) => (
                         <div key={i} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-blue-100"><img src={img} className="w-full h-full object-cover" onClick={() => setPreviewImage(img)}/><button onClick={() => { const n = [...txForm.images]; n.splice(i, 1); setTxForm({...txForm, images: n}); }} className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-lg"><Trash2 size={12}/></button></div>
                       ))}
                       <label className="w-24 h-24 bg-white border border-dashed border-blue-100 rounded-2xl flex flex-col items-center justify-center cursor-pointer text-blue-600"><Camera size={24}/><input type="file" multiple className="hidden" onChange={handleImageUpload}/></label>
                    </div>
                 </div>
              </div>
              <button onClick={handleSaveTx} disabled={loading} className={`w-full py-6 rounded-[2rem] font-black uppercase italic text-white border-none ${txType === 'DEBIT' ? 'bg-red-600' : 'bg-green-600'}`}>{loading ? <Loader2 className="animate-spin" /> : 'AUTHORIZE SYNC'}</button>
           </div>
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center p-6" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-8 right-8 p-2 bg-white text-black rounded-xl"><X size={32} /></button>
          <img src={previewImage} className="max-w-full max-h-[80vh] object-contain rounded-2xl" />
        </div>
      )}
    </div>
  );
};

export default Ledger;
