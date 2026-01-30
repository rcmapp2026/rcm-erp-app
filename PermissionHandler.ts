import toast from 'react-hot-toast';
import { SharingService } from './services/sharingService';

export class PermissionHandler {
  static isAndroid() {
    return !!(window as any).AndroidInterface;
  }

  /**
   * Shares image and text together using the robust native Android interface.
   * Falls back to web sharing if not in the APK.
   */
  static async shareImageAndText(
    base64Data?: string,
    text: string = '',
    mobile: string = '', // Mobile is handled by native part now if needed
    fileName: string = 'RCM_DOC.png'
  ) {
    try {
      const androidInterface = (window as any).AndroidInterface;

      // MASTER FIX: Use the corrected native 'shareFile' method
      if (this.isAndroid() && androidInterface.shareFile) {
        if (base64Data) {
            // Remove the data URL prefix (e.g., "data:image/png;base64,")
            const cleanBase64 = base64Data.split(',')[1] || base64Data;
            androidInterface.shareFile(cleanBase64, fileName, 'image/png', text);
            return;
        }
      }

      // Fallback to web-based sharing for browsers or if native fails
      if (base64Data) {
        const file = await SharingService.dataUriToFile(base64Data, fileName);
        await SharingService.share({ file, text, mobile });
      } else if (text) {
        await SharingService.share({ text, mobile });
      }
      
    } catch (err) {
      console.error("PermissionHandler Share failed", err);
      toast.error("Sharing failed. Please try again.");
    }
  }

  static hapticFeedback(pattern: number | number[] = 15) {
    try {
      const android = (window as any).AndroidInterface;
      if (android && android.vibrate) {
        android.vibrate(Array.isArray(pattern) ? pattern[pattern.length - 1] : pattern);
        return;
      }
      if ('vibrate' in navigator) navigator.vibrate(pattern);
    } catch {}
  }
}
