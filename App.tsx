
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  Hexagon, Menu, X, LayoutDashboard, BookOpen, Package, 
  Send, BarChart3, Users, Tags, Building2, ListOrdered, 
  UserCircle, Loader2, AlarmClock, 
  Lock, ArrowRight, User, CheckCircle2, Gift, ShoppingCart, Save
} from 'lucide-react';
import { supabase } from './supabase';
import { PermissionHandler } from './PermissionHandler';
import toast from 'react-hot-toast';

// Page Imports
import Dashboard from './Dashboard';
import Dealers from './pages/Dealers';
import Ledger from './pages/Ledger';
import Orders from './pages/Orders';
import Products from './pages/Products';
import CollectionHub from './pages/CollectionHub';
import Reports from './pages/Reports';
import Notifications from './pages/Notifications';
import Categories from './pages/Categories';
import Companies from './pages/Companies';
import Account from './pages/Account';
import Offers from './pages/Offers';
import DealerCart from './pages/DealerCart';
import BackupPage from './pages/Backup';

// Success Context
interface SuccessData {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}
const SuccessContext = createContext<{ triggerSuccess: (data: SuccessData) => void } | null>(null);
export const useSuccess = () => useContext(SuccessContext)!;

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-[9999] bg-white w-full h-full overflow-hidden">
      <style>{`
        @keyframes rotate-in {
          from {
            transform: rotateY(90deg) scale(0.8);
            opacity: 0;
          }
          to {
            transform: rotateY(0deg) scale(1);
            opacity: 1;
          }
        }
        @keyframes text-glow {
          0%, 100% { text-shadow: 0 0 5px #F59E0B, 0 0 10px #F59E0B, 0 0 15px #2563EB, 0 0 20px #2563EB; }
          50% { text-shadow: 0 0 10px #2563EB, 0 0 15px #2563EB, 0 0 20px #F59E0B, 0 0 25px #F59E0B; }
        }
        .splash-logo {
          animation: rotate-in 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          transform-style: preserve-3d;
        }
        .splash-text {
           animation: text-glow 2.5s ease-in-out infinite;
        }
      `}</style>
      <div className="splash-logo perspective-[1000px]">
        <div className="w-32 h-32 bg-white rounded-[2.8rem] flex items-center justify-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border-4 border-orange-500">
          <Hexagon size={64} className="text-blue-600" strokeWidth={3} />
        </div>
      </div>
      <div className="text-center px-6 mt-12 space-y-2">
        <h1 className="text-7xl font-black italic tracking-tighter text-black uppercase splash-text">
          <span style={{color: '#F97316'}}>RCM</span> <span style={{color: '#2563EB'}}>ERP</span>
        </h1>
        <p className="text-xs text-gray-500 uppercase tracking-[0.3em] font-bold">R.C.M. HARDWARE</p>
      </div>
    </div>
  );
};

const SuccessScreen = ({ data, onDismiss }: { data: SuccessData; onDismiss: () => void }) => {
  return (
    <div className="fixed inset-0 bg-white z-[1000] flex flex-col items-center justify-center p-8">
      <div className="w-32 h-32 bg-white border-8 border-green-600 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-2xl">
        <CheckCircle2 size={64} strokeWidth={4} />
      </div>
      <h2 className="text-4xl font-black italic uppercase tracking-tighter text-black text-center mb-4">{data.title}</h2>
      <p className="text-sm font-black italic text-black text-center uppercase tracking-widest mb-12 max-w-xs opacity-70">{data.message}</p>
      <button onClick={() => { data.onAction(); onDismiss(); }} className="w-full max-w-xs bg-black text-white p-7 rounded-[2rem] font-black uppercase italic shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 border-4 border-blue-600">
        {data.actionLabel} <ArrowRight size={24} strokeWidth={4} />
      </button>
    </div>
  );
};

