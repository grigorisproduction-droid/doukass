import { OrderItem } from '../types';

export interface ImportedReport {
  orderNum: string;
  isOffer: boolean;
  customer: string;
  customerPhone: string;
  project: string;
  rows: OrderItem[];
}

// Parses a Greek-locale formatted number back to a JS number.
// Handles both "1.234,56" (thousands + decimal) and simple "10" / "12,5" forms.
function parseGreekNumber(text: string): number {
  const cleaned = text.trim().replace(/[^\d.,-]/g, '');
  if (!cleaned) return NaN;
  // If it has both '.' and ',', '.' is thousands separator, ',' is decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
  }
  // Only comma -> decimal separator
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  return parseFloat(cleaned);
}

function getMetaValue(doc: Document, label: string): string {
  const spans = Array.from(doc.querySelectorAll('.meta span'));
  for (const span of spans) {
    const text = span.textContent || '';
    if (text.trim().startsWith(label)) {
      return text.replace(label, '').trim();
    }
  }
  return '';
}

/**
 * Parses a previously exported/printed report (HTML file produced by buildReportHtml)
 * back into structured, editable order data.
 *
 * Note: imported rows won't carry the internal `metadata` used for automatic weight
 * recalculation when thickness/dimensions are later edited — the printed report doesn't
 * contain that info. Editing those fields on imported rows will keep the original weight
 * (proportional fallback), same as any legacy saved order.
 */
export function parseImportedReportHtml(html: string): ImportedReport | null {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Determine document type + order number.
  // Stable across all versions of the report via the <title> tag: "Προσφορά OFF-001 - Report"
  let orderNum = '';
  let isOffer = false;

  const titleText = doc.querySelector('title')?.textContent || '';
  const titleMatch = titleText.match(/^(Προσφορά|Παραγγελία)\s+(.+?)\s+-\s+Report$/i);
  if (titleMatch) {
    isOffer = titleMatch[1].toLowerCase() === 'προσφορά';
    orderNum = titleMatch[2].trim();
  } else {
    // Fallback: try the colored banner number chip (newer reports)
    const bannerNumber = doc.querySelector('.doc-banner-number')?.textContent || '';
    const bannerMatch = bannerNumber.match(/Νο\.?\s*(.+)/i);
    if (bannerMatch) orderNum = bannerMatch[1].trim();
    const bannerTitle = doc.querySelector('.doc-banner-title')?.textContent || '';
    isOffer = /ΠΡΟΣΦΟΡΑΣ/i.test(bannerTitle);
  }

  if (!orderNum) return null;

  const customer = getMetaValue(doc, 'Πελάτης:');
  const customerPhone = getMetaValue(doc, 'Τηλέφωνο:');
  const project = getMetaValue(doc, 'Έργο:');

  // The materials table is always the first <table> in the document
  // (the operations checklist table, if present, comes after it).
  const table = doc.querySelector('table');
  if (!table) return null;

  const headerCells = Array.from(table.querySelectorAll('thead th')).map(th => (th.textContent || '').trim());
  const colIndex = (label: string) => headerCells.findIndex(h => h.includes(label));

  const idxCategory = colIndex('Κατηγορία');
  const idxSection = colIndex('Διατομή');
  const idxThickness = colIndex('Πάχος');
  const idxDimensions = colIndex('Διαστάσεις');
  const idxQuantity = colIndex('Ποσότητα');
  const idxWeight = colIndex('Βάρος');
  const idxNotes = colIndex('Σημειώσεις');

  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
  const rows: OrderItem[] = [];

  bodyRows.forEach((tr, i) => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => (td.textContent || '').trim());
    // Skip placeholder "no materials" row (it uses colspan and has far fewer cells)
    if (cells.length < 5) return;

    const category = idxCategory >= 0 ? cells[idxCategory] : '';
    const section = idxSection >= 0 ? cells[idxSection] : '';
    const thicknessRaw = idxThickness >= 0 ? cells[idxThickness] : '';
    const dimensions = idxDimensions >= 0 ? cells[idxDimensions] : '';
    const quantityRaw = idxQuantity >= 0 ? cells[idxQuantity] : '0';
    const weightRaw = idxWeight >= 0 ? cells[idxWeight] : '0';
    const notes = idxNotes >= 0 ? cells[idxNotes] : '';

    const thicknessMatch = thicknessRaw.match(/([\d.,]+)/);
    const thickness = thicknessMatch ? parseGreekNumber(thicknessMatch[1]) : null;

    const quantity = parseGreekNumber(quantityRaw) || 0;
    const weight = parseGreekNumber(weightRaw) || 0;

    if (!category && !section) return;

    rows.push({
      id: Date.now() + i + Math.random(),
      category,
      section,
      thickness: thickness !== null && !isNaN(thickness) ? thickness : null,
      dimensions,
      quantity,
      weight,
      notes: notes || undefined
      // No `metadata` — see note above.
    });
  });

  if (rows.length === 0) return null;

  return { orderNum, isOffer, customer, customerPhone, project, rows };
}
