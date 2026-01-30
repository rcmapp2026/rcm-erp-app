import { shareContent } from './utils/sharingCore'; // Use the NEW core

export class PermissionHandler {
  static async shareImageAndText(
    base64Data?: string,
    text: string = '',
    fileName: string = 'RCM_Reminder.png'
  ) {
    if (!base64Data) return;
    await shareContent(base64Data, fileName, text, 'image/png');
  }

  static async sharePdf(
    base64Data: string,
    fileName: string,
    text: string
  ) {
    await shareContent(base64Data, fileName, text, 'application/pdf');
  }
}