const LoginScreen = () => {
  const [email] = useState('rcmhardware@gmail.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("CREDENTIALS REJECTED");
    } catch (err) { toast.error("SYSTEM ERROR"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-full w-full flex items-center justify-center p-8 bg-white">
      <div className="w-full max-w-sm space-y-12">
        <div className="flex flex-col items-center space-y-6">
           <div className="w-24 h-24 bg-black rounded-[2rem] flex items-center justify-center shadow-2xl border-4 border-blue-600">
             <Hexagon size={48} className="text-white" strokeWidth={4} />
           </div>
           <div className="text-center">
             <h2 className="text-5xl font-black italic uppercase tracking-tighter text-black">ADMIN</h2>
             <p className="text-xs text-black uppercase tracking-[0.4em] font-black italic opacity-60">Terminal Login</p>
           </div>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <input type="email" value={email} disabled className="w-full h-16 px-6 font-black rounded-2xl border-4 border-black bg-white text-black uppercase text-sm" />
          <input autoFocus type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="SECRET KEY" className="w-full h-16 px-6 font-black rounded-2xl border-4 border-black bg-white text-black uppercase text-sm outline-none focus:border-blue-600" />
          <button disabled={loading} className="w-full bg-blue-600 text-white h-16 rounded-2xl font-black uppercase italic shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all border-4 border-black">
            {loading ? <Loader2 className="animate-spin" /> : "LOG IN TERMINAL"}
          </button>
        </form>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<'splash' | 'ready'>('splash');
  const [session, setSession] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  
  const location = useLocation();

  useEffect(() => {
    const init = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setIsInitialized(true);
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => { setSession(currentSession); });
    return () => subscription.unsubscribe();
  }, []);

  if (appState === 'splash' || !isInitialized) return <SplashScreen onComplete={() => setAppState('ready')} />;
  if (!session) return <LoginScreen />;

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', color: 'text-blue-600', border: 'border-blue-600' },
    { to: '/collections', icon: AlarmClock, label: 'Collections', color: 'text-red-600', border: 'border-red-600' },
    { to: '/ledger', icon: BookOpen, label: 'Ledger', color: 'text-green-600', border: 'border-green-600' },
    { to: '/orders', icon: ListOrdered, label: 'Orders', color: 'text-orange-600', border: 'border-orange-600' },
    { to: '/products', icon: Package, label: 'Stock', color: 'text-blue-600', border: 'border-blue-600' },
    { to: '/dealers', icon: Users, label: 'Dealers', color: 'text-red-600', border: 'border-red-600' },
    { to: '/offers', icon: Gift, label: 'Offers', color: 'text-green-600', border: 'border-green-600' },
    { to: '/dealer-cart', icon: ShoppingCart, label: 'Cart', color: 'text-orange-600', border: 'border-orange-600' },
    { to: '/categories', icon: Tags, label: 'Categories', color: 'text-blue-600', border: 'border-blue-600' },
    { to: '/companies', icon: Building2, label: 'Brands', color: 'text-red-600', border: 'border-red-600' },
    { to: '/reports', icon: BarChart3, label: 'Reports', color: 'text-green-600', border: 'border-green-600' },
    { to: '/notifications', icon: Send, label: 'Broadcast', color: 'text-orange-600', border: 'border-orange-600' },
    { to: '/backup', icon: Save, label: 'Backup', color: 'text-blue-600', border: 'border-blue-600' },
    { to: '/account', icon: UserCircle, label: 'Profile', color: 'text-black', border: 'border-black' },
  ];

  return (
    <SuccessContext.Provider value={{ triggerSuccess: setSuccessData }}>
      <div className="app-container font-black bg-white min-h-screen w-full overflow-x-hidden">
        <header className="px-5 py-4 flex items-center justify-between border-b-4 border-black bg-white sticky top-0 z-[100] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMenuOpen(true)} className="p-2 border-2 border-black rounded-xl active:scale-90"><Menu size={24} strokeWidth={4} /></button>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-black">{navItems.find(n => n.to === location.pathname)?.label || 'CONSOLE'}</h2>
          </div>
          <div className="w-10 h-10 bg-black rounded-full border-2 border-blue-600"></div>
        </header>

        <main className="flex-1 relative overflow-hidden bg-white">
          <div className="h-full overflow-y-auto no-scrollbar pb-32">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dealers" element={<Dealers />} />
                <Route path="/ledger" element={<Ledger />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/products" element={<Products />} />
                <Route path="/collections" element={<CollectionHub />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/offers" element={<Offers />} />
                <Route path="/dealer-cart" element={<DealerCart />} />
                <Route path="/backup" element={<BackupPage />} />
                <Route path="/account" element={<Account />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
          </div>
        </main>

        {isMenuOpen && (
          <div className="fixed inset-0 bg-white z-[500] flex flex-col h-full w-full">
            <div className="px-6 py-6 flex items-center justify-between border-b-4 border-black shrink-0">
               <h2 className="text-3xl font-black italic uppercase text-black">RCM <span className="text-blue-600">ERP</span></h2>
               <button onClick={() => setIsMenuOpen(false)}><X size={40} strokeWidth={4} /></button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 pb-32 no-scrollbar">
               {navItems.map((item) => (
                 <Link key={item.to} to={item.to} onClick={() => setIsMenuOpen(false)} className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[2rem] border-4 transition-all active:scale-95 ${location.pathname === item.to ? 'bg-black text-white border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]' : `bg-white ${item.color} ${item.border}`}`}>
                   <item.icon size={32} strokeWidth={4} /><span className="font-black text-[10px] uppercase italic text-center leading-none text-black">{item.label}</span>
                 </Link>
               ))}
               <button onClick={async () => { await supabase.auth.signOut(); setIsMenuOpen(false); }} className="col-span-full mt-4 p-6 rounded-2xl border-4 border-red-600 text-red-600 font-black uppercase italic text-xs flex items-center justify-center gap-2 active:bg-red-50 transition-all">TERMINATE SESSION</button>
            </nav>
          </div>
        )}
        {successData && <SuccessScreen data={successData} onDismiss={() => setSuccessData(null)} />}
      </div>
    </SuccessContext.Provider>
  );
};

export default App;
