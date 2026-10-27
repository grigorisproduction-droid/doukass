// Data definitions for the Supplier Order Form ("Δελτίο Παραγγελίας")
// This is a matrix-style form (sheet size × thickness) used to order raw
// sheet-metal stock from the supplier — separate from the customer order calculator.

export interface SheetOrderSection {
  key: string;
  label: string;
}

// Standard stock sheet sizes sold in the Greek market (meters, W x L)
export const SHEET_ORDER_SIZES: string[] = [
  '2Χ1',
  '2.5Χ1.25',
  '3Χ1.5',
  '4Χ2',
  '6Χ1.5',
];

// Standard thickness range (mm) shown as columns
export const SHEET_ORDER_THICKNESSES: number[] = [
  0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20,
];

// Main sheet categories (each gets its own grid)
export const SHEET_ORDER_SECTIONS: SheetOrderSection[] = [
  { key: 'black', label: 'Μαύρη Λαμαρίνα' },
  { key: 'galv', label: 'Γαλβανιζέ' },
  { key: 'inox', label: 'INOX' },
  { key: 'kritharaki', label: 'Κριθαράκι' },
];

// Perforated sheet ("Διάτρητη") comes in 3 material variants, each with its own grid
export const PERFORATED_SECTIONS: SheetOrderSection[] = [
  { key: 'perf_black', label: 'α. Μαύρη' },
  { key: 'perf_inox', label: 'β. INOX' },
  { key: 'perf_galv', label: 'γ. Γαλβανιζέ' },
];

// Quantities are stored as a flat map: `${sectionKey}|${size}|${thickness}` -> quantity string
export type SupplierOrderQuantities = Record<string, string>;

export function makeQtyKey(sectionKey: string, size: string, thickness: number): string {
  return `${sectionKey}|${size}|${thickness}`;
}
