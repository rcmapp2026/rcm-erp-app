// This file now ONLY calls the new, bulletproof sharing engine.
import { shareFileAndText } from './utils/sharingEngine';

export class PermissionHandler {

  static async shareImageAndText(
    base64Data?: string,
    text: string = '',
    fileName: string = 'RCM_Reminder.png'
  ) {
    if (!base64Data) return;
    await shareFileAndText(base64Data, fileName, text, 'image/png');
  }

  static async sharePdf(
    base64Data: string,
    fileName: string,
    text: string
  ) {
    await shareFileAndText(base64Data, fileName, text, 'application/pdf');
  }
}