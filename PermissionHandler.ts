import { shareContent, openWhatsApp as openWhatsAppCore } from './utils/sharingCore';

interface ShareFile {
    base64Data: string;
    fileName: string;
    mimeType: string;
}

export class PermissionHandler {

  static async shareImageAndText(
    base64Data?: string,
    text: string = '',
    fileName: string = 'RCM_Reminder.png'
  ) {
    if (!base64Data) return;

    await shareContent(
      [{ base64Data, fileName, mimeType: 'image/png' }],
      text
    );
  }

  static async sharePdf(
    base64Data: string,
    fileName: string,
    text: string
  ) {
    await shareContent(
      [{ base64Data, fileName, mimeType: 'application/pdf' }],
      text
    );
  }

  static async shareMultipleFiles(
    files: ShareFile[],
    text: string
  ) {
      if (!files || files.length === 0) return;
      await shareContent(files, text);
  }

  static openWhatsApp(mobile: string, text: string) {
    openWhatsAppCore(mobile, text);
  }
}
