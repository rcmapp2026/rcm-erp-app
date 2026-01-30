import toast from 'react-hot-toast';

const DATA_SECTIONS = [
  'dealers',
  'ledger',
  'orders',
  'products',
  'collections',
  'categories',
  'companies',
  'offers',
  'dealer-cart',
];

const getAllData = async (): Promise<{ [key: string]: any }> => {
  const allData: { [key: string]: any } = {};
  for (const section of DATA_SECTIONS) {
    try {
      const rawData = localStorage.getItem(section);
      allData[section] = rawData ? JSON.parse(rawData) : [];
    } catch (e) {
      console.error(`Failed to process data for section: ${section}`, e);
      allData[section] = [];
    }
  }
  return allData;
};

export const BackupService = {
  generateBackup: async (year: number, month: number) => {
    try {
      toast.loading(`Generating full A-to-Z backup...`);

      const backupData = await getAllData();
      
      backupData.backupMeta = {
        backupDate: new Date().toISOString(),
        requestedPeriod: { year, month },
        version: '1.2',
        note: 'This is a complete backup of all data, ignoring the selected month/year filter to ensure completeness.'
      };

      const monthStr = month.toString().padStart(2, '0');
      const fileName = `rcm-erp-full-backup-${year}-${monthStr}.json`;
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success(`Full A-to-Z backup downloaded!`);
    } catch (error) {
      console.error('Backup generation failed:', error);
      toast.dismiss();
      toast.error('Backup generation failed.');
    }
  },

  saveToDrive: async () => {
    toast.error('Save to Drive is not yet implemented.');
  },
};
