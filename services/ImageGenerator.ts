
import { Dealer } from '../types';

/**
 * Helper to wrap text into multiple lines
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, y + (lineCount * lineHeight));
      line = words[n] + ' ';
      lineCount++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y + (lineCount * lineHeight));
  return (lineCount + 1) * lineHeight;
}

/**
 * Unified generation logic for high-fidelity HD images (1200x1040).
 * Width increased to 1200px to ensure WhatsApp text captions utilize full width.
 */
export const generateReminderImage = async (
  dealer: any,
  amount: number | string,
  type: 'Standard' | 'Urgent',
  days: number = 3
): Promise<string> => {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error("Canvas context failed");

    // Increased width to 1200px, kept height same
    canvas.width = 1200;
    canvas.height = 1040;
    const centerX = 600;

    const isUrgent = type === 'Urgent';
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount;

    // COLOR PALETTE
    const colorOrange = '#F97316';
    const colorBlue = '#2563EB';
    const colorRed = '#E31E24';
    const colorOrangeDark = '#C2410C';
    const colorBlueDark = '#1E3A8A';
    const colorRedDark = '#991B1B';
    const shopNameColor = '#E31E24';
    const pillGradient = isUrgent ? ['#E31E24', '#FB7185'] : [colorBlue, '#60A5FA'];

    // 1. BACKGROUND
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1200, 1040);
    const bgGrad = ctx.createRadialGradient(centerX, 200, 0, centerX, 200, 800);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(1, '#f3f4f6');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1040);

    // 2. 3D RCM LOGO
    ctx.save();
    ctx.translate(centerX, 150);
    ctx.font = 'italic 900 180px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 20;
    ctx.fillText('RCM', 0, 0);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    const depth = 14;
    for (let i = depth; i > 0; i--) {
      const cycle = i % 6;
      if (cycle < 2) ctx.fillStyle = colorOrangeDark;
      else if (cycle < 4) ctx.fillStyle = colorBlueDark;
      else ctx.fillStyle = colorRedDark;
      ctx.fillText('RCM', i, i);
    }

    const textGrad = ctx.createLinearGradient(0, -80, 0, 80);
    textGrad.addColorStop(0, '#fbbf24');
    textGrad.addColorStop(0.3, colorOrange);
    textGrad.addColorStop(0.6, colorBlue);
    textGrad.addColorStop(1, colorRed);
    ctx.fillStyle = textGrad;
    ctx.fillText('RCM', 0, 0);
    ctx.restore();

    // 3. DEALER NAME - Centered on 600
    ctx.font = '900 62px sans-serif';
    ctx.fillStyle = shopNameColor;
    ctx.textAlign = 'center';
    const shopName = (dealer.shop_name || '').toUpperCase();
    wrapText(ctx, shopName, centerX, 320, 1000, 70);

    // Diamond Separator
    ctx.save();
    ctx.translate(centerX, 460);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#E31E24';
    ctx.fillRect(-12, -12, 24, 24);
    ctx.restore();

    // 4. LABEL
    ctx.font = '800 34px sans-serif';
    ctx.fillStyle = '#6B7280';
    ctx.fillText('TOTAL OUTSTANDING DUES', centerX, 520);

    // 5. AMOUNT - Dynamic Scaling
    const amountStr = `₹${numericAmount.toLocaleString('en-IN')}`;
    let fontSize = 160;
    ctx.font = `900 ${fontSize}px sans-serif`;
    while (ctx.measureText(amountStr).width > 1000 && fontSize > 80) {
      fontSize -= 5;
      ctx.font = `900 ${fontSize}px sans-serif`;
    }
    const amountY = 660;
    const amtGrad = ctx.createLinearGradient(centerX - 250, amountY, centerX + 250, amountY);
    amtGrad.addColorStop(0, colorBlue);
    amtGrad.addColorStop(1, colorRed);
    ctx.fillStyle = amtGrad;
    ctx.fillText(amountStr, centerX, amountY);

    // 6. STATUS PILL - Widened
    const pillY = 780;
    const pillWidth = 900;
    const pillHeight = 100;
    const pillX = centerX - pillWidth / 2;
    ctx.shadowBlur = 40;
    ctx.shadowColor = isUrgent ? 'rgba(227, 30, 36, 0.35)' : 'rgba(37, 99, 235, 0.35)';
    ctx.shadowOffsetY = 15;
    const pGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY);
    pGrad.addColorStop(0, pillGradient[0]);
    pGrad.addColorStop(1, pillGradient[1]);
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    if (ctx.roundRect) {
       ctx.roundRect(pillX, pillY, pillWidth, pillHeight, 50);
    } else {
       ctx.rect(pillX, pillY, pillWidth, pillHeight);
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px sans-serif';
    const pillText = isUrgent ? `⚠️ ONLY ${days} DAYS LEFT!` : `PAYMENT PENDING ⏳`;
    ctx.fillText(pillText, centerX, pillY + 62);

    // 7. FOOTER
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = isUrgent ? colorRed : colorBlue;
    ctx.font = 'italic 900 50px serif';
    ctx.fillText(isUrgent ? 'URGENT PAYMENT REQUIRED!' : 'Thanks for business with us!', centerX, 940);
    ctx.font = '85px Arial, sans-serif';
    const footerEmojis = isUrgent ? '🚨   ⏳   ⚠️' : '😊   🤝   ❤️';
    ctx.fillText(footerEmojis, centerX, 1020);

    return canvas.toDataURL('image/png', 1.0);
  } catch (e) {
    console.error("Canvas error:", e);
    return '';
  }
};

// Compatibility for Ledger.tsx
export class ImageGenerator {
  static async generateAlertCard(data: {
    shopName: string,
    amount: string,
    days: number,
    mode: 'Standard' | 'Urgent',
    profileName?: string
  }): Promise<string> {
    return generateReminderImage({ shop_name: data.shopName }, data.amount, data.mode, data.days);
  }
}
