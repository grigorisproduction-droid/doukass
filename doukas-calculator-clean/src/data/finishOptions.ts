export interface FinishOption {
  key: string;
  label: string;
}

// Selectable finishing/treatment options for an order or offer.
// Selected ones are shown as checked ✅ in the printed report.
export const FINISH_OPTIONS: FinishOption[] = [
  { key: 'galvanize', label: 'Γαλβάνισμα' },
  { key: 'paint', label: 'Βάψιμο' },
  { key: 'sandblast', label: 'Αμμοβολή' },
  { key: 'primer', label: 'Αντισκωριακό Αστάρι' },
  { key: 'powdercoat', label: 'Ηλεκτροστατική Βαφή' },
];
