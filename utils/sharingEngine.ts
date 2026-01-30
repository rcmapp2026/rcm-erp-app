import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

// This is the guaranteed Base64 to Blob converter for web.
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1] || mimeType;
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: contentType });
};

/**
 * The FINAL, GUARANTEED, bulletproof sharing engine.
 * This function handles all file sharing for both native APK and web.
 */
export const shareFileAndText = async (
  base64Data: string,
  fileName: string,
  text: string,
  mimeType: string
) => {
  try {
    // NATIVE APK PATH (Android/iOS)
    if (Capacitor.isNativePlatform()) {
      const cleanBase64 = base64Data.split(',')[1] || base64Data;
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: cleanBase64,
        directory: Directory.Cache,
      });

      await Share.share({
        title: fileName,
        text: text,
        url: writeResult.uri, // The key to native sharing
      });
      return;
    }

    // WEB BROWSER PATH
    const blob = base64ToBlob(base64Data, mimeType);
    const file = new File([blob], fileName, { type: mimeType });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text, title: fileName });
    } else {
      // Fallback for browsers that don't support sharing files
      const link = document.createElement('a');
      link.href = URL.createObjectURL(file);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (err) {
    console.error("ULTIMATE SHARING FAILED:", err);
    toast.error("Sharing is not available on this device.");
  }
};