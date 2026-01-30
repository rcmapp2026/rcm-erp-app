
import toast from 'react-hot-toast';

export class UniversalBridge {
  /**
   * Universal method to share File + Text together.
   * Works for both PDFs and Images.
   */
  static async share(payload: { 
    base64?: string, 
    text?: string, 
    fileName: string, 
    mimeType: string, 
    mobile?: string 
  }) {
    const { base64, text, fileName, mimeType, mobile } = payload;
    const android = (window as any).AndroidInterface;

    // 1. APK BRIDGE (Priority for Android Apps)
    if (android && (android.shareFile || android.saveAndShareFile)) {
      try {
        const cleanBase64 = base64?.includes(',') ? base64.split(',')[1] : base64;
        if (cleanBase64) {
          if (android.shareFile) {
            android.shareFile(cleanBase64, fileName, mimeType, text || '');
          } else {
            android.saveAndShareFile(cleanBase64, fileName, mimeType, text || '');
          }
          return;
        }
      } catch (e) {
        console.error("APK Bridge Error", e);
      }
    }

    // 2. WEB SHARE API (Mobile Browsers Chrome/Safari)
    if (base64 && navigator.share && navigator.canShare) {
      try {
        const blob = await this.base64ToBlob(base64, mimeType);
        const file = new File([blob], fileName, { type: mimeType });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text: text || '',
            title: fileName
          });
          return;
        }
      } catch (e) {
        console.error("Web Share Failed", e);
        // Fallback to separate sharing if combined fails
      }
    }

    // 3. FALLBACK: WHATSAPP LINK (Text Only - Images won't work here)
    if (mobile || text) {
      this.openWhatsApp(mobile || '', text || '');
      if (base64) {
        toast.error("File attached separately or not supported in this browser mode.");
        this.downloadFallback(base64, fileName);
      }
    } else {
      toast.error("Sharing not supported on this device/browser.");
    }
  }

  private static async base64ToBlob(base64: string, mimeType: string): Promise<Blob> {
    const data = base64.includes(',') ? base64.split(',')[1] : base64;
    const byteCharacters = atob(data);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: mimeType });
  }

  private static openWhatsApp(mobile: string, text: string) {
    const sanitized = mobile.replace(/\D/g, '').slice(-10);
    const url = `https://wa.me/91${sanitized}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  private static downloadFallback(base64: string, fileName: string) {
    const link = document.createElement('a');
    link.href = base64;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
