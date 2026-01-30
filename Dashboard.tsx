
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from './supabase';
import { 
  Users, BookOpen, Loader2, ShieldCheck, TrendingUp, ChevronRight, AlertCircle, Package, ListOrdered, BarChart3
} from 'lucide-react';

const DashboardCard = ({ title, value, icon: Icon, color, loading, to }: any) => {
  return (
    <Link to={to} className="bg-white rounded-2xl p-5 flex flex-col justify-between h-40 border border-slate-200 active:scale-95 transition-all">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: color }}>
          <Icon size={20} strokeWidth={3} />
        </div>
        <p className="text-[10px] font-black uppercase" style={{ color }}>{title}</p>
      </div>
      <div className="text-3xl font-black text-black flex items-end justify-between">
        {loading ? <Loader2 className="animate-spin text-slate-200" /> : value}
        <ChevronRight size={18} className="text-slate-300" />
      </div>
    </Link>
  );
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({ totalDealers: 0, activeOrders: 0, totalDue: 0, totalStock: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const [dealers, orders, ledger, products] = await Promise.all([
        supabase.from('dealers').select('id', { count: 'exact' }),
        supabase.from('orders').select('id', { count: 'exact' }).not('status', 'eq', 'Completed'),
        supabase.from('ledger').select('amount, type'),
        supabase.from('products').select('id', { count: 'exact' })
      ]);
      let netDue = 0;
      ledger.data?.forEach(l => { netDue += l.type === 'DEBIT' ? Number(l.amount) : -Number(l.amount); });
      setStats({ totalDealers: dealers.count || 0, activeOrders: orders.count || 0, totalDue: netDue, totalStock: products.count || 0 });
    } catch (e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className="space-y-6 px-5 pb-32 pt-6 bg-white min-h-full font-black">
      <div className="grid grid-cols-2 gap-4">
        <DashboardCard title="DUE" value={`₹${(stats.totalDue/1000).toFixed(1)}K`} icon={AlertCircle} color="#DC2626" loading={loading} to="/ledger" />
        <DashboardCard title="ORDERS" value={stats.activeOrders} icon={TrendingUp} color="#2563EB" loading={loading} to="/orders" />
        <DashboardCard title="STOCK" value={stats.totalStock} icon={Package} color="#F97316" loading={loading} to="/products" />
        <DashboardCard title="DEALERS" value={stats.totalDealers} icon={Users} color="#16A34A" loading={loading} to="/dealers" />
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <div className="w-1.5 h-4 bg-blue-600"></div> QUICK ACCESS
        </h4>
        <div className="grid grid-cols-3 gap-3">
           {[
             { label: 'Dealers', to: '/dealers', icon: Users, color: '#DC2626' },
             { label: 'Orders', to: '/orders', icon: ListOrdered, color: '#F97316' },
             { label: 'Ledger', to: '/ledger', icon: BookOpen, color: '#16A34A' },
             { label: 'Stock', to: '/products', icon: Package, color: '#2563EB' },
             { label: 'Reports', to: '/reports', icon: BarChart3, color: '#2563EB' },
             { label: 'Profile', to: '/account', icon: Users, color: '#000000' },
           ].map(act => (
             <Link key={act.to} to={act.to} className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 border border-slate-100 active:scale-95 transition-all shadow-sm">
                <act.icon size={24} strokeWidth={3} style={{ color: act.color }} />
                <span className="text-[8px] uppercase font-black text-slate-500">{act.label}</span>
             </Link>
           ))}
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative overflow-hidden">
          <div className="relative z-10 space-y-2">
             <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600">
                <ShieldCheck size={16} strokeWidth={3}/> SECURE TERMINAL
             </div>
             <h3 className="text-xl font-black italic uppercase text-black">RCM CLOUD ERP</h3>
             <p className="text-[9px] text-slate-400 font-black uppercase">SYSTEM V5.0 ACTIVE</p>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
