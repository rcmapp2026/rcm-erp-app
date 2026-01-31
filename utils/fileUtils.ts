
import { PermissionHandler } from '../PermissionHandler';
import toast from 'react-hot-toast';

export const FileUtils = {
  /**
   * Universal File Handling Protocol
   * Detects platform and applies best save/share logic.
   */
  saveAndShare: async (blob: Blob, filename: string, text: string, mobile?: string) => {
    try {
      // 1. Android APK Integration (Priority)
      if ((window as any).AndroidInterface) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Trigger APK Share Bridge
          if ((window as any).AndroidInterface.shareFile) {
            (window as any).AndroidInterface.shareFile(
              base64data,
              filename,
              blob.type,
              text,
              mobile || ''
            );
          } else if ((window as any).AndroidInterface.downloadFile) {
            (window as any).AndroidInterface.downloadFile(
              base64data,
              filename,
              blob.type
            );
            toast.success("Document Saved in Downloads Hub");
          }
        };
        return true;
      }

      // 2. Mobile Browser Web Share API
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'RCM ERP Manifest',
          text: text,
        });
        return true;
      }

      // 3. Standard Desktop Fallback
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Document Archived Locally");
      return true;
    } catch (e) {
      console.error("Transmission Error:", e);
      toast.error("Manifest Handover Failed");
      return false;
    }
  }
};
