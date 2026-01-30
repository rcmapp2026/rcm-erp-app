interface ShareEngineInterface {
  shareFiles(text: string, filePaths: string): void;
}

declare global {
  interface Window {
    ShareEngine?: ShareEngineInterface;
  }
}

export function shareNative(text: string, files: string[]) {
  if (window.ShareEngine && typeof window.ShareEngine.shareFiles === 'function') {
    // Native side expects a JSON string for the file paths array.
    const filePathsJson = JSON.stringify(files);
    window.ShareEngine.shareFiles(text, filePathsJson);
  } else {
    console.warn('Native share engine not available.');
    // Implement a fallback or web-only sharing logic here if needed.
  }
}
