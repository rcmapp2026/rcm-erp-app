
import React from 'react';
import { Building, Phone, MapPin, CreditCard, Upload, Save } from 'lucide-react';

const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
        <h3 className="text-xl font-black mb-8 border-b pb-4 uppercase italic">Company Profile</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase text-gray-400 mb-1.5 block italic">Business Name</label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" defaultValue="RCM Hardware Distributors" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600/20" />
              </div>
            </div>
            <div>
              <label className="text-xs font-black uppercase text-gray-400 mb-1.5 block italic">Support Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" defaultValue="+91 947121745" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600/20" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50/50 p-6">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-300 shadow-sm mb-4 border overflow-hidden">
               <img src="https://picsum.photos/100/100" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <button className="flex items-center space-x-2 text-blue-600 text-xs font-black uppercase hover:underline italic">
              <Upload size={14} />
              <span>Change Logo</span>
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-black uppercase text-gray-400 mb-1.5 block italic">Office Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
              <textarea rows={3} defaultValue="RCM Logistics Hub, Industrial Estate, Patna" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600/20 resize-none"></textarea>
            </div>
          </div>
          <div>
            <label className="text-xs font-black uppercase text-gray-400 mb-1.5 block italic">Default UPI ID for Payments</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" defaultValue="rcm.distribute@upi" className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-600/20 font-mono" />
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-50 flex justify-end">
          <button className="flex items-center space-x-2 px-12 py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-blue-600 transition-all italic uppercase tracking-widest shadow-xl">
            <Save size={18} />
            <span>Update Settings</span>
          </button>
        </div>
      </div>

      <div className="bg-red-50 border border-red-100 rounded-3xl p-8 shadow-sm">
        <h3 className="text-xl font-black text-red-800 mb-4 uppercase italic">Security Protocol</h3>
        <p className="text-sm text-red-700/70 mb-6 font-medium italic">High-level administrative overrides. Changes here impact global dealer network synchronization.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button className="p-5 bg-white border border-red-200 rounded-2xl text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all text-left">
            Clear Broadcast History
          </button>
          <button className="p-5 bg-white border border-red-200 rounded-2xl text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all text-left">
            Lock Dealer Access Nodes
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
