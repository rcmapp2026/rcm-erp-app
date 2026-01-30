import React, { useState } from 'react';
import { Save, HardDrive, Calendar } from 'lucide-react';
import { BackupService } from '../services/backupService';

const BackupPage: React.FC = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  const handleDownload = () => {
    BackupService.generateBackup(year, month);
  };

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, name: 'January' }, { value: 2, name: 'February' }, { value: 3, name: 'March' },
    { value: 4, name: 'April' }, { value: 5, name: 'May' }, { value: 6, name: 'June' },
    { value: 7, name: 'July' }, { value: 8, name: 'August' }, { value: 9, name: 'September' },
    { value: 10, name: 'October' }, { value: 11, name: 'November' }, { value: 12, name: 'December' },
  ];

  return (
    <div className="p-6 bg-white h-full">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black italic uppercase tracking-tighter text-black">System Backup</h1>
        <p className="text-sm text-gray-500 uppercase tracking-widest font-bold mt-2">MANAGE AND PROTECT YOUR DATA</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <div className="bg-white border-4 border-black rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg">
          <div className="w-24 h-24 bg-blue-600 text-white rounded-full flex items-center justify-center border-4 border-black mb-6">
            <Calendar size={48} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-black mb-4">Select Backup Period</h2>
          
          <div className="w-full flex gap-4 mb-6">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full p-3 border-2 border-black rounded-xl font-bold uppercase">
              {months.map(m => <option key={m.value} value={m.value}>{m.name}</option>)}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full p-3 border-2 border-black rounded-xl font-bold uppercase">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <button 
            onClick={handleDownload} 
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase italic shadow-md active:scale-95 transition-all border-2 border-black flex items-center justify-center gap-3">
            <Save size={20} /> Download Now
          </button>
        </div>

        <div className="bg-white border-4 border-gray-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center opacity-60">
          <div className="w-24 h-24 bg-gray-400 text-white rounded-full flex items-center justify-center border-4 border-black mb-6">
            <HardDrive size={48} strokeWidth={3} />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-gray-800 mb-3">Save to Drive</h2>
          <p className="text-xs text-gray-600 font-bold uppercase mb-6">Automatically upload your backup to a secure cloud drive. (Coming Soon)</p>
          <button 
            onClick={BackupService.saveToDrive} 
            className="w-full bg-gray-400 text-white py-4 rounded-2xl font-black uppercase italic shadow-md cursor-not-allowed">
            Connect Drive
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto mt-12 text-center text-xs text-gray-500 font-bold uppercase tracking-widest">
        <p>Backups include all sections: Dealers, Ledger, Orders, Products, and more. It is recommended to download your backup at the beginning of each month.</p>
      </div>
    </div>
  );
};

export default BackupPage;
