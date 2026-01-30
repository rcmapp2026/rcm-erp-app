import toast from 'react-hot-toast';
import { UniversalBridge } from '../utils/UniversalBridge';

export const SharingService = {
  /**
   * Converts a Data URI (base64) to a File object.
   */
  dataUriToFile: async (dataUri: string, fileName: string): Promise<File> => {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    const mimeType = blob.type || 'application/octet-stream';
    return new File([blob], fileName, { type: mimeType });
  },

  /**
   * Opens WhatsApp with a pre-filled text message.
   */
  openWhatsAppDirect: (mobile: string, text: string) => {
    const cleanMobile = mobile.replace(/\D/g, '');
    const phone = cleanMobile.startsWith('91') ? cleanMobile : `91${cleanMobile}`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  },

  /**
   * A robust share function with improved fallbacks for web and mobile.
   */
  share: async (options: { file?: File; text?: string; title?: string; mobile?: string }) => {
    const { file, text, title, mobile } = options;

    const shareData: ShareData = { title };
    if (text) shareData.text = text;
    if (file) shareData.files = [file];

    // 1. Prioritize Web Share API for the best native experience
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return; // Success!
      } catch (error: any) {
        if (error.name === 'AbortError') return; // User cancelled share
        console.error("Web Share API failed, using fallbacks.", error);
      }
    }

    // --- Fallback Mechanisms ---

    // 2. WhatsApp Fallback (if mobile number is provided)
    if (mobile) {
      const message = text || '';
      if (file) {
        // Can't attach file directly, so download it and open WhatsApp
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success("File saved! Now opening WhatsApp...");
        setTimeout(() => SharingService.openWhatsAppDirect(mobile, message), 1500);
      } else {
        // Just open WhatsApp with text
        SharingService.openWhatsAppDirect(mobile, message);
      }
      return;
    }

    // 3. Generic Fallbacks (Download or Copy)
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("File saved to your device.");
      return;
    }

    if (text) {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard.");
      return;
    }

    toast.error("Nothing available to share.");
  },

  /**
   * Shares a PDF using the native Android interface if available, with a fallback.
   */
  sharePdf: async (base64Data: string, text: string, mobile: string, fileName: string) => {
    try {
      await UniversalBridge.share({
        base64: base64Data,
        text: text,
        fileName: fileName,
        mimeType: 'application/pdf',
        mobile: mobile,
      });
    } catch (err) {
      console.error("sharePdf failed", err);
      toast.error("Could not share PDF. Please try again.");
    }
  }
};
