import {
  SheetOrderSection,
  SHEET_ORDER_SIZES,
  SHEET_ORDER_THICKNESSES,
  SHEET_ORDER_SECTIONS,
  PERFORATED_SECTIONS,
  SupplierOrderQuantities,
  makeQtyKey,
} from '../data/supplierOrderData';

function buildSectionTable(section: SheetOrderSection, quantities: SupplierOrderQuantities): string {
  const headerCells = SHEET_ORDER_THICKNESSES.map(t => `<th>${t}mm</th>`).join('');
  const rows = SHEET_ORDER_SIZES.map(size => {
    const cells = SHEET_ORDER_THICKNESSES.map(t => {
      const val = quantities[makeQtyKey(section.key, size, t)] || '';
      return `<td>${val}</td>`;
    }).join('');
    return `<tr><td class="row-label">${size}</td>${cells}</tr>`;
  }).join('');

  return `
  <div class="section-block">
    <div class="section-title">${section.label}</div>
    <table class="grid-table">
      <thead><tr><th></th>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

export function buildSupplierOrderHtml(quantities: SupplierOrderQuantities): string {
  const todayStr = new Date().toLocaleDateString('el-GR');

  const mainSections = SHEET_ORDER_SECTIONS.map(s => buildSectionTable(s, quantities)).join('');
  const perforatedSections = PERFORATED_SECTIONS.map(s => buildSectionTable(s, quantities)).join('');

  return `<!DOCTYPE html>
<html lang="el">
<head>
<meta charset="UTF-8">
<title>Δελτίο Παραγγελίας Προμηθευτή</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; color:#111827; margin:14px; }
  h1 { font-size: 20px; margin:0 0 4px; text-align:center; letter-spacing:1px; }
  .subtitle { font-size: 11px; color:#6b7280; text-align:center; margin-bottom:4px; }
  .title-bar { text-align:center; font-size:16px; font-weight:700; color:#1d4ed8; margin: 10px 0 18px; border-bottom: 2px solid #1d4ed8; padding-bottom:6px; display:inline-block; }
  .title-wrap { text-align:center; }
  .meta { font-size: 11px; margin-bottom:14px; display:flex; justify-content:space-between; }
  .section-block { margin-bottom:16px; page-break-inside:avoid; }
  .section-title { font-weight:700; font-size:13px; margin-bottom:4px; }
  table.grid-table { width:100%; border-collapse: collapse; }
  table.grid-table th, table.grid-table td { border:1px solid #d1d5db; padding:3px 4px; text-align:center; min-width: 26px; }
  table.grid-table thead th { background:#f3f4f6; font-weight:600; font-size:10px; }
  table.grid-table td.row-label { text-align:left; font-weight:600; background:#f9fafb; white-space:nowrap; }
  .perforated-title { font-size:15px; font-weight:700; margin: 18px 0 10px; }
  .report-footer {
    margin-top: 20px;
    padding-top: 6px;
    border-top: 1px solid #d1d5db;
    font-size: 10px;
    color: #6b7280;
    line-height: 1.4;
    text-align: right;
  }
  @media print {
    body { margin:8mm; }
    .section-block { page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="title-wrap">
    <h1>ΔΟΥΚΑΣ Α.Ε.</h1>
    <div class="subtitle">Π Ε Ρ Ι Φ Ρ Α Ξ Ε Ι Σ</div>
    <div class="title-bar">Δελτίο Παραγγελίας</div>
  </div>

  <div class="meta">
    <span><strong>Ημερομηνία:</strong> ${todayStr}</span>
    <span><strong>Προμηθευτής:</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
  </div>

  ${mainSections}

  <div class="perforated-title">Διάτρητη</div>
  ${perforatedSections}

  <div class="report-footer">
    <div>Σ. ΔΟΥΚΑΣ Α.Ε.</div>
    <div>14 χλμ Δράμας-Καβάλας, Δράμα, ΤΚ 66300</div>
    <div>Τηλ: +30 25210 55519 · e-mail: info@doukas-hellas.gr</div>
  </div>
</body>
</html>`;
}
