import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { 
  Users, BookOpen, Loader2, ShieldCheck, AlarmClock, TrendingUp, ChevronRight, AlertCircle
} from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, color, loading, to, badge }: any) => {
  if (loading) return <div className="rounded-2xl p-6 h-32 bg-gray-50 animate-pulse border border-gray-100" />;

  return (
    <Link to={to} className="bg-white rounded-2xl p-5 flex flex-col justify-between h-32 border border-gray-100 shadow-sm hover:border-blue-100 relative overflow-hidden transition-all active:scale-95">
      {badge > 0 && (
        <div className="absolute top-3 right-3 px-2 py-0.5 bg-red-600 text-white text-[9px] rounded-full font-black animate-pulse">
          {badge} ALERT
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center text-white shadow-sm`}>
          <Icon size={20} />
        </div>
        <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{title}</p>
      </div>
      <div className="text-2xl font-black italic text-gray-900 flex items-end justify-between">
        {value}
        <ChevronRight size={16} className="text-gray-300" />
      </div>
    </Link>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalDealers: 0,
    activeOrders: 0,
    pendingLedger: 0,
    collectionAlerts: 0
  });
  const [dueAccounts, setDueAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLiveStats = useCallback(async () => {
    try {
      const [dealers, orders, ledgerRes] = await Promise.all([
        supabase.from('dealers').select('id, shop_name', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).not('status', 'eq', 'Completed'),
        supabase.from('ledger').select('dealer_id, amount, type, date')
      ]);

      const balances: Record<string, { total: number, firstDebit?: string, dealerName?: string }> = {};
      
      // Map dealer names for due accounts display
      const dealerMap: Record<string, string> = {};
      dealers.data?.forEach(d => { dealerMap[d.id] = d.shop_name; });

      ledgerRes.data?.forEach((l: any) => {
        if (!balances[l.dealer_id]) balances[l.dealer_id] = { total: 0, dealerName: dealerMap[l.dealer_id] };
        if (l.type === 'DEBIT') {
          balances[l.dealer_id].total += Number(l.amount);
          if (!balances[l.dealer_id].firstDebit) balances[l.dealer_id].firstDebit = l.date;
        } else {
          balances[l.dealer_id].total -= Number(l.amount);
        }
      });

      let totalDebt = 0;
      let alerts = 0;
      const today = new Date();
      const dues: any[] = [];

      Object.entries(balances).forEach(([id, b]) => {
        totalDebt += b.total;
        if (b.total > 0) {
          dues.push({ id, name: b.dealerName || 'Unknown Dealer', balance: b.total });
          if (b.firstDebit) {
            const diffDays = Math.floor((today.getTime() - new Date(b.firstDebit).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 10) alerts++; 
          }
        }
      });

      setDueAccounts(dues.sort((a, b) => b.balance - a.balance).slice(0, 5));
      setStats({
        totalDealers: dealers.count || 0,
        activeOrders: orders.count || 0,
        pendingLedger: totalDebt,
        collectionAlerts: alerts
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    fetchLiveStats();
    window.addEventListener('rcm-global-refresh', fetchLiveStats);
    return () => window.removeEventListener('rcm-global-refresh', fetchLiveStats);
  }, [fetchLiveStats]);

  return (
    <div className="space-y-4 px-4 pb-32 pt-4 bg-slate-50 min-h-full font-black text-left">
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Dealers" value={stats.totalDealers} icon={Users} color="bg-blue-600" loading={loading} to="/dealers" />
        <StatCard title="Collection Hub" value={stats.collectionAlerts} icon={AlarmClock} color="bg-red-600" loading={loading} to="/collections" badge={stats.collectionAlerts} />
        <div className="col-span-2">
            <StatCard title="Total Outstanding" value={`₹${(Math.abs(stats.pendingLedger)/1000).toFixed(1)}K`} icon={BookOpen} color="bg-slate-900" loading={loading} to="/ledger" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
           <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">Pending Dues</h4>
           <Link to="/ledger" className="text-[9px] text-blue-600 font-black uppercase italic">View All</Link>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
           {loading ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div> : dueAccounts.length === 0 ? (
             <p className="p-8 text-center text-gray-300 text-[10px] uppercase italic">No Due Payments Detected</p>
           ) : dueAccounts.map(account => (
             <Link key={account.id} to="/ledger" className="p-4 flex items-center justify-between hover:bg-gray-50 active:scale-[0.99] transition-all">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center"><AlertCircle size={16}/></div>
                   <div>
                      <p className="text-xs font-black italic uppercase text-gray-900 truncate max-w-[140px]">{account.name}</p>
                   </div>
                </div>
                <p className="text-sm font-black italic text-red-600">₹{account.balance.toLocaleString()}</p>
             </Link>
           ))}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 italic">Shortcuts</h4>
        <Link to="/orders" className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm active:scale-95 transition-all">
           <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><TrendingUp size={18} /></div>
              <div>
                <h4 className="text-sm font-black italic uppercase text-gray-900">Orders Management</h4>
                <p className="text-[9px] text-gray-400 uppercase font-black">{stats.activeOrders} Active Manifests</p>
              </div>
           </div>
           <ChevronRight size={20} className="text-gray-300" />
        </Link>
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><ShieldCheck size={24} /></div>
            <div>
              <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Security Control</p>
              <p className="text-xs font-black italic uppercase text-emerald-600">Encrypted Terminal Connected</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;