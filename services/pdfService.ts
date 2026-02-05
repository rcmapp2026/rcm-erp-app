
import { CompanyProfile, Dealer, Order, LedgerEntry, Product } from '../types';

/**
 * --- FORMATTING HELPERS ---
 */
export const formatMoney = (val: number) => Math.round((val + Number.EPSILON) * 100) / 100;
export const toINR = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * --- PDF TEMPLATES ENGINE ---
 */
export const PdfTemplates = {
  wrapHtml: (html: string) => `
    <div id="pdf-rendering-root" style="width: 210mm; background: #fff; margin: 0 auto; padding: 0; box-sizing: border-box; overflow: hidden; display: block; position: relative;">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Playfair+Display:ital,wght@0,700;0,900;1,700&display=swap');

        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          margin: 0; padding: 0;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
        }

        #pdf-rendering-root {
          background: #fff;
          margin: 0 auto;
          padding: 0;
          width: 210mm;
          font-family: 'Inter', sans-serif;
          color: #000;
          line-height: 1.3;
        }

        .pdf-page {
          width: 210mm;
          min-height: 296mm;
          padding: 12mm 10mm;
          position: relative;
          box-sizing: border-box;
          background: #fff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          page-break-after: always;
        }

        .pdf-page:last-child {
          page-break-after: avoid !important;
        }

        .summary-box, .cert-container, header, table {
          page-break-inside: avoid !important;
        }

        table {
          width: 100% !important;
          border-collapse: collapse;
          table-layout: fixed;
          border: 1.5px solid #CDA434;
          margin-bottom: 5px;
        }

        th {
          background-color: #CDA434 !important;
          color: #fff !important;
          font-weight: 900 !important;
          text-transform: uppercase;
          font-size: 9px;
          padding: 9px 7px;
          border: 1px solid #CDA434;
          text-align: center;
        }

        td {
          border: 1px solid #CDA434;
          padding: 7px 9px;
          font-size: 9px;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
          color: #000;
          font-weight: 700;
        }

        .rcm-logo { font-size: 44px; font-weight: 900; letter-spacing: 2px; line-height: 1; }
        .rcm-r { color: #F4B63A; }
        .rcm-c { color: #2F80ED; }
        .rcm-m { color: #4F4F4F; }

        .title-3d {
          font-size: 38px;
          font-weight: 900;
          color: #F97316;
          text-transform: uppercase;
          letter-spacing: 6px;
          text-shadow:
            1px 1px 0px #2563EB,
            2px 2px 0px #2563EB,
            3px 3px 0px rgba(0,0,0,0.1);
        }

        .variant-table th {
            background: #f8fafc !important;
            color: #64748b !important;
            border: 1px solid #e2e8f0;
            font-size: 7px;
            padding: 3px;
        }
        .variant-table td {
            border: 1px solid #e2e8f0;
            padding: 4px;
            font-weight: 900;
            text-align: center;
            vertical-align: middle !important;
        }

        .verified-stamp {
          position: absolute;
          right: 35px;
          top: 50%;
          transform: translateY(-50%) rotate(-12deg);
          border: 4px double #059669;
          color: #059669;
          padding: 8px 15px;
          font-weight: 900;
          border-radius: 8px;
          text-transform: uppercase;
          opacity: 0.85;
          font-size: 12px;
          text-align: center;
          line-height: 1.2;
          pointer-events: none;
          background: rgba(255,255,255,0.8);
          z-index: 10;
        }
      </style>
      <div class="pdf-body-wrapper">
        ${html}
      </div>
    </div>
  `,

  generateCertificateHtml: (dealer: Dealer) => `
    <div class="pdf-page" style="min-height: 297mm; height: 297mm; overflow: hidden; padding: 0; page-break-after: avoid !important; margin: 0;">
      <div class="cert-container" style="width: 210mm; height: 297mm; border: 15px solid #000; outline: 3px solid #CDA434; outline-offset: -25px; padding: 25px; box-sizing: border-box; background: #fff; display: flex; flex-direction: column; align-items: center; position: relative;">
        <div style="width: 100%; height: 100%; border: 2px solid #CDA434; padding: 40px 40px; display: flex; flex-direction: column; align-items: center; position: relative; overflow: hidden;">
          <div style="text-align: center; margin-bottom: 20px;">
             <div class="rcm-logo" style="font-size: 40px;"><span class="rcm-r">R</span><span class="rcm-c">C</span><span class="rcm-m">M</span></div>
             <div class="title-3d" style="margin-top: 10px; font-size: 34px;">R.C.M. HARDWARE</div>
          </div>
          <div style="font-family: 'Playfair Display', serif; font-size: 38px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: 4px; margin: 15px 0; text-align: center;">Certificate of Dealership</div>
          <p style="font-size: 13px; font-weight: 900; color: #666; margin-top: 10px; text-transform: uppercase; text-align: center;">This official document certifies that</p>

          <div style="width: 90%; border-bottom: 6px double #CDA434; margin: 15px 0; padding-bottom: 5px; text-align: center;">
             <h2 style="font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 900; color: #2563EB; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0;">${dealer.shop_name}</h2>
          </div>

          <p style="font-size: 11px; font-weight: 900; color: #444; margin-bottom: 30px; font-style: italic; text-align: center; max-width: 550px; line-height: 1.6;">Is officially registered and authorized to represent, distribute, and serve as a business hub for R.C.M. Hardware products.</p>

          <div style="width: 100%; max-width: 650px; border: 2.5px solid #CDA434; padding: 35px 40px 25px 40px; position: relative; background: #fff;">
             <div class="verified-stamp">VERIFIED BY<br/>RCM HARDWARE</div>
             <div style="display: flex; flex-direction: column; gap: 12px; width: 85%;">
                <div style="display: flex; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px; align-items: baseline;">
                   <span style="width: 140px; font-size: 10px; font-weight: 900; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;">Shop Name</span>
                   <span style="font-weight: 900; font-size: 13px; color: #0F172A; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${dealer.shop_name}</span>
                </div>
                <div style="display: flex; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px; align-items: baseline;">
                   <span style="width: 140px; font-size: 10px; font-weight: 900; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;">Proprietor</span>
                   <span style="font-weight: 900; font-size: 13px; color: #0F172A; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${dealer.owner_name}</span>
                </div>
                <div style="display: flex; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px; align-items: baseline;">
                   <span style="width: 140px; font-size: 10px; font-weight: 900; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;">Mobile</span>
                   <span style="font-weight: 900; font-size: 13px; color: #0F172A; white-space: nowrap; flex: 1;">+91 ${dealer.mobile}</span>
                </div>
                <div style="display: flex; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px; align-items: baseline;">
                   <span style="width: 140px; font-size: 10px; font-weight: 900; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;">City</span>
                   <span style="font-weight: 900; font-size: 13px; color: #0F172A; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${dealer.city || 'N/A'}</span>
                </div>
                <div style="display: flex; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px; align-items: baseline;">
                   <span style="width: 140px; font-size: 10px; font-weight: 900; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;">Registry No.</span>
                   <span style="font-weight: 900; font-size: 13px; color: #0F172A; white-space: nowrap; flex: 1;">${dealer.dealer_code || 'REG-PENDING'}</span>
                </div>
                <div style="display: flex; border-bottom: 1.5px solid #F1F5F9; padding-bottom: 6px; align-items: baseline;">
                   <span style="width: 140px; font-size: 10px; font-weight: 900; color: #94A3B8; text-transform: uppercase; flex-shrink: 0;">Registered Address</span>
                   <span style="font-weight: 900; font-size: 11px; color: #0F172A; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${dealer.address}, ${dealer.city} - ${dealer.pincode}</span>
                </div>
             </div>
          </div>
          <div style="width: 100%; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px; padding-bottom: 20px;">
             <div style="font-size: 11px; font-weight: 900; color: #000;">ISSUED: ${new Date().toLocaleDateString('en-GB')}</div>
             <div style="text-align: center;">
                <div style="width: 200px; border-bottom: 3px solid #CDA434; margin-bottom: 10px;"></div>
                <div style="font-size: 12px; font-weight: 900; text-transform: uppercase;">Authorized Signatory</div>
             </div>
          </div>
        </div>
      </div>
    </div>`,

  generateProductReportHtml: (products: Product[], assetType: 'Hardware' | 'RCM') => {
    const itemsPerPage = 8;
    const pagesCount = Math.ceil(products.length / itemsPerPage);
    let htmlContent = '';
    let sn = 1;
    const isRCM = assetType === 'RCM';

    const baseDetailWidth = isRCM ? 344 : 440;
    const detailColWidth = (baseDetailWidth - 67) + 'px';

    for (let p = 0; p < pagesCount; p++) {
      const currentProducts = products.slice(p * itemsPerPage, (p + 1) * itemsPerPage);
      const rowsHtml = currentProducts.map((prod) => {
        const variantsRows = (prod.product_variants || []).map(v => {
          const discount = v.mrp > 0 ? Math.round(((v.mrp - v.final_price) / v.mrp) * 100) : 0;
          if (isRCM) {
            return `<tr>
              <td style="text-align: center; font-size: 9px; font-weight: 900;">${v.size}</td>
              <td style="text-align: right; color: #ef4444; font-size: 9px; font-weight: 900; width: 30%;">₹${toINR(v.mrp)}</td>
              <td style="text-align: center; color: #3b82f6; font-size: 9px; font-weight: 900; width: 15%;">${discount}%</td>
              <td style="text-align: right; color: #22c55e; font-size: 10px; font-weight: 900; width: 30%;">₹${toINR(v.final_price)}</td>
            </tr>`;
          } else {
            return `<tr>
              <td style="text-align: center; font-size: 9px; font-weight: 900;">${v.size}</td>
              <td style="text-align: right; color: #ef4444; font-size: 9px; font-weight: 900; width: 35%;">₹${toINR(v.mrp)}</td>
              <td style="text-align: right; color: #22c55e; font-size: 10px; font-weight: 900; width: 35%;">₹${toINR(v.final_price)}</td>
            </tr>`;
          }
        }).join('');

        return `<tr>
          <td style="width: 40px; text-align: center; font-weight: 900;">${sn++}</td>
          <td style="padding: 10px; width: ${detailColWidth};">
            <div style="display: flex; gap: 15px; align-items: center;">
              <img src="${prod.image_url}" style="width: 75px; height: 75px; object-fit: cover; border: 1.5px solid #CDA434; border-radius: 6px;" />
              <div style="flex: 1; overflow: hidden;">
                <div style="font-weight: 900; font-size: 11px; text-transform: uppercase; color: #000; margin-bottom: 2px;">${prod.name}</div>
                <div style="font-size: 9px; color: #334155; font-weight: 900; text-transform: uppercase;">SKU: ${prod.sku}</div>
                <div style="font-size: 9px; color: #64748b; font-weight: 900; margin-top: 1px; text-transform: uppercase;">BRAND: ${prod.company_name || 'RCM'}</div>
              </div>
            </div>
          </td>
          <td style="padding: 0; vertical-align: middle;">
            <table class="variant-table" style="width: 100%; border: none;">
              <thead>
                <tr>
                  <th style="text-align: center;">SIZE</th>
                  <th style="text-align: right;">MRP</th>
                  ${isRCM ? '<th style="text-align: center;">DISC</th>' : ''}
                  <th style="text-align: right;">FINAL RATE</th>
                </tr>
              </thead>
              <tbody>${variantsRows}</tbody>
            </table>
          </td>
        </tr>`;
      }).join('');

      htmlContent += `
        <div class="pdf-page">
          <header style="text-align: center; margin-bottom: 15px; border-bottom: 3px solid #CDA434; padding-bottom: 10px;">
             <div class="rcm-logo"><span class="rcm-r">R</span><span class="rcm-c">C</span><span class="rcm-m">M</span></div>
             <h2 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin-top: 5px; color: #000;">${assetType} STOCK REGISTRY</h2>
             <p style="font-size: 8px; font-weight: 900; color: #64748b; margin-top: 2px;">OFFICIAL INVENTORY LOG | PAGE ${p + 1} OF ${pagesCount}</p>
          </header>
          <table>
            <thead>
              <tr>
                <th style="width: 40px;">SN</th>
                <th style="text-align: left; padding-left: 10px; width: ${detailColWidth};">PRODUCT ASSET DETAILS</th>
                <th>VARIANT PRICING STRUCTURE</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>`;
    }
    return htmlContent;
  },

  generateInvoiceHtml: (order: Order, items: any[], profile: CompanyProfile) => {
     const itemsPerPage = 14;
     const pagesCount = Math.ceil(items.length / itemsPerPage);
     let htmlContent = '';

     for (let p = 0; p < pagesCount; p++) {
       const isLastPage = (p === pagesCount - 1);
       const startIdx = p * itemsPerPage;
       const currentItems = items.slice(startIdx, startIdx + itemsPerPage);

       const rowsHtml = currentItems.map((i, idx) => `
         <tr>
           <td style="width: 45px; text-align: center; font-weight: 900;">${startIdx + idx + 1}</td>
           <td style="padding-left: 15px;">
             <div style="font-weight: 900; font-size: 10px; text-transform: uppercase;">${i.product_name}</div>
             <div style="font-size: 7px; color: #666; font-weight: 900; margin-top: 2px;">BRAND: ${i.company_name || 'RCM'}</div>
           </td>
           <td style="width: 84px; text-align: center; font-weight: 900; font-size: 9px;">${i.variant_info || i.size || 'N/A'}</td>
           <td style="width: 75px; text-align: center; font-weight: 900;">
             <span style="font-size: 10px; font-weight: 900;">${i.quantity}</span> <span style="font-size: 7px; color: #999; font-weight: 900;">${i.unit || 'PCS'}</span>
           </td>
           <td style="width: 95px; text-align: right; font-weight: 900; font-size: 9px;">₹${toINR(Number(i.rate))}</td>
           <td style="width: 110px; text-align: right; font-weight: 900; font-size: 9px;">₹${toINR(Number(i.amount))}</td>
         </tr>`).join('');

       const upiLink = `upi://pay?pa=${profile.upi_id}&pn=${encodeURIComponent(profile.name)}&am=${Number(order.final_total).toFixed(2)}&cu=INR&mode=02`;
       const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(upiLink)}`;

       htmlContent += `
         <div class="pdf-page">
           <header style="margin-bottom: 20px;">
             <div style="border: 2.5px solid #CDA434; padding: 15px; display: flex; justify-content: space-between; align-items: center; background: #fff; margin-bottom: 15px;">
                <div>
                   <div class="rcm-logo"><span class="rcm-r">R</span><span class="rcm-c">C</span><span class="rcm-m">M</span></div>
                   <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; margin-top: 5px; color: #000;">RCM HARDWARE</div>
                </div>
                <div style="text-align: right;">
                   <h2 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0; color: #000;">DEALER INVOICE</h2>
                   <p style="font-size: 9px; font-weight: 900; margin-top: 5px;">PAGE ${p + 1} OF ${pagesCount}</p>
                   <p style="font-size: 9px; font-weight: 900;">ORD NO: #${order.order_no}</p>
                </div>
             </div>
             <div style="display: flex; gap: 15px;">
                <div style="flex: 1; border: 1.5px solid #CDA434; padding: 12px;">
                   <p style="font-weight: 900; color: #CDA434; font-size: 8px; text-transform: uppercase; margin-bottom: 4px;">FROM:</p>
                   <p style="font-weight: 900; font-size: 10px;">${profile.name}</p>
                   <p style="font-size: 8px; font-weight: 900;">${profile.address}</p>
                   <p style="font-size: 8px; font-weight: 900; margin-top: 2px;">MOB: ${profile.mobile}</p>
                   <p style="font-size: 8px; font-weight: 900; margin-top: 4px; color: #2563EB;">EMAIL: rcmhardware@gmail.com</p>
                </div>
                <div style="flex: 1; border: 1.5px solid #CDA434; padding: 12px;">
                   <p style="font-weight: 900; color: #CDA434; font-size: 8px; text-transform: uppercase; margin-bottom: 4px;">TO DEALER:</p>
                   <p style="font-weight: 900; font-size: 10px; text-transform: uppercase;">${order.dealers?.shop_name || 'N/A'}</p>
                   <p style="font-size: 8px; font-weight: 900; margin-top: 4px;">NAME: ${order.dealers?.owner_name || 'N/A'}</p>
                   <p style="font-size: 8px; font-weight: 900;">CODE: ${order.dealers?.dealer_code || 'N/A'}</p>
                   <p style="font-size: 8px; font-weight: 900;">MOB: +91 ${order.dealers?.mobile || 'N/A'}</p>
                   <p style="font-size: 8px; font-weight: 900; margin-top: 4px; line-height: 1.2;">ADD: ${order.dealers?.address || 'N/A'}, ${order.dealers?.city || ''}</p>
                </div>
             </div>
           </header>

           <div style="flex: 1;">
             <table>
               <thead>
                 <tr>
                   <th style="width: 45px;">SN</th>
                   <th style="text-align: left; padding-left: 15px;">INVENTORY DESCRIPTION</th>
                   <th style="width: 84px;">SIZE</th>
                   <th style="width: 75px;">QTY</th>
                   <th style="width: 95px;">RATE</th>
                   <th style="width: 110px;">TOTAL</th>
                 </tr>
               </thead>
               <tbody>${rowsHtml}</tbody>
             </table>

             ${isLastPage ? `
               <div class="summary-box" style="margin-top: 15px; display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                 <div style="width: 35%; border: 2.5px solid #CDA434; padding: 15px; text-align: center;">
                    <img src="${qrUrl}" style="width: 100px; height: 100px; display: block; margin: 0 auto;" />
                    <p style="font-size: 8px; font-weight: 900; margin-top: 8px;">SCAN TO PAY: ₹${toINR(Number(order.final_total))}</p>
                 </div>
                 <div style="width: 60%; border: 3px solid #CDA434; padding: 15px;">
                    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; margin-bottom: 4px;"><span>SUBTOTAL:</span><span>₹${toINR(Number(order.subtotal))}</span></div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; margin-bottom: 4px;"><span>TRANSPORT (+):</span><span>₹${toINR(Number(order.transport_charges))}</span></div>
                    <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; margin-bottom: 8px;"><span>DISCOUNT (-):</span><span>₹${toINR(Number(order.discount))}</span></div>
                    <div style="display: flex; justify-content: space-between; border-top: 3px solid #CDA434; padding-top: 8px;">
                       <span style="font-weight: 900; font-size: 13px; color: #DC2626;">NET PAYABLE:</span>
                       <span style="font-weight: 900; font-size: 18px; color: #DC2626;">₹${toINR(Number(order.final_total))}</span>
                    </div>
                 </div>
               </div>
             ` : `<div style="margin-top: 10px; text-align: right; font-weight: 900; color: #999; font-size: 9px; font-style: italic;">Continued on next page...</div>`}
           </div>

           <footer style="margin-top: auto; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
              <p style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase;">Computer Generated Invoice | Authorized Signature Not Required</p>
           </footer>
         </div>`;
     }
     return htmlContent;
   },


  generateLedgerHtml: (dealer: Dealer, logs: LedgerEntry[], openingBal: number, profile: CompanyProfile, fromDate: string, toDate: string) => {
    const itemsPerPage = 17; // Reduced to prevent blank pages
    const allRows: any[] = [];
    let rb = openingBal;
    let tDebit = 0;
    let tCredit = 0;

    allRows.push({ sn: 1, date: 'START', desc: 'OPENING BALANCE', debit: '-', credit: '-', bal: rb, isOpening: true });

    logs.forEach((l, idx) => {
      const amt = Number(l.amount);
      if (l.type === 'DEBIT') { rb = formatMoney(rb + amt); tDebit = formatMoney(tDebit + amt); }
      else { rb = formatMoney(rb - amt); tCredit = formatMoney(tCredit + amt); }
      allRows.push({
        sn: idx + 2,
        date: new Date(l.date).toLocaleDateString('en-GB'),
        desc: l.narration || 'HUB SYNC',
        debit: l.type === 'DEBIT' ? '₹' + toINR(amt) : '-',
        credit: l.type === 'CREDIT' ? '₹' + toINR(amt) : '-',
        bal: '₹' + toINR(rb),
        type: l.type
      });
    });

    const pagesCount = Math.ceil(allRows.length / itemsPerPage);
    let htmlContent = '';

    for (let p = 0; p < pagesCount; p++) {
      const isLastPage = (p === pagesCount - 1);
      const rowsHtml = allRows.slice(p * itemsPerPage, (p + 1) * itemsPerPage).map(r => `
        <tr style="${r.isOpening ? 'background: #fdfae6;' : ''}">
          <td style="width: 35px; text-align: center; font-weight: 900;">${r.sn}</td>
          <td style="width: 80px; text-align: center;">${r.date}</td>
          <td style="font-weight: 900; padding-left: 10px;">${r.desc}</td>
          <td style="width: 105px; text-align: right; color: ${r.type === 'DEBIT' ? '#DC2626' : '#000'}; font-weight: 900;">${r.debit}</td>
          <td style="width: 105px; text-align: right; color: ${r.type === 'CREDIT' ? '#059669' : '#000'}; font-weight: 900;">${r.credit}</td>
          <td style="width: 120px; text-align: right; font-weight: 900;">${r.bal}</td>
        </tr>`).join('');

      htmlContent += `
        <div class="pdf-page">
          <header style="margin-bottom: 20px;">
            <div style="border: 2.5px solid #CDA434; padding: 15px; text-align: center; background: #fff; margin-bottom: 15px;">
              <div class="rcm-logo"><span class="rcm-r">R</span><span class="rcm-c">C</span><span class="rcm-m">M</span></div>
              <h2 style="font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 10px 0;">LEDGER ACCOUNT STATEMENT</h2>
              <p style="font-size: 11px; font-weight: 900; border: 1px solid #CDA434; display: inline-block; padding: 4px 15px;">${fromDate} — ${toDate}</p>
            </div>
            <div style="border: 1.5px solid #CDA434; padding: 12px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p style="font-weight: 900; color: #CDA434; font-size: 9px; text-transform: uppercase;">DEALER INFO:</p>
                <p style="font-weight: 900; font-size: 12px;">${dealer.shop_name}</p>
                <p style="font-size: 10px; font-weight: 900;">Code: ${dealer.dealer_code} | Mob: ${dealer.mobile}</p>
              </div>
              <div style="text-align: right;">
                 <p style="font-size: 9px; font-weight: 900; color: #64748b;">PAGE ${p + 1} OF ${pagesCount}</p>
              </div>
            </div>
          </header>

          <div style="flex: 1;">
            <table>
              <thead><tr><th style="width: 35px;">#</th><th style="width: 80px;">DATE</th><th style="text-align: left; padding-left: 10px;">DESCRIPTION</th><th style="width: 105px;">DEBIT(-)</th><th style="width: 105px;">CREDIT(+)</th><th style="width: 120px;">BALANCE</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            ${isLastPage ? `
              <div style="margin-top: 15px; border: 3px solid #CDA434; padding: 15px; display: flex; justify-content: space-between; background: #fdfae6; page-break-inside: avoid;">
                <div style="text-align: center; flex: 1;"><div style="font-size: 10px; font-weight: 900; color: #DC2626; text-transform: uppercase;">DR TOTAL</div><div style="font-size: 12px; font-weight: 900;">₹${toINR(tDebit)}</div></div>
                <div style="text-align: center; flex: 1; border-left: 1.5px solid #CDA434; border-right: 1.5px solid #CDA434;"><div style="font-size: 10px; font-weight: 900; color: #059669; text-transform: uppercase;">CR TOTAL</div><div style="font-size: 12px; font-weight: 900;">₹${toINR(tCredit)}</div></div>
                <div style="text-align: center; flex: 1;"><div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #1E40AF;">NET OUTSTANDING</div><div style="font-size: 18px; font-weight: 900; color: #1E40AF;">₹${toINR(Number(rb))}</div></div>
              </div>
            ` : ``}
          </div>

          <footer style="margin-top: auto; padding-top: 15px; border-top: 1px solid #eee; text-align: center;">
             <p style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase;">This is a system generated statement | Official Business Record</p>
          </footer>
        </div>`;
    }
    return htmlContent;
  },
};
