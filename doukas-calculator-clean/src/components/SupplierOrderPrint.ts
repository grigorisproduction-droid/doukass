export interface SupplierOrderLine {
  id: string;
  category: string;    // e.g. "Λαμαρίνα Μαύρη", "Σωλήνα Γαλβανιζέ", "IPE"
  size: string;         // e.g. "2 x 1 m", "Φ 42,4", "IPE 200"
  thickness: string;    // e.g. "3mm" or "" if not applicable
  quantity: number;
  unit: string;         // "τεμ."
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const themeColor = "#ea580c";      // orange-600
const themeColorDark = "#9a3412";  // orange-800

export function buildSupplierOrderHtml(lines: SupplierOrderLine[]): string {
  const todayStr = new Date().toLocaleString("el-GR");

  // Group lines by category for a cleaner printed layout
  const grouped = new Map<string, SupplierOrderLine[]>();
  lines.forEach(line => {
    if (!grouped.has(line.category)) grouped.set(line.category, []);
    grouped.get(line.category)!.push(line);
  });

  let sectionsHtml = "";
  grouped.forEach((groupLines, category) => {
    sectionsHtml += `<div class="section-title">${escapeHtml(category)}</div>
    <table>
      <thead>
        <tr>
          <th>Μέγεθος / Διατομή</th>
          <th>Πάχος</th>
          <th style="width:100px;">Ποσότητα</th>
        </tr>
      </thead>
      <tbody>
        ${groupLines.map(l => `
        <tr>
          <td>${escapeHtml(l.size)}</td>
          <td>${l.thickness ? escapeHtml(l.thickness) : '—'}</td>
          <td class="text-right">${l.quantity.toLocaleString('el-GR')} ${escapeHtml(l.unit)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  });

  if (lines.length === 0) {
    sectionsHtml = `<p style="text-align:center; color:#6b7280; margin-top:24px;">(Δεν έχουν προστεθεί υλικά στο δελτίο)</p>`;
  }

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>Δελτίο Παραγγελίας Προμηθευτή - Report</title>
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
 .meta { font-size: 12px; margin-bottom:14px; }
 .meta span { display:inline-block; margin-right:20px; }
 table { width:100%; border-collapse: collapse; margin-top:6px; margin-bottom: 14px; }
 th, td { border:1px solid #d1d5db; padding:5px 8px; }
 thead { background:#f3f4f6; }
 .text-right { text-align:right; }
 .section-title { margin-top:18px; font-weight:600; font-size:13px; color:${themeColorDark}; border-bottom: 2px solid ${themeColor}; padding-bottom:2px; display:inline-block; }
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
   margin-top: 24px;
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
    <div class="doc-banner-title">ΔΕΛΤΙΟ ΠΡΟΜΗΘΕΥΤΗ</div>
    <div class="doc-banner-number">${lines.length} ${lines.length === 1 ? 'είδος' : 'είδη'}</div>
  </div>

  <div class="meta">
    <span><strong>Ημερομηνία:</strong> ${todayStr}</span>
    <span><strong>Προμηθευτής:</strong> &nbsp;______________________</span>
  </div>

  ${sectionsHtml}

  <div class="report-footer">
    <div>Σ. ΔΟΥΚΑΣ Α.Ε.</div>
    <div>14 χλμ Δράμας-Καβάλας, Δράμα, ΤΚ 66300</div>
    <div>Τηλ: +30 25210 55519 · e-mail: info@doukas-hellas.gr</div>
  </div>
</body>
</html>`;
}

