
import { sharingService } from './services/sharingService';

export class PermissionHandler {

  private static isAndroid(): boolean {
    return /Android/i.test(navigator.userAgent);
  }

  static async shareImageAndText(
    base64Data?: string,
    text: string = '',
    title: string = 'RCM Business',
    mobile?: string,
    fileName?: string
  ) {
    if (!base64Data) return;

    await sharingService.share({
      title,
      text,
      imageUrl: base64Data,
      mobile,
      fileName
    });
  }

  static async sharePdf(
    base64Data: string,
    fileName: string,
    text: string,
    title: string = 'RCM Business',
    mobile?: string
  ) {
    await sharingService.share({
      title,
      text,
      pdfUrl: base64Data,
      fileName,
      mobile
    });
  }

  static openWhatsApp(mobile: string, text: string) {
    const sanitizedMobile = mobile.replace(/\D/g, '').slice(-10);
    const url = `https://wa.me/91${sanitizedMobile}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }
}
