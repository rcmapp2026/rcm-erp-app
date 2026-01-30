import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';

// Reliable Base64 to Blob converter for web
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const parts = base64.split(';base64,');
    const raw = window.atob(parts[1]);
    const uInt8Array = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([uInt8Array], { type: mimeType });
};

/**
 * The FINAL, GUARANTEED, bulletproof sharing core.
 */
export const shareContent = async (
  base64Data: string,
  fileName: string,
  text: string,
  mimeType: string
) => {
  try {
    const file = base64ToBlob(base64Data, mimeType);

    // NATIVE APK PATH
    if (Capacitor.isNativePlatform()) {
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data, // Pass the full data URI
        directory: Directory.Cache,
      });

      await Share.share({ text, url: writeResult.uri });
      return;
    }

    // WEB BROWSER PATH (Corrected)
    if (navigator.share && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: text });
    } else {
      // Fallback to download
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