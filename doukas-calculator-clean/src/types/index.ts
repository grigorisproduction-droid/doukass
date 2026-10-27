export interface MaterialSize {
  code: string;
  label: string;
  wpm?: number;
  width?: number;
  height?: number;
  thicknesses?: number[];
  leg?: number;
  diameter?: number;
  side?: number;
}

export interface Material {
  label: string;
  type: string;
  requiresThickness?: boolean;
  density?: number;
  sizes?: MaterialSize[];
}

export interface SheetType {
  key: string;
  label: string;
  density: number;
  thicknesses: number[];
}

export interface PipeType {
  key: string;
  label: string;
  density: number;
  sizes: MaterialSize[];
}

export interface OrderItem {
  id: number;
  category: string;
  section: string;
  thickness: number | null;
  dimensions: string;
  quantity: number;
  weight: number;
  notes?: string;
  // Metadata used to recalculate weight when thickness/dimensions/quantity are edited
  metadata?: {
    materialType: 'wpm' | 'profile' | 'sheet' | 'pipe';
    materialKey?: string;   // for 'wpm' and 'profile'
    sheetTypeKey?: string;  // for 'sheet'
    pipeTypeKey?: string;   // for 'pipe'
    sizeCode?: string;      // for 'wpm', 'profile', 'pipe'
    density: number;
    wpm?: number;           // pre-calculated weight/meter, for 'wpm' type
  };
}
