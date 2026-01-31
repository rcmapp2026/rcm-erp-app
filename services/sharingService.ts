
import { ShareContent, ShareResult } from '../types';

/**
 * ADVANCED SHARING ENGINE (v3.0)
 * Optimized for Android APKs, WebView, and WhatsApp.
 */
export const sharingService = {

  async share(content: ShareContent): Promise<ShareResult> {
    try {
      const files: File[] = [];

      // 1. Process Image
      if (content.imageUrl) {
        const imageFile = await this.toFile(
          content.imageUrl,
          `RCM_${Date.now()}.jpg`, // Using JPG for better Android compatibility
          'image/jpeg'
        );
        if (imageFile) files.push(imageFile);
      }

      // 2. Process PDF
      if (content.pdfUrl) {
        const pdfFile = await this.toFile(
          content.pdfUrl,
          content.fileName || `Report_${Date.now()}.pdf`,
          'application/pdf'
        );
        if (pdfFile) files.push(pdfFile);
      }

      // 3. Trigger Native Share (APK Support)
      if (navigator.share) {
        const shareData: any = {};

        // Only add text if it's provided (Fixes "Sharing from RCM ERP" issue)
        if (content.text && content.text.trim()) {
          shareData.text = content.text;
        }

        if (files.length > 0) {
           shareData.files = files;
           // Note: Some Android versions prefer no title when sharing files
        } else if (content.title) {
           shareData.title = content.title;
        }

        try {
          // Attempt sharing
          await navigator.share(shareData);
          return { success: true, message: 'Shared!', method: 'native' };
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') return { success: false, message: 'Cancelled', method: 'failed' };
          console.error("Native share failed, using fallback", shareErr);
        }
      }

      // 4. Final Fallback (For WhatsApp/Email)
      return this.fallbackShare(content);

    } catch (error: any) {
      console.error('Sharing engine failure:', error);
      return { success: false, message: "Sharing failed.", method: 'failed' };
    }
  },

  /**
   * High-reliability converter for APK environments.
   */
  async toFile(data: string | Blob, filename: string, mimeType: string): Promise<File | null> {
    try {
      let blob: Blob;

      if (data instanceof Blob) {
        blob = data;
      } else if (typeof data === 'string' && data.startsWith('data:')) {
        const byteString = atob(data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([ab], { type: mimeType });
      } else {
        const response = await fetch(data as string);
        blob = await response.blob();
      }

      return new File([blob], filename, { type: mimeType });
    } catch (err) {
      return null;
    }
  },

  fallbackShare(content: ShareContent): ShareResult {
    // PDF Web Fallback
    if (content.pdfUrl && !content.imageUrl) {
      const link = document.createElement('a');
      link.href = typeof content.pdfUrl === 'string' ? content.pdfUrl : URL.createObjectURL(content.pdfUrl);
      link.download = content.fileName || 'report.pdf';
      link.click();
      return { success: true, message: 'Downloading...', method: 'fallback' };
    }

    // WhatsApp Fallback
    // If native share fails, we can't send a local file, so we send the text.
    // If it's a remote URL, we include it.
    const textToShare = content.text || content.title || '';
    const imageLink = (content.imageUrl && typeof content.imageUrl === 'string' && !content.imageUrl.startsWith('data:'))
      ? `\n\nLink: ${content.imageUrl}` : '';

    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare + imageLink)}`;
    window.open(waUrl, '_blank');

    return { success: true, message: 'WhatsApp Opened', method: 'fallback' };
  }
};
