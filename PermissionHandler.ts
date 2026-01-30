import toast from 'react-hot-toast';
import { SharingService } from './services/sharingService';

export class PermissionHandler {
  static isAndroid(): boolean {
    return typeof (window as any).AndroidInterface?.shareFile === 'function';
  }

  static async shareImageAndText(
    base64Data?: string,
    text: string = '',
    mobile: string = '',
    fileName: string = 'RCM_DOC.png'
  ) {
    try {
      // --- MASTER FIX for APK ---
      // Always prioritize the native Android interface if it's available.
      if (PermissionHandler.isAndroid()) {
        if (base64Data) {
          const cleanBase64 = base64Data.split(',')[1] || base64Data;
          (window as any).AndroidInterface.shareFile(cleanBase64, fileName, 'image/png', text);
          return; // Success, stop here.
        }
      }

      // --- MASTER FIX for Web Browsers ---
      // Use the modern Web Share API for browsers that support it.
      const file = base64Data ? await SharingService.dataUriToFile(base64Data, fileName) : undefined;
      
      const shareData: ShareData = { text: text || undefined };
      if (file) {
        shareData.files = [file];
      }

      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return; // Success, stop here.
      }

      // --- Fallback for older browsers ---
      // If Web Share API is not available, fall back to WhatsApp or direct download.
      SharingService.share({ file, text, mobile });
      
    } catch (err) {
      console.error("Unified Share failed", err);
      toast.error("Sharing not supported on this device.");
    }
  }

  static async sharePdf(base64Data: string, fileName: string, text: string, mobile: string) {
    try {
      // --- MASTER FIX for APK (PDF) ---
      if (PermissionHandler.isAndroid()) {
        const cleanBase64 = base64Data.split(',')[1] || base64Data;
        (window as any).AndroidInterface.shareFile(cleanBase64, fileName, 'application/pdf', text);
        return; // Success
      }

      // --- MASTER FIX for Web (PDF) ---
      const file = await SharingService.dataUriToFile(base64Data, fileName);
      await SharingService.share({ file, text, mobile, title: fileName });

    } catch (err) {
      console.error("Share PDF failed", err);
      toast.error("Could not share PDF.");
    }
  }

  static hapticFeedback(pattern: number | number[] = 15) {
    try {
      const android = (window as any).AndroidInterface;
      if (android && android.vibrate) {
        android.vibrate(Array.isArray(pattern) ? pattern[pattern.length - 1] : pattern);
      } else if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  }
}
