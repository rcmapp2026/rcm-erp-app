import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import {
  Loader2, Search, FileText, Award, ListOrdered,
  Package, ArrowLeft, ChevronRight, X, MessageSquare, Download, CheckSquare, Square, Mail, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PermissionHandler } from '../PermissionHandler';
import { CompanyProfile, Dealer, Order, LedgerEntry, Product, Category, Company } from '../types';
import { PdfTemplates, formatMoney } from '../services/pdfService';
import { sharingService } from '../services/sharingService';

declare global {
  interface Window {
    html2pdf: any;
  }
}

const Reports: React.FC = () => {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(false);
  const [spooling, setSpooling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [fromDate, setFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);
  const [assetType, setAssetType] = useState<'Hardware' | 'RCM'>('Hardware');
  const [filterMode, setFilterMode] = useState<'All' | 'Category' | 'Company' | 'Selective'>('All');
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set());

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [readyDoc, setReadyDoc] = useState<{ name: string, html: string, dealer: any, type: string } | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const { data: dData } = await supabase.from('dealers').select('*').order('shop_name');
      const { data: cProfile } = await supabase.from('company_profile').select('*').single();
      const { data: catData } = await supabase.from('categories').select('*');
      const { data: compData } = await supabase.from('companies').select('*');
      const { data: ordData } = await supabase.from('orders').select('*, dealers(*)').order('created_at', { ascending: false });

      setDealers(dData || []);
      setProfile(cProfile);
      setCategories(catData || []);
      setCompanies(compData || []);
      setOrders(ordData || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (activeReport === 'Assets') {
      setLoading(true);
      supabase.from('products').select(`*, category:category_id(name), company:company_id(name), product_variants(*)`).eq('product_type', assetType).order('name')
        .then(({data}) => {
            setProducts((data || []).map((p: any) => ({ ...p, category_name: p.category?.name, company_name: p.company?.name })));
            setLoading(false);
        });
    }
  }, [activeReport, assetType]);

  const updateScale = useCallback(() => {
    if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 40;
        setPreviewScale(Math.min(1, availableWidth / 794));
    }
  }, [readyDoc]);

  useEffect(() => {
    if (readyDoc) {
        window.addEventListener('resize', updateScale);
        updateScale();
        return () => window.removeEventListener('resize', updateScale);
    }
  }, [readyDoc, updateScale]);

  const handleSpool = async (type: string, target: any) => {
    if (!profile) return;
    setSpooling(true);
    let html = '';
    let fileName = '';

    try {
      if (type === 'Invoice') {
        const { data: items } = await supabase.from('order_items').select('*').eq('order_id', target.id);
        html = PdfTemplates.generateInvoiceHtml(target, items || [], profile);
        fileName = `ORD-${target.order_no}-${target.dealers?.shop_name}.pdf`;
      } else if (type === 'Ledger') {
        const { data: beforeLogs } = await supabase.from('ledger').select('amount, type').eq('dealer_id', target.id).lt('date', fromDate);
        let openingBal = 0;
        beforeLogs?.forEach(l => {
          if (l.type === 'DEBIT') openingBal = formatMoney(openingBal + Number(l.amount));
          else openingBal = formatMoney(openingBal - Number(l.amount));
        });
        const { data: logs = [] } = await supabase.from('ledger').select('*').eq('dealer_id', target.id).gte('date', fromDate).lte('date', toDate).order('date', { ascending: true });
        html = PdfTemplates.generateLedgerHtml(target, logs || [], openingBal, profile, fromDate, toDate);
        fileName = `LEDGER-${target.shop_name}.pdf`;
      } else if (type === 'Assets') {
        let spoolProds = products;
        if (filterMode === 'Selective') {
          spoolProds = products.filter(p => checkedProducts.has(p.id));
          if (spoolProds.length === 0) { toast.error("Please select items"); setSpooling(false); return; }
        }
        else if (filterMode === 'Category' && selectedFilterId) spoolProds = products.filter(p => p.category_id === selectedFilterId);
        else if (filterMode === 'Company' && selectedFilterId) spoolProds = products.filter(p => p.company_id === selectedFilterId);
        html = PdfTemplates.generateProductReportHtml(spoolProds, assetType);
        fileName = `ASSETS-${assetType}.pdf`;
      } else if (type === 'Certificate') {
        html = PdfTemplates.generateCertificateHtml(target);
        fileName = `CERT-${target.shop_name}.pdf`;
      }

      const finalHtml = PdfTemplates.wrapHtml(html);
      setReadyDoc({ name: fileName, html: finalHtml, dealer: target, type: type });
    } catch (e) { toast.error("Spooling Failed"); }
    finally { setSpooling(false); }
  };

  const executeExport = async (mode: 'share' | 'save' | 'email') => {
    if (!readyDoc) return;
    setSpooling(true);
    const toastId = toast.loading(`${mode === 'save' ? 'Saving' : 'Preparing'} Report...`);

    // Ensure we are at the top to avoid offset issues
    window.scrollTo(0,0);

    const workerDiv = document.createElement('div');
    Object.assign(workerDiv.style, { position: 'absolute', left: '0', top: '0', width: '210mm', backgroundColor: '#fff', zIndex: '-1', opacity: '1', pointerEvents: 'none' });
    workerDiv.innerHTML = readyDoc.html;
    document.body.appendChild(workerDiv);

    try {
      const images = Array.from(workerDiv.getElementsByTagName('img'));
      await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; img.onerror = res; })));
      await new Promise(r => setTimeout(r, 2000));

      const opt = {
        margin: [10, 10, 20, 10], // Adjusted bottom margin to 20 to prevent cutting
        filename: readyDoc.name,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true, precision: 16 }
      };

      const content = workerDiv.querySelector('#pdf-rendering-root') || workerDiv;
      const pdfEngine = window.html2pdf().from(content).set(opt);

      if (mode === 'save') {
        await pdfEngine.save();
        toast.success("Download started");
      } else {
        const pdfDataUri = await pdfEngine.output('datauristring');

        // WhatsApp Formatting: *Text* for Bold, _Text_ for Italic. Use \n\n for sections.
        let waText = `📄 *DOCUMENT SHARED*\n\n*Type:* _${readyDoc.type}_\n*File:* ${readyDoc.name}\n\nPlease find the attached report.`;

        if (readyDoc.type === 'Invoice' && readyDoc.dealer) {
          waText = `📦 *NEW INVOICE GENERATED*\n\n*Order No:* #${readyDoc.dealer.order_no}\n*Shop:* *${readyDoc.dealer.dealers?.shop_name || 'N/A'}*\n*Total:* *₹${readyDoc.dealer.final_total}*\n\n_Please check the attached PDF for details._`;
        } else if (readyDoc.type === 'Ledger' && readyDoc.dealer) {
          waText = `📒 *LEDGER STATEMENT*\n\n*Shop:* *${readyDoc.dealer.shop_name}*\n*Period:* ${fromDate} to ${toDate}\n\n_Please review the attached statement._`;
        }

        const title = mode === 'email' ? `Report: ${readyDoc.name}` : `RCM Hub: ${readyDoc.name}`;

        // Include dealer mobile if available to open their WhatsApp chat
        const dealerMobile = readyDoc.dealer?.mobile || (readyDoc.dealer?.dealers?.mobile);

        await sharingService.share({
          pdfUrl: pdfDataUri,
          fileName: readyDoc.name,
          title: title,
          text: waText,
          mobile: dealerMobile
        });
      }

      toast.dismiss(toastId);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Export Failed. Retry.");
    } finally {
      if (document.body.contains(workerDiv)) document.body.removeChild(workerDiv);
      setSpooling(false);
    }
  };

  const toggleProductCheck = (id: string) => {
    const next = new Set(checkedProducts);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedProducts(next);
  };

  return (
    <div className="flex flex-col h-full w-full bg-white font-black overflow-hidden">
      <div className="px-5 pt-4 space-y-4 shrink-0">
        <header className="space-y-1">
          <h2 className="text-3xl italic uppercase tracking-tighter text-black font-black">HD <span className="text-blue-600">Spooler</span></h2>
        </header>

        {!activeReport && (
          <div className="flex flex-col gap-4 pb-4">
            {[
              { id: 'Invoice', icon: ListOrdered, label: 'Invoice Hub', desc: 'Generate high-fidelity dealer invoices' },
              { id: 'Certificate', icon: Award, label: 'Certificate Hub', desc: 'Authorised dealership certificates' },
              { id: 'Ledger', icon: FileText, label: 'Ledger Book', desc: 'Complete financial ledger account' },
              { id: 'Assets', icon: Package, label: 'Stock Registry', desc: 'Export inventory & asset records' }
            ].map(m => (
              <button key={m.id} onClick={() => { setActiveReport(m.id); setReadyDoc(null); }} className="w-full bg-white rounded-3xl border-2 border-blue-600 flex items-center p-6 shadow-xl active:scale-95 transition-all text-left gap-5">
                 <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100">
                   <m.icon size={32} className="text-blue-600" />
                 </div>
                 <div>
                   <span className="text-xs italic uppercase tracking-widest font-black block">{m.label}</span>
                   <p className="text-[9px] text-gray-400 font-black uppercase mt-1">{m.desc}</p>
                 </div>
                 <ChevronRight className="ml-auto text-blue-600" />
              </button>
            ))}
          </div>
        )}
      </div>

      {activeReport && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in slide-in-from-right duration-300">
           <header className="px-6 py-4 border-b-2 border-blue-600 flex justify-between items-center bg-blue-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                 <button onClick={() => { setActiveReport(null); setReadyDoc(null); }} className="p-2 active:scale-90"><ArrowLeft size={24}/></button>
                 <h2 className="text-sm font-black italic uppercase tracking-tight">{activeReport} HUB</h2>
              </div>
              <button onClick={() => { setActiveReport(null); setReadyDoc(null); }}><X size={24}/></button>
           </header>

           <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32 no-scrollbar bg-slate-50">
              {activeReport === 'Invoice' && (
                <div className="space-y-3">
                  <div className="relative h-14">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 z-10" size={16}/>
                    <input placeholder="Search Order..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-full pl-12 border-2 border-blue-600 rounded-xl text-[10px] font-black uppercase text-black outline-none" />
                  </div>
                  {orders.filter(o => o.order_no?.toString().includes(searchTerm) || (o.dealers?.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(o => (
                    <button key={o.id} onClick={() => handleSpool('Invoice', o)} className="w-full p-5 bg-white border-2 border-blue-600 rounded-2xl flex justify-between items-center shadow-sm active:scale-95 transition-all text-left">
                      <div><p className="text-xs font-black uppercase text-black">Order #{o.order_no}</p><p className="text-[8px] text-gray-400 font-black uppercase">{o.dealers?.shop_name}</p></div>
                      <ChevronRight size={18} className="text-blue-600"/>
                    </button>
                  ))}
                </div>
              )}

              {activeReport === 'Ledger' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 bg-blue-50 p-4 rounded-2xl border-2 border-blue-100">
                    <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-2 text-[10px] rounded-lg border-blue-200 text-black font-black outline-none" />
                    <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-2 text-[10px] rounded-lg border-blue-200 text-black font-black outline-none" />
                  </div>
                  <div className="relative h-14">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 z-10" size={16}/>
                    <input placeholder="Search Dealer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-full pl-12 border-2 border-blue-600 rounded-xl text-[10px] font-black uppercase outline-none" />
                  </div>
                  {dealers.filter(d => (d.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
                    <button key={d.id} onClick={() => handleSpool('Ledger', d)} className="w-full p-4 bg-white border-2 border-blue-600 rounded-2xl flex justify-between items-center shadow-sm active:scale-95 transition-all text-left">
                      <span className="text-xs font-black uppercase">{d.shop_name}</span>
                      <ChevronRight size={18} className="text-blue-600"/>
                    </button>
                  ))}
                </div>
              )}

              {activeReport === 'Certificate' && (
                <div className="space-y-2">
                  <div className="relative h-14">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 z-10" size={16}/>
                    <input placeholder="Search Dealer..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-full pl-12 border-2 border-blue-600 rounded-xl text-[10px] font-black uppercase outline-none" />
                  </div>
                  {dealers.filter(d => (d.shop_name || '').toLowerCase().includes(searchTerm.toLowerCase())).map(d => (
                    <button key={d.id} onClick={() => handleSpool('Certificate', d)} className="w-full p-4 bg-white border-2 border-blue-600 rounded-2xl flex justify-between items-center mb-2 shadow-sm active:scale-95 transition-all text-left">
                      <span className="text-xs font-black uppercase">{d.shop_name}</span>
                      <ChevronRight size={18} className="text-blue-600"/>
                    </button>
                  ))}
                </div>
              )}

              {activeReport === 'Assets' && (
                <div className="space-y-6">
                  <div className="flex bg-slate-900 p-1.5 rounded-2xl border-2 border-blue-600 shadow-lg">
                    <button onClick={() => setAssetType('Hardware')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${assetType === 'Hardware' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-50'}`}>Hardware</button>
                    <button onClick={() => setAssetType('RCM')} className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase transition-all ${assetType === 'RCM' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-50'}`}>RCM Distribution</button>
                  </div>
                  <div className="space-y-4 p-5 bg-white rounded-[2rem] border-2 border-blue-100 shadow-sm">
                    <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                       <button onClick={() => { setFilterMode('All'); setSelectedFilterId(''); }} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase italic transition-all ${filterMode === 'All' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`}>All Items</button>
                       <button onClick={() => setFilterMode('Category')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase italic transition-all ${filterMode === 'Category' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`}>Category</button>
                       <button onClick={() => setFilterMode('Company')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase italic transition-all ${filterMode === 'Company' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`}>Brand</button>
                       <button onClick={() => setFilterMode('Selective')} className={`flex-1 py-3 rounded-lg text-[8px] font-black uppercase italic transition-all ${filterMode === 'Selective' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400'}`}>Selective</button>
                    </div>
                    {filterMode === 'Category' && (
                      <select value={selectedFilterId} onChange={e => setSelectedFilterId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-blue-600 rounded-xl text-[10px] font-black uppercase outline-none">
                        <option value="">Select Category</option>
                        {categories.filter(c => c.type === assetType).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    {filterMode === 'Company' && (
                      <select value={selectedFilterId} onChange={e => setSelectedFilterId(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-blue-600 rounded-xl text-[10px] font-black uppercase outline-none">
                        <option value="">Select Brand</option>
                        {companies.filter(c => c.type === assetType).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    {filterMode === 'Selective' && (
                      <div className="max-h-60 overflow-y-auto space-y-2 no-scrollbar pr-1">
                        {products.map(p => (
                          <button key={p.id} onClick={() => toggleProductCheck(p.id)} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border-2 border-slate-100 active:scale-[0.98]">
                            {checkedProducts.has(p.id) ? <CheckSquare size={18} className="text-blue-600" /> : <Square size={18} className="text-slate-300" />}
                            <div className="flex items-center gap-3 truncate">
                              <img src={p.image_url} className="w-8 h-8 rounded border object-cover" />
                              <span className="text-[10px] font-black uppercase truncate">{p.name}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleSpool('Assets', null)} className="w-full py-8 bg-black text-white rounded-[2.2rem] font-black uppercase tracking-widest text-xs shadow-2xl active:scale-95 transition-all">GENERATE STOCK MATRIX</button>
                </div>
              )}
           </div>
        </div>
      )}

      {readyDoc && (
        <div className="fixed inset-0 bg-black/80 z-[2000] flex items-end h-full w-full">
           <div className="bg-white w-full rounded-t-[3rem] p-6 space-y-4 flex flex-col max-h-[95vh] animate-in slide-in-from-bottom duration-300 font-black h-full">
              <div className="flex justify-between items-center shrink-0">
                 <div className="flex items-center gap-3">
                    <button onClick={() => setReadyDoc(null)} className="p-2 active:scale-90"><ArrowLeft size={24}/></button>
                    <h3 className="text-xl font-black italic uppercase text-black">HD <span className="text-blue-600">Preview</span></h3>
                 </div>
                 <button onClick={() => setReadyDoc(null)} className="p-2 text-gray-400 active:scale-90"><X size={32}/></button>
              </div>
              <div ref={containerRef} className="flex-1 border-4 border-blue-100 rounded-[2.5rem] overflow-hidden bg-gray-50 flex justify-center overflow-y-auto no-scrollbar">
                 <div className="origin-top py-4 flex flex-col items-center" style={{ width: '100%' }}>
                    <div id="preview-content-root" className="bg-white shadow-2xl origin-top" style={{ width: '794px', transform: `scale(${previewScale})` }} dangerouslySetInnerHTML={{ __html: readyDoc.html }}></div>
                 </div>
              </div>
              <div className="shrink-0 pt-2 pb-6">
                 <button 
                   onClick={() => executeExport('share')}
                   disabled={spooling}
                   className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] uppercase text-sm font-black flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all disabled:opacity-50"
                 >
                   {spooling ? <Loader2 className="animate-spin" size={20} /> : <MessageSquare size={20}/>}
                   SHARE ON WHATSAPP
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
