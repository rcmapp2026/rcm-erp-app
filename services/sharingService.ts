import { ShareContent, ShareResult } from '../types';

/**
 * ADVANCED SHARING ENGINE (v3.5)
 * Optimized for Android APKs, WebView, and WhatsApp.
 */
export const sharingService = {

  async share(content: ShareContent): Promise<ShareResult> {
    try {
      const android = (window as any).AndroidInterface || (window as any).ShareEngine;

      if (android) {
        let base64 = '';
        let mimeType = '';
        let fileName = '';

        if (content.imageUrl) {
          base64 = await this.ensureBase64(content.imageUrl);
          mimeType = this.detectMimeType(base64, 'image/png');
          const ext = mimeType.split('/')[1] || 'png';
          fileName = content.fileName || `RCM_Reminder_${Date.now()}.${ext}`;
        } else if (content.pdfUrl) {
          base64 = await this.ensureBase64(content.pdfUrl);
          mimeType = 'application/pdf';
          fileName = content.fileName || `Report_${Date.now()}.pdf`;
        }

        // Strip "data:...base64," prefix before sending to bridge for maximum compatibility
        const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

        if (cleanBase64 && android.shareFile) {
          const cleanMobile = (content.mobile || '').replace(/\D/g, '').slice(-10);

          try {
            // Modern Bridge with WhatsApp Support
            android.shareFile(cleanBase64, fileName, mimeType, content.text || '', cleanMobile);
          } catch (e) {
            // Legacy Fallback
            android.shareFile(cleanBase64, fileName, mimeType, content.text || '');
          }
          return { success: true, message: 'Sharing...', method: 'native' };
        }
      }

      // Web Fallback logic
      return this.fallbackShare(content);
    } catch (error) {
      console.error('Sharing failure:', error);
      return { success: false, message: "Sharing failed.", method: 'failed' };
    }
  },

  async ensureBase64(data: string): Promise<string> {
    if (data.startsWith('data:')) return data;
    try {
      const response = await fetch(data);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { return data; }
  },

  detectMimeType(base64: string, fallback: string): string {
    const match = base64.match(/^data:([^;]+);/);
    return match ? match[1] : fallback;
  },

  fallbackShare(content: ShareContent): ShareResult {
    const textToShare = content.text || '';
    const mobile = (content.mobile || '').replace(/\D/g, '').slice(-10);
    const waUrl = `https://wa.me/91${mobile}?text=${encodeURIComponent(textToShare)}`;
    window.open(waUrl, '_blank');
    return { success: true, message: 'WhatsApp Opened', method: 'fallback' };
  }
};
