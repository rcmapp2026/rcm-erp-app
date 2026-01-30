const fs = require('fs');
const path = require('path');

/**
 * RCM ADMIN ERP AUTO-FIXER (v2)
 * Restores Android Manifest, FileProvider, Kotlin Bridges and performance styles.
 */

const ROOT = path.join(__dirname, '..');
const ANDROID_ROOT = path.join(ROOT, 'android');
const CONFIG_SRC = path.join(ROOT, 'AppConfig');

const MAPPINGS = [
  { src: 'AndroidManifest.xml', dest: 'app/src/main/AndroidManifest.xml' },
  { src: 'strings.xml', dest: 'app/src/main/res/values/strings.xml' },
  { src: 'styles.xml', dest: 'app/src/main/res/values/styles.xml' },
  { src: 'file_paths.xml', dest: 'app/src/main/res/xml/file_paths.xml' },
  { src: 'MainActivity.kt', dest: 'app/src/main/java/com/rcm/erp/MainActivity.kt' },
  { src: 'WebInterface.kt', dest: 'app/src/main/java/com/rcm/erp/WebInterface.kt' }
];

if (!fs.existsSync(ANDROID_ROOT)) {
  console.error("FATAL: 'android' folder not found. Build your project first.");
  process.exit(1);
}

console.log("--- RCM AUTO-FIXER: Injecting Native Resources ---");

MAPPINGS.forEach(item => {
  const s = path.join(CONFIG_SRC, item.src);
  const d = path.join(ANDROID_ROOT, item.dest);
  
  if (fs.existsSync(s)) {
    fs.mkdirSync(path.dirname(d), { recursive: true });
    fs.copyFileSync(s, d);
    console.log(`[OK] Restored: ${item.src}`);
  }
});

console.log("\n[SUCCESS] Native Layer is now fixed and optimized for APK.");