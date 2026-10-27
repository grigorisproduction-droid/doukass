import { OrderItem } from '../types';

interface PrintReportProps {
  orderNum: string;
  customer: string;
  customerPhone: string;
  project: string;
  totalWeight: number;
  totalQuantity: number;
  rows: OrderItem[];
  isOffer: boolean;
  finishes?: { label: string; checked: boolean }[];
}

export function buildReportHtml({
  orderNum,
  customer,
  customerPhone,
  project,
  totalWeight,
  totalQuantity,
  rows,
  isOffer,
  finishes = []
}: PrintReportProps): string {
    const typeLabel = isOffer ? "Προσφορά" : "Παραγγελία";
    const typeLabelGenitiveUpper = isOffer ? "ΠΡΟΣΦΟΡΑΣ" : "ΠΑΡΑΓΓΕΛΙΑΣ";
    const themeColor = isOffer ? "#dc2626" : "#16a34a";      // red-600 for Offer, green-600 for Order
    const themeColorDark = isOffer ? "#991b1b" : "#166534";  // darker shade for accents

    const escapeHtml = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let rowsHtml = "";
    rows.forEach((row, index) => {
        rowsHtml += `
            <tr>
                <td>${index + 1}</td>
                <td>${row.category}</td>
                <td>${row.section}</td>
                <td>${row.thickness ? row.thickness.toLocaleString('el-GR') + ' mm' : '—'}</td>
                <td>${row.dimensions}</td>
                <td style="text-align:right">${row.quantity.toLocaleString('el-GR')}</td>
                <td style="text-align:right">${row.weight.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="font-size:11px; color:#555;">${row.notes ? escapeHtml(row.notes) : ''}</td>
            </tr>`;
    });

    const todayStr = new Date().toLocaleString("el-GR");
    const totalQtyText = totalQuantity.toLocaleString('el-GR');
    const totalWeightText = totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Total length (m) for linear materials, total area (m²) for sheets
    let totalLength = 0;
    let totalArea = 0;
    rows.forEach(row => {
        const lengthMatch = row.dimensions.match(/^L=([\d.,]+)m$/i);
        if (lengthMatch) {
            const len = parseFloat(lengthMatch[1].replace(',', '.'));
            if (!isNaN(len)) totalLength += len * row.quantity;
        }
        const areaMatch = row.dimensions.match(/^([\d.,]+)\s*x\s*([\d.,]+)mm$/i);
        if (areaMatch) {
            const w = parseFloat(areaMatch[1].replace(',', '.'));
            const h = parseFloat(areaMatch[2].replace(',', '.'));
            if (!isNaN(w) && !isNaN(h)) totalArea += (w * h / 1000000) * row.quantity;
        }
    });
    const totalLengthText = totalLength > 0 ? totalLength.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;
    const totalAreaText = totalArea > 0 ? totalArea.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : null;

    const opsTable = `
    <table class="ops-table">
        <thead>
            <tr>
                <th style="width:28px;"></th>
                <th>Εργασία</th>
                <th style="width:120px;">Χρόνος (λεπτά)</th>
            </tr>
        </thead>
        <tbody>
            <tr><td>□</td><td>Πριόνι</td><td></td></tr>
            <tr><td>□</td><td>Στράτζα</td><td></td></tr>
            <tr><td>□</td><td>Laser</td><td></td></tr>
            <tr><td>□</td><td>Plasma</td><td></td></tr>
            <tr><td>□</td><td>Ψαλίδι</td><td></td></tr>
            <tr><td>□</td><td>Κύλινδρος</td><td></td></tr>
            <tr><td>□</td><td>Ηλεκτροσυγκόλληση</td><td></td></tr>
            <tr><td>□</td><td>Ραουλιέρα</td><td></td></tr>
        </tbody>
    </table>`;

    const checkedFinishes = finishes.filter(f => f.checked);
    const finishesHtml = checkedFinishes.length > 0 ? `
  <div class="finishes-row">
    <span class="finishes-label">Επεξεργασία:</span>
    ${checkedFinishes.map(f => `<span class="finish-chip checked">✓ ${escapeHtml(f.label)}</span>`).join('')}
  </div>` : '';

    return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>${typeLabel} ${orderNum} - Report</title>
<style>
 * {
   -webkit-print-color-adjust: exact !important;
   print-color-adjust: exact !important;
   color-adjust: exact !important;
 }
 body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color:#111827; margin:16px; position:relative; }
 h1 { font-size: 16px; margin:0 0 10px; color:#374151; font-weight:600; }
 .doc-banner {
   display:flex;
   justify-content:space-between;
   align-items:center;
   background: ${themeColor};
   color:#ffffff;
   border: 2px solid ${themeColorDark};
   border-radius: 8px;
   padding: 12px 20px;
   margin: 0 0 16px;
 }
 .doc-banner-title {
   font-size: 28px;
   font-weight: 800;
   letter-spacing: 0.5px;
 }
 .doc-banner-number {
   font-size: 18px;
   font-weight: 700;
   background: rgba(255,255,255,0.18);
   padding: 6px 16px;
   border-radius: 6px;
   white-space: nowrap;
 }
 .subtitle { font-size: 11px; color:#6b7280; margin-bottom:12px;}
 .meta { font-size: 12px; margin-bottom:10px;}
 .meta span { display:inline-block; margin-right:20px;}
 .finishes-row { margin-bottom:14px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
 .finishes-row .finishes-label { font-size:12px; font-weight:600; color:#374151; margin-right:4px; }
 .finish-chip {
   display:inline-flex; align-items:center; gap:5px;
   font-size:11px; padding:4px 10px; border-radius:999px;
   border:1.5px solid ${themeColorDark};
   background: ${themeColor};
   color:#ffffff;
   font-weight:700;
 }
 table { width:100%; border-collapse: collapse; margin-top:8px; }
 th, td { border:1px solid #d1d5db; padding:4px 6px; }
 thead { background:#f3f4f6; }
 tfoot td { font-weight:600; }
 .text-right { text-align:right; }
 .section-title { margin-top:16px; font-weight:600; color:${themeColorDark}; border-bottom: 2px solid ${themeColor}; padding-bottom:2px; display:inline-block; }
 .ops-table { width:60%; margin-top:10px; }
 .ops-table th, .ops-table td { font-size:11px; }
 body::before {
   content: "Σ. ΔΟΥΚΑΣ Α.Ε.";
   position: fixed;
   top: 50%;
   left: 50%;
   transform: translate(-50%, -50%) rotate(-25deg);
   font-size: 72px;
   font-weight: 800;
   color: #000000;
   opacity: 0.04;
   white-space: nowrap;
   pointer-events: none;
   z-index: -1;
 }
 .report-footer {
   margin-top: 18px;
   padding-top: 6px;
   border-top: 1px solid #d1d5db;
   font-size: 10px;
   color: #6b7280;
   line-height: 1.4;
   text-align: right;
 }
 @media print {
   body { margin:8mm; }
   .doc-banner, thead, .doc-banner-number {
     -webkit-print-color-adjust: exact !important;
     print-color-adjust: exact !important;
     color-adjust: exact !important;
   }
 }
</style>
</head>
<body>
  <h1>ΔΟΥΚΑΣ Α.Ε.</h1>

  <div class="doc-banner">
    <div class="doc-banner-title">ΔΕΛΤΙΟ ${typeLabelGenitiveUpper}</div>
    <div class="doc-banner-number">Νο. ${orderNum}</div>
  </div>

    <div class="meta">
    <span><strong>Πελάτης:</strong> ${customer || "&nbsp;"}</span>
    <span><strong>Τηλέφωνο:</strong> ${customerPhone || "&nbsp;"}</span>
    <span><strong>Έργο:</strong> ${project || "&nbsp;"}</span>
    <span><strong>Ημερομηνία:</strong> ${todayStr}</span>
  </div>

  ${finishesHtml}

  <div class="section-title">Υλικά</div>
  <table>
    <thead>
      <tr>
        <th>Α/Α</th>
        <th>Κατηγορία</th>
        <th>Διατομή</th>
        <th>Πάχος</th>
        <th>Διαστάσεις</th>
        <th>Ποσότητα</th>
        <th>Βάρος (kg)</th>
        <th>Σημειώσεις</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="8" style="text-align:center; padding:12px;">(Δεν έχουν καταχωρηθεί υλικά)</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="7" class="text-right">Συνολικός αριθμός τεμαχίων:</td>
        <td class="text-right">${totalQtyText}</td>
      </tr>
      ${totalLengthText ? `
      <tr>
        <td colspan="7" class="text-right">Συνολικό μήκος (m):</td>
        <td class="text-right">${totalLengthText}</td>
      </tr>` : ''}
      ${totalAreaText ? `
      <tr>
        <td colspan="7" class="text-right">Συνολικά τετραγωνικά (m²):</td>
        <td class="text-right">${totalAreaText}</td>
      </tr>` : ''}
      <tr>
        <td colspan="7" class="text-right">Συνολικό βάρος (kg):</td>
        <td class="text-right">${totalWeightText}</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">Εργασίες</div>
  ${opsTable}

  <div class="report-footer">
    <div>Σ. ΔΟΥΚΑΣ Α.Ε.</div>
    <div>14 χλμ Δράμας-Καβάλας, Δράμα, ΤΚ 66300</div>
    <div>Τηλ: +30 25210 55519 · e-mail: info@doukas-hellas.gr</div>
  </div>

</body>
</html>`;
}
