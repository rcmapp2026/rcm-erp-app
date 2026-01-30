#!/bin/bash

echo "🔧 Building RCM ERP for Android with fixes..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
npx cap clean android

# Sync web assets
echo "📱 Syncing web assets..."
npm run build
npx cap sync android

# Open Android project
echo "🛠️ Opening Android project for build..."
npx cap open android

echo "✅ Build preparation complete!"
echo "📋 Next steps:"
echo "1. In Android Studio, click Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo "2. Select 'release' and click Finish"
echo "3. The APK will be in android/app/build/outputs/apk/release/"
echo ""
echo "🔧 Applied fixes:"
echo "✓ Enhanced permissions for Android settings visibility"
echo "✓ Fixed image + text sharing in APK"
echo "✓ Fixed PDF download and sharing"
echo "✓ Improved WhatsApp integration"
echo "✓ Enhanced file storage handling"
