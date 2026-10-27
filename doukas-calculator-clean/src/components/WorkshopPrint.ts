import { OrderItem } from '../types';
import { planCuts } from '../utils/cutting';

interface WorkshopReportProps {
  orderNum: string;
  project: string;
  rows: OrderItem[];
  isOffer: boolean;
  finishes?: { label: string; checked: boolean }[];
  defaultStockLength?: number; // mm, used for the automatic per-material cut suggestions
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildWorkshopHtml({
  orderNum,
  project,
  rows,
  isOffer,
  finishes = [],
  defaultStockLength = 6000
}: WorkshopReportProps): string {
  const themeColor = isOffer ? '#dc2626' : '#16a34a';
  const themeColorDark = isOffer ? '#991b1b' : '#166534';
  const todayStr = new Date().toLocaleString('el-GR');

  const rowsHtml = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.category)}</td>
      <td>${escapeHtml(row.section)}</td>
      <td>${row.thickness ? row.thickness.toLocaleString('el-GR') + ' mm' : '—'}</td>
      <td>${escapeHtml(row.dimensions)}</td>
      <td class="text-right">${row.quantity.toLocaleString('el-GR')}</td>
      <td style="font-size:12px; color:#555;">${row.notes ? escapeHtml(row.notes) : ''}</td>
    </tr>`).join('');

  const checkedFinishes = finishes.filter(f => f.checked);
  const finishesHtml = checkedFinishes.length > 0 ? `
  <div class="finishes-row">
    <span class="finishes-label">Επεξεργασία:</span>
    ${checkedFinishes.map(f => `<span class="finish-chip">✓ ${escapeHtml(f.label)}</span>`).join('')}
  </div>` : '';

  // Auto cut suggestions: group linear rows by (category, section, thickness) and run the nesting engine
  const groups = new Map<string, { label: string; pieces: { length: number; qty: number }[] }>();
  rows.forEach(row => {
    const m = row.dimensions.match(/^L=([\d.,]+)m$/i);
    if (!m) return;
    const lenMm = Math.round(parseFloat(m[1].replace(',', '.')) * 1000);
    if (!lenMm || lenMm <= 0) return;
    const key = `${row.category}|${row.section}|${row.thickness ?? ''}`;
    const label = `${row.category} — ${row.section}${row.thickness ? ` (t=${row.thickness}mm)` : ''}`;
    if (!groups.has(key)) groups.set(key, { label, pieces: [] });
    groups.get(key)!.pieces.push({ length: lenMm, qty: row.quantity });
  });

  let cutSectionsHtml = '';
  groups.forEach(g => {
    const plan = planCuts(g.pieces, defaultStockLength, 3);
    if (plan.totalBars === 0) return;
    const groupRows = plan.groups.map(gr => `
      <tr>
        <td class="text-right">${gr.count}×</td>
        <td>${gr.pattern.map(l => `${l}mm`).join(' + ')}</td>
        <td class="text-right">${gr.waste}mm</td>
      </tr>`).join('');
    const warn = plan.tooLong.length > 0
      ? `<div style="color:#b91c1c; font-size:13px; margin:4px 0;">⚠️ Δεν χωράνε σε ράβδο ${defaultStockLength}mm: ${plan.tooLong.map(l => `${l}mm`).join(', ')}</div>`
      : '';
    cutSectionsHtml += `
    <div class="cut-group">
      <div class="cut-group-title">${escapeHtml(g.label)} — ${plan.totalBars} ράβδοι (${plan.wastePercent.toFixed(0)}% φύρα)</div>
      ${warn}
      <table>
        <thead><tr><th style="width:70px;">Ράβδοι</th><th>Κομμάτια ανά ράβδο</th><th style="width:110px;">Φύρα</th></tr></thead>
        <tbody>${groupRows}</tbody>
      </table>
    </div>`;
  });

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>Δελτίο Εργαστηρίου ${orderNum} - Report</title>
<style>
 * {
   -webkit-print-color-adjust: exact !important;
   print-color-adjust: exact !important;
   color-adjust: exact !important;
 }
 body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 15px; color:#111827; margin:16px; position:relative; }
 h1 { font-size: 18px; margin:0 0 10px; color:#374151; font-weight:700; }
 .doc-banner { display:flex; justify-content:space-between; align-items:center; background:${themeColor}; color:#fff; border:2px solid ${themeColorDark}; border-radius:8px; padding:14px 22px; margin:0 0 16px; }
 .doc-banner-title { font-size:34px; font-weight:800; letter-spacing:0.5px; }
 .doc-banner-number { font-size:22px; font-weight:700; background:rgba(255,255,255,0.18); padding:8px 18px; border-radius:6px; white-space:nowrap; }
 .meta { font-size:15px; margin-bottom:14px; font-weight:600; }
 .meta span { display:inline-block; margin-right:26px; }
 .finishes-row { margin-bottom:16px; display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
 .finishes-row .finishes-label { font-size:14px; font-weight:700; color:#374151; margin-right:4px; }
 .finish-chip { display:inline-flex; align-items:center; gap:5px; font-size:13px; padding:5px 12px; border-radius:999px; border:1.5px solid ${themeColorDark}; background:${themeColor}; color:#fff; font-weight:700; }
 table { width:100%; border-collapse:collapse; margin-top:8px; }
 th, td { border:1px solid #9ca3af; padding:8px 10px; font-size:15px; }
 thead { background:#e5e7eb; font-size:14px; }
 .text-right { text-align:right; }
 .section-title { margin-top:22px; font-weight:800; font-size:17px; color:${themeColorDark}; border-bottom:3px solid ${themeColor}; padding-bottom:3px; display:inline-block; }
 .ops-table td, .ops-table th { font-size:14px; }
 .cut-group { margin-top:14px; }
 .cut-group-title { font-weight:700; font-size:14px; color:#374151; margin-bottom:4px; }
 .cut-group table th, .cut-group table td { font-size:13px; padding:5px 8px; }
 body::before {
   content: "Σ. ΔΟΥΚΑΣ Α.Ε.";
   position: fixed; top: 50%; left: 50%;
   transform: translate(-50%, -50%) rotate(-25deg);
   font-size: 90px; font-weight: 800; color: #000000; opacity: 0.04;
   white-space: nowrap; pointer-events: none; z-index: -1;
 }
 @media print { body { margin:8mm; } }
</style>
</head>
<body>
  <h1>ΔΟΥΚΑΣ Α.Ε. — ΕΡΓΑΣΤΗΡΙΟ</h1>

  <div class="doc-banner">
    <div class="doc-banner-title">ΔΕΛΤΙΟ ΕΡΓΑΣΤΗΡΙΟΥ</div>
    <div class="doc-banner-number">Νο. ${orderNum}</div>
  </div>

  <div class="meta">
    <span><strong>Έργο:</strong> ${project || '—'}</span>
    <span><strong>Τύπος:</strong> ${isOffer ? 'Προσφορά' : 'Παραγγελία'}</span>
    <span><strong>Ημερομηνία:</strong> ${todayStr}</span>
  </div>

  ${finishesHtml}

  <div class="section-title">Υλικά</div>
  <table>
    <thead>
      <tr>
        <th>Α/Α</th><th>Κατηγορία</th><th>Διατομή</th><th>Πάχος</th><th>Διαστάσεις</th><th>Ποσότητα</th><th>Σημειώσεις</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding:14px;">(Δεν έχουν καταχωρηθεί υλικά)</td></tr>'}
    </tbody>
  </table>

  ${cutSectionsHtml ? `<div class="section-title">Σχέδιο Κοπής (ράβδοι ${defaultStockLength}mm)</div>${cutSectionsHtml}` : ''}

  <div class="section-title">Εργασίες</div>
  <table class="ops-table" style="width:70%;">
    <thead><tr><th style="width:32px;"></th><th>Εργασία</th><th style="width:140px;">Χρόνος (λεπτά)</th></tr></thead>
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
  </table>

</body>
</html>`;
}
