import { Directory, Filesystem } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import { shareNative } from './nativeShareBridge';

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

interface ShareFile {
    base64Data: string;
    fileName: string;
    mimeType: string;
}

export const shareContent = async (
  files: ShareFile[],
  text: string,
) => {
  try {
    if (Capacitor.isNativePlatform()) {
      if (!files || files.length === 0) {
        shareNative(text, []);
        return;
      }

      const filePaths: string[] = [];
      for (const file of files) {
          const cleanBase64 = file.base64Data.split(',')[1] || file.base64Data;
          const writeResult = await Filesystem.writeFile({
            path: file.fileName,
            data: cleanBase64,
            directory: Directory.Cache,
          });
          filePaths.push(writeResult.uri);
      }

      shareNative(text, filePaths);
      return;
    }

    const webFiles: File[] = files.map(f => {
        const blob = base64ToBlob(f.base64Data, f.mimeType);
        return new File([blob], f.fileName, { type: f.mimeType });
    });

    if (navigator.share && navigator.canShare({ files: webFiles })) {
      await navigator.share({ files: webFiles, text, title: "Share" });
    } else if (webFiles.length === 1) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(webFiles[0]);
      link.download = webFiles[0].name;
      link.click();
      URL.revokeObjectURL(link.href);
    } else {
      toast.error("Sharing multiple files is not supported by your browser.");
    }

  } catch (err) {
    console.error("FATAL SHARE ERROR:", err);
    toast.error("Sharing failed on this device.");
  }
};

export const openWhatsApp = (mobile: string, text: string) => {
  if (!mobile) return;
  const sanitizedMobile = mobile.replace(/\D/g, '');
  const url = `https://wa.me/91${sanitizedMobile}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
};
