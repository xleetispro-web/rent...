/**
 * Compresses an uploaded image file (Aadhaar, PAN, or QR code) into a bounded
 * JPEG Data URL (< 120KB) so it safely complies with Firestore document and rule limits.
 */
export async function compressImageFileToDataUrl(
  file: File,
  maxDimension = 760,
  quality = 0.72
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image format'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates a realistic visual Aadhaar or PAN KYC specimen card on canvas
 * when the user clicks "Use Sample KYC Document" for quick testing.
 */
export function generateSampleDocumentDataUrl(
  docType: 'aadhaar' | 'pan',
  holderName: string,
  docNumber: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

  if (docType === 'aadhaar') {
    // Clean Tricolor header bar + white card
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 640, 400);

    ctx.fillStyle = '#FF9933';
    ctx.fillRect(0, 0, 640, 26);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 26, 640, 12);
    ctx.fillStyle = '#138808';
    ctx.fillRect(0, 38, 640, 22);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('UNIQUE IDENTIFICATION AUTHORITY OF INDIA', 32, 92);

    ctx.fillStyle = '#64748B';
    ctx.font = '14px sans-serif';
    ctx.fillText('Aadhaar KYC Verification Specimen — Rentmojo', 32, 118);

    // Photo box
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(32, 145, 120, 145);
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('KYC PHOTO', 52, 220);

    // Details
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`Name: ${holderName || 'Customer Name'}`, 176, 175);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('DOB: 14 / 08 / 1996', 176, 208);
    ctx.fillText('Status: Verified Digital KYC Copy', 176, 238);

    // Formatted 12-digit Aadhaar
    const cleanAadhaar = (docNumber || '482910384756').replace(/\D/g, '').padEnd(12, '0').slice(0, 12);
    const formattedAadhaar = `${cleanAadhaar.slice(0, 4)} ${cleanAadhaar.slice(4, 8)} ${cleanAadhaar.slice(8, 12)}`;
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(formattedAadhaar, 160, 345);

    ctx.strokeStyle = '#DF2927';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 365, 616, 2);
  } else {
    // Income Tax PAN Card specimen style
    ctx.fillStyle = '#EFF6FF';
    ctx.fillRect(0, 0, 640, 400);

    ctx.fillStyle = '#1E3A8A';
    ctx.fillRect(0, 0, 640, 64);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('INCOME TAX DEPARTMENT — GOVT. OF INDIA', 32, 40);

    ctx.fillStyle = '#1E293B';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('Permanent Account Number (PAN) Card — KYC Copy', 32, 105);

    ctx.fillStyle = '#DBEAFE';
    ctx.fillRect(32, 135, 115, 135);
    ctx.fillStyle = '#1E40AF';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('PAN HOLDER', 48, 205);

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`Name: ${(holderName || 'CUSTOMER NAME').toUpperCase()}`, 172, 165);

    const cleanPan = (docNumber || 'ABCDE1234F').toUpperCase().slice(0, 10);
    ctx.fillStyle = '#B91C1C';
    ctx.font = 'bold 28px monospace';
    ctx.fillText(cleanPan, 172, 225);

    ctx.fillStyle = '#475569';
    ctx.font = '14px sans-serif';
    ctx.fillText('Digitally Signed & Uploaded for Rentmojo Rental KYC', 172, 265);
  }

  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * Generates a deterministic 21x21 QR-like visual matrix from a UPI URI string
 * so the customer always sees a crisp UPI Scanner even if no custom image was uploaded.
 */
export function generateDeterministicQrMatrix(seedText: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTopLeft = r < 8 && c < 8;
      const inTopRight = r < 8 && c >= size - 8;
      const inBottomLeft = r >= size - 8 && c < 8;
      if (inTopLeft || inTopRight || inBottomLeft || r === 6 || c === 6) continue;
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (Math.abs(hash) % 10) < 5;
    }
  }

  return grid;
}

/**
 * Generates a realistic UPI / Bank Transfer Payment Receipt Screenshot specimen
 * for quick one-click testing alongside real screenshot file uploads.
 */
export function generateSamplePaymentScreenshotDataUrl(
  payerName: string,
  amountInr: number,
  utrNumber: string,
  upiId: string
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 560;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 560, 420);

  // Header Banner
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 560, 72);

  ctx.fillStyle = '#1DB2A6';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('UPI / IMPS PAYMENT SUCCESSFUL RECEIPT', 28, 44);

  // White Card Inside
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(24, 92, 512, 300);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 92, 512, 300);

  ctx.fillStyle = '#64748B';
  ctx.font = '14px sans-serif';
  ctx.fillText('Paid To Merchant', 48, 130);
  ctx.fillStyle = '#0F172A';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`Rentmojo Smart Rentals (${upiId})`, 48, 155);

  ctx.fillStyle = '#16A34A';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(`₹${amountInr.toLocaleString('en-IN')}.00`, 48, 210);

  ctx.fillStyle = '#334155';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`UTR / Ref No: ${utrNumber || '431982746109'}`, 48, 255);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText(`Paid By: ${payerName || 'Customer'}`, 48, 290);
  ctx.fillText(`Timestamp: ${new Date().toLocaleString('en-IN')}`, 48, 320);
  ctx.fillStyle = '#DF2927';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('VERIFIED SCREENSHOT SPECIMEN — RENTMOJO CHECKOUT', 48, 360);

  return canvas.toDataURL('image/jpeg', 0.8);
}

