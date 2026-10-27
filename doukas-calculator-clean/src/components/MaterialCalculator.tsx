import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { materials as initialMaterials, sheetTypes as initialSheetTypes, pipeTypes as initialPipeTypes } from '../data/materials';
import { calcWeightPerMeter, calcSheetWeight, DENSITY_MULTIPLIER, formatNumber, parseNumber } from '../utils/calculations';
import { recalculateRowWeight } from '../utils/weightCalculation';
import { parseImportedReportHtml } from '../utils/importReport';
import { FINISH_OPTIONS } from '../data/finishOptions';
import { formatPhone, normalizePhone, phoneMatches } from '../utils/phone';
import { getMaterialIcon, getSheetIcon, getPipeIcon } from '../utils/materialIcons';
import { buildReportHtml } from './PrintReport';
import { OrderItem, Material, SheetType, PipeType } from '../types';
import { Customer } from '../types/Customer';
import CustomerManager from './CustomerManager';
import OrderHistory, { SavedOrder } from './OrderHistory';
import MaterialEditor from './MaterialEditor';
import AnalyticsDashboard from './AnalyticsDashboard';
import CustomerHistory from './CustomerHistory';
import TemplatesManager, { OrderTemplate } from './TemplatesManager';
import SupplierOrderForm from './SupplierOrderForm';
import FenceCalculator from './FenceCalculator';
import CuttingListModal from './CuttingListModal';
import UpdatesModal from './UpdatesModal';
import { buildWorkshopHtml } from './WorkshopPrint';
import type { CutPiece } from '../utils/cutting';
import {Plus, Trash2, Printer, Download, FileText, Users, Phone, Search, X, Settings, RotateCcw, Save as SaveIcon, History, Database, FileUp, FileDown, Calculator, Clipboard, ClipboardList, AlertTriangle, TrendingUp, Copy, LayoutTemplate, RefreshCw} from 'lucide-react';
import logo from '../assets/logo.png';

const STORAGE_KEY = 'doukas-calculator-state';
// Signature of the order as it was when last saved as a report (PDF). Used for the "unsaved order" check on close.
const SAVED_SIG_KEY = 'doukas-saved-order-sig-v1';
const makeOrderSig = (o: {
  mode: string; orderNum: string; customer: string; customerPhone: string;
  project: string; rows: OrderItem[]; selectedFinishes: string[];
}) => JSON.stringify(o);
const CUSTOMERS_KEY = 'doukas-customers';
const MATERIALS_KEY = 'doukas-materials';
const CUSTOM_DENSITIES_KEY = 'doukas-custom-densities-v1';
const HISTORY_KEY = 'doukas-history';
const GLOBAL_DENSITY_KEY = 'doukas-global-density-v1';
const COSTING_KEY = 'doukas-costing-v1';
const TEMPLATES_KEY = 'doukas-templates-v1';
const REPORT_FOLDER_UI_KEY = 'doukas-report-folder-ui-v1';
// Auto-numbering for ORDER / OFFER
const DOC_COUNTERS_KEY = 'doukas-doc-counters-v1';
// Storage adapter: uses SQLite-backed KV when running in Electron desktop, else browser localStorage.
const hasDesktopKV = typeof window !== 'undefined' && !!window.mwDB?.kv?.getSync;
const storageGet = (key: string): string | null => {
  try { return hasDesktopKV ? window.mwDB!.kv!.getSync(key) : localStorage.getItem(key); } catch { return null; }
};
const storageSet = (key: string, value: string) => {
  try { return hasDesktopKV ? window.mwDB!.kv!.setSync(key, value) : localStorage.setItem(key, value); } catch {}
};
const storageRemove = (key: string) => {
  try { return hasDesktopKV ? window.mwDB!.kv!.removeSync(key) : localStorage.removeItem(key); } catch {}
};


function getNextDocNumber(docType: 'ORDER' | 'OFFER'): string {
  try {
    const raw = storageGet(DOC_COUNTERS_KEY);
    const counters: Record<'ORDER' | 'OFFER', number> = raw
      ? { ORDER: 1, OFFER: 1, ...(JSON.parse(raw) || {}) }
      : { ORDER: 1, OFFER: 1 };

    const next = Number.isFinite(counters[docType]) ? counters[docType] : 1;
    // store next number
    counters[docType] = next + 1;
    storageSet(DOC_COUNTERS_KEY, JSON.stringify(counters));
    return String(next);
  } catch {
    // fallback
    return String(Date.now());
  }
}

export default function MaterialCalculator() {
  // App State
  const [mode, setMode] = useState<'ORDER' | 'OFFER'>('ORDER');
  const [orderNum, setOrderNum] = useState('');
  const [customer, setCustomer] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [project, setProject] = useState('');
  const [rows, setRows] = useState<OrderItem[]>([]);

  // Power features
  const rootRef = useRef<HTMLDivElement>(null);

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [globalSearchIndex, setGlobalSearchIndex] = useState(0);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  const importReportInputRef = useRef<HTMLInputElement>(null);

  // Hidden global density override (kg/m3) - press Ctrl+Shift+D
  const [globalDensityOverride, setGlobalDensityOverride] = useState<number | null>(null);
  const [showDensityModal, setShowDensityModal] = useState(false);
  const [densityDraft, setDensityDraft] = useState('');
  
  // Custom density overrides per material (persistent)
  const [customDensities, setCustomDensities] = useState<Record<string, number>>({});

  // Reports folder (desktop): user-chosen directory where HTML reports are auto-saved
  const [reportFolder, setReportFolder] = useState<string>('');
  const [showReportFolderModal, setShowReportFolderModal] = useState(false);

  // Save notifications (HTML/PDF)
  const [saveNotice, setSaveNotice] = useState<{ msg: string; path?: string } | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const showNotice = (msg: string, path?: string) => {
    setSaveNotice({ msg, path });
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setSaveNotice(null), 3500);
  };

  
// Costing (optional) - enabled/disabled from menu
const [showCostingModal, setShowCostingModal] = useState(false);
const [costingEnabled, setCostingEnabled] = useState(false);
const [pricePerKg, setPricePerKg] = useState<number>(0);
const [useCostingForDoc, setUseCostingForDoc] = useState(false);


  useEffect(() => {
    // Load reports folder preference (desktop only)
    (async () => {
      try {
        if (window.mwDB?.report?.getFolder) {
          const r = await window.mwDB.report.getFolder();
          if (r?.ok && r.folder) setReportFolder(r.folder);
        } else {
          const v = localStorage.getItem(REPORT_FOLDER_UI_KEY);
          if (v) setReportFolder(v);
        }
      } catch {}
    })();
  }, []);

  // Dynamic Data State
  const [materials, setMaterials] = useState<Record<string, Material>>(initialMaterials);
  const [sheetTypes, setSheetTypes] = useState<Record<string, SheetType>>(initialSheetTypes);
  const [pipeTypes, setPipeTypes] = useState<Record<string, PipeType>>(initialPipeTypes);
  const [orderHistory, setOrderHistory] = useState<SavedOrder[]>([]);

  // UI State
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerDropdownIndex, setCustomerDropdownIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showDensityCustomizationModal, setShowDensityCustomizationModal] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonMaterials, setComparisonMaterials] = useState<string[]>([]);
  
  // Inline editing for quantity
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');
  
  // Inline editing for dimensions
  const [editingDimensionsId, setEditingDimensionsId] = useState<number | null>(null);
  const [editingDimensions, setEditingDimensions] = useState<string>('');
  
  // Inline editing for thickness
  const [editingThicknessId, setEditingThicknessId] = useState<number | null>(null);
  const [editingThickness, setEditingThickness] = useState<string>('');
  
  // Auto-save indicator
  const [lastSaved, setLastSaved] = useState<string>('');
  
  // Undo/Redo history
  const [history, setHistory] = useState<OrderItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Notes editing (REMOVE LATER)
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showMaterialEditor, setShowMaterialEditor] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showCustomerHistory, setShowCustomerHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<OrderTemplate[]>([]);
  const [showSupplierOrder, setShowSupplierOrder] = useState(false);
  const [showFenceCalculator, setShowFenceCalculator] = useState(false);
  const [showCuttingList, setShowCuttingList] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);
  const [cutListPrefill, setCutListPrefill] = useState<CutPiece[] | undefined>(undefined);
  
  // Customer DB State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const customerInputRef = useRef<HTMLDivElement>(null);

  // Form State
  const [selectedMaterialKey, setSelectedMaterialKey] = useState('');
  const [selectedSizeCode, setSelectedSizeCode] = useState('');
  const [selectedSheetTypeKey, setSelectedSheetTypeKey] = useState('');
  const [selectedPipeTypeKey, setSelectedPipeTypeKey] = useState('');
  const [thickness, setThickness] = useState('');


  // Auto-select thickness for profiles that require it (e.g. RHS) 
  useEffect(() => {
    if (!selectedMaterialKey) return;
    const mat = materials[selectedMaterialKey];
    if (!mat?.requiresThickness) return;
    const size = mat.sizes?.find(s => s.code === selectedSizeCode);
    const options = (size as any)?.thicknesses as (number[] | undefined);
    if (!options || options.length === 0) return;

    // If thickness is empty or not in options, select the first available
    const current = parseNumber(thickness);
    const has = options.some(t => Number(t) === Number(current));
    if (!thickness || !has) {
      setThickness(String(options[0]));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterialKey, selectedSizeCode]);

  const [length, setLength] = useState('');
  const [sheetWidth, setSheetWidth] = useState('');
  const [sheetLength, setSheetLength] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedFinishes, setSelectedFinishes] = useState<string[]>([]);

  // ---- Unsaved-order tracking (drives the confirmation when closing the desktop app) ----
  const orderSig = useMemo(
    () => makeOrderSig({ mode, orderNum, customer, customerPhone, project, rows, selectedFinishes }),
    [mode, orderNum, customer, customerPhone, project, rows, selectedFinishes]
  );
  const [savedSig, setSavedSig] = useState<string | null>(() => storageGet(SAVED_SIG_KEY));
  const [cleanReq, setCleanReq] = useState(0);
  const cleanAppliedRef = useRef(0);
  const savePdfRef = useRef<() => Promise<boolean>>(async () => false);
  const isDirty = rows.length > 0 && orderSig !== savedSig;

  // Call after loading an already-saved order (history / import): the loaded state counts as "saved".
  const requestClean = () => setCleanReq(n => n + 1);

  useEffect(() => {
    if (cleanReq !== cleanAppliedRef.current) {
      cleanAppliedRef.current = cleanReq;
      setSavedSig(orderSig);
      storageSet(SAVED_SIG_KEY, orderSig);
    }
  }, [cleanReq, orderSig]);

  useEffect(() => {
    window.mwDB?.app?.setDirty(isDirty);
  }, [isDirty]);

  useEffect(() => {
    // "Αποθήκευση PDF και έξοδος" in the native close dialog
    const off = window.mwDB?.app?.onSaveBeforeClose(async () => {
      let ok = false;
      try { ok = await savePdfRef.current(); } catch { ok = false; }
      if (ok) window.mwDB?.app?.closeNow();
    });
    return () => { if (off) off(); };
  }, []);

  const toggleFinish = (key: string) => {
    setSelectedFinishes(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Load state
  useEffect(() => {
    const saved = storageGet(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const parsedMode: 'ORDER' | 'OFFER' = parsed.mode === 'OFFER' ? 'OFFER' : 'ORDER';

        const hasDraft =
          (Array.isArray(parsed.rows) && parsed.rows.length > 0) ||
          String(parsed.customer || '').trim() !== '' ||
          String(parsed.customerPhone || '').trim() !== '' ||
          String(parsed.project || '').trim() !== '';

        const restore = !hasDraft || confirm('Βρέθηκε πρόχειρο (autosave). Θες να γίνει επαναφορά;');

        if (restore) {
          setMode(parsedMode);
          // If there is no saved number, generate one automatically.
          const savedNum = (parsed.orderNum || '').toString().trim();
          setOrderNum(savedNum || getNextDocNumber(parsedMode));
          setCustomer(parsed.customer || '');
          setCustomerPhone(normalizePhone(parsed.customerPhone || ''));
          setProject(parsed.project || '');
          setSelectedFinishes(Array.isArray(parsed.selectedFinishes) ? parsed.selectedFinishes : []);
          
          // Migration fix: Clean up thickness for materials that don't require it
          const cleanedRows = (parsed.rows || []).map((row: OrderItem) => {
            const cat = (row.category || '').toLowerCase();
            const shouldHaveThickness = 
              cat.includes('λαμαρίνα') || 
              cat.includes('σωλήνα') || 
              cat.includes('γωνί') ||
              cat.includes('λάμα') ||
              cat.includes('flat') ||
              cat.includes('rhs') ||
              cat.includes('chs');
            
            // If material shouldn't have thickness but has 0, set to null
            if (!shouldHaveThickness && (row.thickness === 0 || row.thickness === null || row.thickness === undefined)) {
              return { ...row, thickness: null };
            }
            return row;
          });
          
          setRows(cleanedRows);
        } else {
          storageRemove(STORAGE_KEY);
          setMode('ORDER');
          setOrderNum(getNextDocNumber('ORDER'));
          setCustomer('');
          setCustomerPhone('');
          setProject('');
          setSelectedFinishes([]);
          setRows([]);
        }
      } catch (e) { console.error(e); }
    } else {
      // First run: generate initial doc number
      setOrderNum(getNextDocNumber('ORDER'));
    }
    
    const savedCustomers = storageGet(CUSTOMERS_KEY);
    if (savedCustomers) {
      try { const parsed = JSON.parse(savedCustomers); setCustomers(Array.isArray(parsed) ? parsed.map((c:any)=>({...c, phone: normalizePhone(String(c.phone||''))})) : []); } catch (e) {}
    }

    // Load custom density overrides (but materials themselves always come from code)
    const savedCustomDensities = storageGet(CUSTOM_DENSITIES_KEY);
    if (savedCustomDensities) {
      try {
        const parsed = JSON.parse(savedCustomDensities);
        setCustomDensities(parsed || {});
      } catch (e) {}
    }

    const savedHistory = storageGet(HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setOrderHistory((parsed as SavedOrder[]).map(o => ({...o, customerPhone: normalizePhone(String((o as any).customerPhone || ''))})));
      } catch (e) {}
    }

    const savedTemplates = storageGet(TEMPLATES_KEY);
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates);
        if (Array.isArray(parsed)) setTemplates(parsed as OrderTemplate[]);
      } catch (e) {}
    }
  
    // Load hidden global density override (if set)
    const savedDensity = storageGet(GLOBAL_DENSITY_KEY);
    if (savedDensity) {
      const n = parseFloat(savedDensity);
      if (Number.isFinite(n) && n > 0) {
        setGlobalDensityOverride(n);
        setDensityDraft(String(n));
      }
    }

// Load costing settings (optional)
const savedCosting = storageGet(COSTING_KEY);
if (savedCosting) {
  try {
    const c = JSON.parse(savedCosting);
    if (typeof c?.enabled === "boolean") setCostingEnabled(c.enabled);
    if (Number.isFinite(Number(c?.pricePerKg))) setPricePerKg(Number(c.pricePerKg));
  } catch {}
}
}, []);

  // Save state
  useEffect(() => {
    const state = { mode, orderNum, customer, customerPhone, project, rows, useCostingForDoc, selectedFinishes };
    storageSet(STORAGE_KEY, JSON.stringify(state));
    
    // Update last saved time
    const now = new Date();
    setLastSaved(now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [mode, orderNum, customer, customerPhone, project, rows, selectedFinishes]);

  // Track history for undo/redo
  useEffect(() => {
    // Push current state to history
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(rows)));
      // Keep max 50 states
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [rows.length, rows.map(r => `${r.id}-${r.quantity}-${r.notes}`).join(',')]);



  // Persist hidden global density override
  useEffect(() => {
    if (globalDensityOverride && globalDensityOverride > 0) {
      storageSet(GLOBAL_DENSITY_KEY, String(globalDensityOverride));
    } else {
      storageRemove(GLOBAL_DENSITY_KEY);
    }
  }, [globalDensityOverride]);

// Persist costing settings
useEffect(() => {
  try {
    storageSet(COSTING_KEY, JSON.stringify({ enabled: costingEnabled, pricePerKg }));
  } catch {}
}, [costingEnabled, pricePerKg]);


  useEffect(() => {
    storageSet(CUSTOMERS_KEY, JSON.stringify(customers));
  }, [customers]);

  // Save custom density overrides
  useEffect(() => {
    storageSet(CUSTOM_DENSITIES_KEY, JSON.stringify(customDensities));
  }, [customDensities]);

  useEffect(() => {
    storageSet(HISTORY_KEY, JSON.stringify(orderHistory));
  }, [orderHistory]);

  useEffect(() => {
    storageSet(TEMPLATES_KEY, JSON.stringify(templates));
  }, [templates]);
  
  // Helper to get effective density (custom or default)
  const getEffectiveDensity = (type: 'material' | 'sheet' | 'pipe', key: string, defaultDensity: number): number => {
    if (globalDensityOverride) return globalDensityOverride;
    const customKey = `${type}_${key}`;
    return customDensities[customKey] ?? defaultDensity;
  };

  // Templates handlers
  const handleSaveAsTemplate = () => {
    if (rows.length === 0) {
      alert('Δεν υπάρχουν υλικά στη λίστα για αποθήκευση ως template.');
      return;
    }
    const name = prompt('Όνομα Template (π.χ. "Στέγαστρο 6x4m"):');
    if (!name || !name.trim()) return;

    const newTemplate: OrderTemplate = {
      id: `tpl_${Date.now()}`,
      name: name.trim(),
      createdAt: Date.now(),
      rows: JSON.parse(JSON.stringify(rows))
    };
    setTemplates(prev => [...prev, newTemplate]);
    alert(`Το template "${name.trim()}" αποθηκεύτηκε! ✅`);
  };

  const handleLoadTemplate = (template: OrderTemplate) => {
    if (rows.length > 0 && !confirm(`Φόρτωση template "${template.name}";\n\nΤα τρέχοντα υλικά θα αντικατασταθούν.`)) {
      return;
    }
    // Fresh IDs so they don't collide with anything already tracked
    const freshRows = template.rows.map(r => ({ ...r, id: Date.now() + Math.random() }));
    setRows(freshRows);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // Handlers
  const handleAddRow = () => {
    let newItem: OrderItem | null = null;
    const qty = parseNumber(quantity);

    if (selectedMaterialKey) {
      const mat = materials[selectedMaterialKey];
      if (mat.type === 'wpm') {
        const size = mat.sizes?.find(s => s.code === selectedSizeCode);
        if (size) {
          const len = parseNumber(length);
          const weight = (size.wpm || 0) * len * qty;
          newItem = {
            id: Date.now(),
            category: mat.label,
            section: size.label,
            thickness: null,
            dimensions: `L=${len}m`,
            quantity: qty,
            weight: weight,
            metadata: {
              materialType: 'wpm',
              materialKey: selectedMaterialKey,
              sizeCode: selectedSizeCode,
              density: mat.density || 7850,
              wpm: size.wpm || 0
            }
          };
        }
      } else {
        // Other profiles (RHS, CHS, flat bars, angles, solid rounds, solid squares)
        const size = mat.sizes?.find(s => s.code === selectedSizeCode);
        if (size) {
            const len = parseNumber(length);
            const t = mat.requiresThickness ? parseNumber(thickness) : 0;
            const effectiveDensity = getEffectiveDensity('material', selectedMaterialKey, mat.density || 7850);
            const wpm = calcWeightPerMeter(mat.type, size, t, effectiveDensity);
            const weight = wpm * len * qty;
            newItem = {
                id: Date.now(),
                category: mat.label,
                section: size.label,
                thickness: mat.requiresThickness ? t : null,
                dimensions: `L=${len}m`,
                quantity: qty,
                weight: weight,
                metadata: {
                  materialType: 'profile',
                  materialKey: selectedMaterialKey,
                  sizeCode: selectedSizeCode,
                  density: effectiveDensity
                }
            };
        }
      }
    } else if (selectedSheetTypeKey) {
      const type = sheetTypes[selectedSheetTypeKey];
      const w = parseNumber(sheetWidth);
      const l = parseNumber(sheetLength);
      const t = parseNumber(thickness);
      const effectiveDensity = getEffectiveDensity('sheet', selectedSheetTypeKey, type.density);
      const weight = calcSheetWeight(w, l, t, effectiveDensity) * qty;
      newItem = {
        id: Date.now(),
        category: `Λαμαρίνα ${type.label}`,
        section: `t=${t}mm`,
        thickness: t,
        dimensions: `${w}x${l}mm`,
        quantity: qty,
        weight: weight,
        metadata: {
          materialType: 'sheet',
          sheetTypeKey: selectedSheetTypeKey,
          density: effectiveDensity
        }
      };
    } else if (selectedPipeTypeKey) {
      const type = pipeTypes[selectedPipeTypeKey];
      const size = type.sizes.find(s => s.code === selectedSizeCode);
      if (size) {
        const len = parseNumber(length);
        const t = parseNumber(thickness);
        const effectiveDensity = getEffectiveDensity('pipe', selectedPipeTypeKey, type.density);
        const wpm = calcWeightPerMeter('chs', size, t, effectiveDensity);
        const weight = wpm * len * qty;
        newItem = {
          id: Date.now(),
          category: `Σωλήνα ${type.label}`,
          section: size.label,
          thickness: t,
          dimensions: `L=${len}m`,
          quantity: qty,
          weight: weight,
          metadata: {
            materialType: 'pipe',
            pipeTypeKey: selectedPipeTypeKey,
            sizeCode: selectedSizeCode,
            density: effectiveDensity
          }
        };
      }
    }

    if (newItem) {
      setRows([...rows, newItem]);
      // Reset fields
      setLength('');
      setSheetWidth('');
      setSheetLength('');
      setQuantity('1');
    }
  };

  const handleRemoveRow = (id: number) => {
    setRows(rows.filter(r => r.id !== id));
  };

  // Live weight preview for the "Add Material" form — mirrors handleAddRow's logic
  const previewWeight = React.useMemo(() => {
    const qty = parseNumber(quantity) || 0;
    if (qty <= 0) return null;

    try {
      if (selectedMaterialKey) {
        const mat = materials[selectedMaterialKey];
        if (!mat) return null;
        const size = mat.sizes?.find(s => s.code === selectedSizeCode);
        if (!size) return null;
        const len = parseNumber(length);
        if (len <= 0) return null;

        if (mat.type === 'wpm') {
          return (size.wpm || 0) * len * qty;
        } else {
          const t = mat.requiresThickness ? parseNumber(thickness) : 0;
          if (mat.requiresThickness && t <= 0) return null;
          const effectiveDensity = getEffectiveDensity('material', selectedMaterialKey, mat.density || 7850);
          const wpm = calcWeightPerMeter(mat.type, size, t, effectiveDensity);
          return wpm * len * qty;
        }
      }

      if (selectedSheetTypeKey) {
        const type = sheetTypes[selectedSheetTypeKey];
        if (!type) return null;
        const w = parseNumber(sheetWidth);
        const l = parseNumber(sheetLength);
        const t = parseNumber(thickness);
        if (w <= 0 || l <= 0 || t <= 0) return null;
        const effectiveDensity = getEffectiveDensity('sheet', selectedSheetTypeKey, type.density);
        return calcSheetWeight(w, l, t, effectiveDensity) * qty;
      }

      if (selectedPipeTypeKey) {
        const type = pipeTypes[selectedPipeTypeKey];
        if (!type) return null;
        const size = type.sizes.find(s => s.code === selectedSizeCode);
        if (!size) return null;
        const len = parseNumber(length);
        const t = parseNumber(thickness);
        if (len <= 0 || t <= 0) return null;
        const effectiveDensity = getEffectiveDensity('pipe', selectedPipeTypeKey, type.density);
        const wpm = calcWeightPerMeter('chs', size, t, effectiveDensity);
        return wpm * len * qty;
      }
    } catch {
      return null;
    }

    return null;
  }, [
    selectedMaterialKey, selectedSheetTypeKey, selectedPipeTypeKey, selectedSizeCode,
    length, sheetWidth, sheetLength, thickness, quantity, materials, sheetTypes, pipeTypes
  ]);

  const handleCopyRow = (id: number) => {
    const rowToCopy = rows.find(r => r.id === id);
    if (rowToCopy) {
      const newRow = {
        ...rowToCopy,
        id: Date.now() + Math.random() // Unique ID
      };
      setRows([...rows, newRow]);
    }
  };

  const handleUpdateQuantity = (id: number, newQty: number) => {
    setRows(rows.map(r => {
      if (r.id === id) {
        const unitWeight = r.weight / r.quantity;
        return { ...r, quantity: newQty, weight: unitWeight * newQty };
      }
      return r;
    }));
  };

  // Recalculates weight for a row given new thickness and/or dimensions,
  // using saved metadata when available; falls back to proportional scaling.
  const handleUpdateThicknessOrDimensions = (
    id: number,
    updates: { thickness?: number; dimensions?: string }
  ) => {
    setRows(rows.map(r => {
      if (r.id !== id) return r;

      const newThickness = updates.thickness !== undefined ? updates.thickness : r.thickness;
      const newDimensions = updates.dimensions !== undefined ? updates.dimensions : r.dimensions;

      const recalculated = recalculateRowWeight(r, newDimensions, newThickness, r.quantity, {
        materials,
        sheetTypes,
        pipeTypes
      });

      if (recalculated !== null && !isNaN(recalculated) && recalculated >= 0) {
        return { ...r, thickness: newThickness, dimensions: newDimensions, weight: recalculated };
      }

      // Fallback: no metadata available (e.g. older saved orders) — keep old weight
      return { ...r, thickness: newThickness, dimensions: newDimensions };
    }));
  };

  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0);

  // Resolves selected finish keys into { label, checked } for the printed report
  const finishesForReport = FINISH_OPTIONS.map(f => ({
    label: f.label,
    checked: selectedFinishes.includes(f.key)
  }));

  // Total length (m) for linear materials — dimensions like "L=25m"
  const totalLength = rows.reduce((sum, r) => {
    const m = r.dimensions.match(/^L=([\d.,]+)m$/i);
    if (m) {
      const len = parseFloat(m[1].replace(',', '.'));
      if (!isNaN(len)) return sum + len * r.quantity;
    }
    return sum;
  }, 0);

  // Total area (m²) for sheet materials — dimensions like "1000x2000mm"
  const totalArea = rows.reduce((sum, r) => {
    const m = r.dimensions.match(/^([\d.,]+)\s*x\s*([\d.,]+)mm$/i);
    if (m) {
      const w = parseFloat(m[1].replace(',', '.'));
      const h = parseFloat(m[2].replace(',', '.'));
      if (!isNaN(w) && !isNaN(h)) return sum + (w * h / 1000000) * r.quantity;
    }
    return sum;
  }, 0);

  const warnings = React.useMemo(() => {
    const ws: { level: 'warn' | 'error'; msg: string }[] = [];
    rows.forEach((r, i) => {
      const n = i + 1;

      if (!Number.isFinite(r.weight) || r.weight <= 0) {
        ws.push({ level: 'error', msg: `Γραμμή ${n}: Μηδενικό βάρος (έλεγξε μήκος/πάχος/διαστάσεις).` });
      }

      // Length checks (L=...m)
      const lm = /L=([0-9]+(?:\.[0-9]+)?)m/i.exec(r.dimensions || '');
      if (lm) {
        const len = parseFloat(lm[1]);
        if (!Number.isFinite(len) || len <= 0) {
          ws.push({ level: 'error', msg: `Γραμμή ${n}: Μήκος δεν έχει οριστεί σωστά.` });
        }
      }

      // Thickness sanity - only for materials that actually have thickness set
      if (r.thickness !== null && r.thickness !== undefined && (!Number.isFinite(r.thickness) || r.thickness <= 0)) {
        ws.push({ level: 'error', msg: `Γραμμή ${n}: Πάχος δεν έχει οριστεί.` });
      }

      const cat = (r.category || '').toLowerCase();
      // Round pipes sanity: D > 2t
      if (cat.includes('σωλήνα')) {
        const dm = /([0-9]+(?:\.[0-9]+)?)/.exec(r.section || '');
        if (dm && r.thickness) {
          const d = parseFloat(dm[1]);
          const t = r.thickness;
          if (Number.isFinite(d) && Number.isFinite(t) && d <= 2 * t) {
            ws.push({ level: 'warn', msg: `Γραμμή ${n}: Προσοχή — διάμετρος ≤ 2×πάχος (μη ρεαλιστικό).` });
          }
        }
      }

      // RHS sanity: min(side) > 2t
      if (cat.includes('κοιλοδοκός')) {
        const sm = /([0-9]+)\s*x\s*([0-9]+)/i.exec(r.section || '');
        if (sm && r.thickness) {
          const a = parseFloat(sm[1]);
          const b = parseFloat(sm[2]);
          const t = r.thickness;
          const mn = Math.min(a, b);
          if (Number.isFinite(mn) && Number.isFinite(t) && mn <= 2 * t) {
            ws.push({ level: 'warn', msg: `Γραμμή ${n}: Προσοχή — πλευρά ≤ 2×πάχος (μη ρεαλιστικό).` });
          }
        }
      }
    });
    return ws;
  }, [rows]);

  const criticalWarning = warnings.find((w) => w.level === 'error')?.msg || null;

  const ensureNoCritical = () => {
    if (criticalWarning) {
      showNotice(criticalWarning);
      return false;
    }
    return true;
  };

  const handleCopyPack = async () => {
    if (!rows.length) {
      showNotice('Δεν υπάρχουν γραμμές για αντιγραφή.');
      return;
    }
    const header = `${mode === 'ORDER' ? 'ΠΑΡΑΓΓΕΛΙΑ' : 'ΠΡΟΣΦΟΡΑ'} #${orderNum || '—'}`;
    const cLine = `Πελάτης: ${customer || '—'}${customerPhone ? ` (${formatPhone(customerPhone)})` : ''}`;
    const pLine = project ? `Έργο: ${project}` : '';
    const lines = rows
      .map((r, i) => `${i + 1}) ${r.quantity}x ${r.category} | ${r.section} | ${r.dimensions} | ${formatNumber(r.weight)} kg`)
      .join('\n');
    const footer = `\nΣύνολο: ${formatNumber(totalWeight)} kg`;
    const text = [header, cLine, pLine, '', lines, footer].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showNotice('Αντιγράφηκε σύνοψη (Copy Pack).');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showNotice('Αντιγράφηκε σύνοψη (Copy Pack).');
      } catch {
        showNotice('Αποτυχία αντιγραφής.');
      }
    }
  };
  const totalPrice = (costingEnabled && useCostingForDoc) ? (totalWeight * (pricePerKg || 0)) : null;

  const handlePrint = async () => {
    if (!ensureNoCritical()) return;
    const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

    const html = buildReportHtml({
      orderNum,
      customer,
      customerPhone: formatPhone(customerPhone),
      project,
      totalWeight,
      totalQuantity,
      rows,
      isOffer: mode === "OFFER",
      finishes: finishesForReport,
    });

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();

      // Auto-open print dialog
      printWindow.onload = () => {
        try { printWindow.print(); } catch {}
      };
    }
  };
  const handleAddFenceRows = (newRows: OrderItem[]) => {
    setRows(prev => [...prev, ...newRows]);
    showNotice(`Προστέθηκαν ${newRows.length} υλικά περίφραξης στην παραγγελία.`);
  };

  const handleSendRailsToCutList = (pieces: CutPiece[]) => {
    setCutListPrefill(pieces);
    setShowFenceCalculator(false);
    setShowCuttingList(true);
  };

  const handlePrintWorkshop = () => {
    const html = buildWorkshopHtml({
      orderNum,
      project,
      rows,
      isOffer: mode === "OFFER",
      finishes: finishesForReport,
    });
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        try { printWindow.print(); } catch {}
      };
    }
  };

  const handleSavePdf = async (): Promise<boolean> => {
  if (!ensureNoCritical()) return false;
  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

  const html = buildReportHtml({
    orderNum,
    customer,
    customerPhone: formatPhone(customerPhone),
    project,
    totalWeight,
    totalQuantity,
    rows,
    isOffer: mode === "OFFER",
    finishes: finishesForReport,
  });

  const safePart = (s: string, fallback: string) => {
    const v = (s || "").trim();
    const cleaned = v
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned || fallback;
  };

  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const safeOrder = safePart(orderNum, "ΧΩΡΙΣ_ΑΡΙΘΜΟ");
  const safeCustomer = safePart(customer, "ΧΩΡΙΣ_ΠΕΛΑΤΗ");
  const filename = `${safeOrder}_${safeCustomer}_${dateStr}.pdf`;

  // Prepare metadata for organized folder structure
  const metadata = {
    customer: customer.trim(),
    orderNum,
    mode,
    // Full structured order, stored next to the PDF so it can be re-imported and edited later
    orderData: {
      version: 1,
      mode,
      orderNum,
      customer,
      customerPhone,
      project,
      rows,
      finishes: selectedFinishes
    }
  };

  let savedOk = false;
  if (window.mwDB?.report?.savePdf) {
    try {
      const res = await window.mwDB.report.savePdf(filename, html, metadata);
      if (res?.ok) { savedOk = true; showNotice('Αποθηκεύτηκε PDF report.', res.path); }
      else if (res?.canceled) showNotice('Ακυρώθηκε η αποθήκευση PDF.');
      else showNotice('Αποτυχία αποθήκευσης PDF.', res?.error);
    } catch {
      showNotice('Αποτυχία αποθήκευσης PDF.');
    }
  } else {
    showNotice('Η αποθήκευση PDF είναι διαθέσιμη μόνο στην desktop έκδοση (EXE).');
  }

  // Save to history (same as HTML save)
  const historyItem: SavedOrder = {
    id: Date.now().toString(),
    date: new Date().toISOString(),
    mode,
    orderNum,
    customer,
    customerPhone,
    project,
    rows,
    totalWeight,
    finishes: selectedFinishes,
  };
  setOrderHistory([historyItem, ...orderHistory]);

  if (savedOk) {
    const sig = makeOrderSig({ mode, orderNum, customer, customerPhone, project, rows, selectedFinishes });
    setSavedSig(sig);
    storageSet(SAVED_SIG_KEY, sig);
  }
  return savedOk;
};
  savePdfRef.current = handleSavePdf;

  const handleModeChange = (nextMode: 'ORDER' | 'OFFER') => {
    if (nextMode === mode) return;
    // Generate a fresh document number when switching type
    setMode(nextMode);
    setUseCostingForDoc(false);
    setOrderNum(getNextDocNumber(nextMode));
  };

  const handleNewOrder = async () => {
    // Auto-save current order before starting new one
    if (rows.length > 0) {
      const shouldSave = confirm(
        `Θέλετε να αποθηκεύσετε την τρέχουσα ${mode === 'OFFER' ? 'προσφορά' : 'παραγγελία'} #${orderNum} σε PDF πριν ξεκινήσετε νέα;`
      );
      
      if (shouldSave) {
        try {
          await handleSavePdf();
        } catch (err) {
          console.error('Auto-save failed:', err);
          alert('Σφάλμα κατά την αποθήκευση. Συνεχίζουμε χωρίς αποθήκευση.');
        }
      }
    }
    
    // Confirm new order
    if (confirm('Ξεκινάτε νέα παραγγελία;')) {
      setRows([]);
      setCustomer('');
      setCustomerPhone('');
      setProject('');
      setUseCostingForDoc(false);
      setSelectedFinishes([]);

      // Always generate automatically (no manual typing)
      setOrderNum(getNextDocNumber(mode));
    }
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setRows(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setRows(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

const handleBackup = async () => {
  const data = {
    state: storageGet(STORAGE_KEY),
    customers: storageGet(CUSTOMERS_KEY),
    customDensities: storageGet(CUSTOM_DENSITIES_KEY),
    history: storageGet(HISTORY_KEY),
    docCounters: storageGet(DOC_COUNTERS_KEY),
    globalDensity: storageGet(GLOBAL_DENSITY_KEY),
    costing: storageGet(COSTING_KEY),
    reportFolderUi: !hasDesktopKV ? localStorage.getItem(REPORT_FOLDER_UI_KEY) : null,
  };

  const jsonText = JSON.stringify(data, null, 2);
  const suggestedName = `backup_doukas_${new Date().toISOString().split('T')[0]}.json`;

  if (window.mwDB?.file?.saveText) {
    const res = await window.mwDB.file.saveText(suggestedName, jsonText);
    if (res?.ok) alert("Το backup αποθηκεύτηκε.");
    return;
  }

  const blob = new Blob([jsonText], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleRestore = async (e?: React.ChangeEvent<HTMLInputElement>) => {
  if (window.mwDB?.file?.openText) {
    const res = await window.mwDB.file.openText();
    if (!res?.ok) return;

    try {
      const data = JSON.parse(res.text ?? "");
      if (data.state) storageSet(STORAGE_KEY, data.state);
      if (data.customers) storageSet(CUSTOMERS_KEY, data.customers);
      if (data.customDensities) storageSet(CUSTOM_DENSITIES_KEY, data.customDensities);
      if (data.history) storageSet(HISTORY_KEY, data.history);
      if (data.docCounters) storageSet(DOC_COUNTERS_KEY, data.docCounters);
      if (data.globalDensity) storageSet(GLOBAL_DENSITY_KEY, data.globalDensity);
      if (data.costing) storageSet(COSTING_KEY, data.costing);
      if (data.reportFolderUi && !hasDesktopKV) localStorage.setItem(REPORT_FOLDER_UI_KEY, data.reportFolderUi);

      alert("Η επαναφορά ολοκληρώθηκε! Η σελίδα θα ανανεωθεί.");
      window.location.reload();
    } catch {
      alert("Σφάλμα κατά την ανάγνωση του αρχείου.");
    }
    return;
  }

  const file = e?.target?.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      if (data.state) storageSet(STORAGE_KEY, data.state);
      if (data.customers) storageSet(CUSTOMERS_KEY, data.customers);
      if (data.customDensities) storageSet(CUSTOM_DENSITIES_KEY, data.customDensities);
      if (data.history) storageSet(HISTORY_KEY, data.history);
      if (data.docCounters) storageSet(DOC_COUNTERS_KEY, data.docCounters);
      if (data.globalDensity) storageSet(GLOBAL_DENSITY_KEY, data.globalDensity);
      if (data.costing) storageSet(COSTING_KEY, data.costing);
      if (data.reportFolderUi) localStorage.setItem(REPORT_FOLDER_UI_KEY, data.reportFolderUi);

      alert("Η επαναφορά ολοκληρώθηκε! Η σελίδα θα ανανεωθεί.");
      window.location.reload();
    } catch {
      alert("Σφάλμα κατά την ανάγνωση του αρχείου.");
    }
  };
  reader.readAsText(file);
};


  // Filter customers for autocomplete
  const customerQuery = customer.trim();
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerQuery.toLowerCase()) ||
    phoneMatches(c.phone, customerQuery)
  );

  
  // Global Search (Ctrl+K)
  const globalQ = globalSearch.trim();
  const globalQLower = globalQ.toLowerCase();
  const globalQDigits = normalizePhone(globalQ);

  const globalCustomerHits = globalQ
    ? customers
        .filter((c) => c.name.toLowerCase().includes(globalQLower) || (globalQDigits && normalizePhone(c.phone).includes(globalQDigits)))
        .slice(0, 8)
    : [];

  const globalDocHits = globalQ
    ? orderHistory
        .filter((o) => {
          const hay =
            `${o.orderNum} ${o.customer} ${o.customerPhone} ${o.project} ${o.mode}`.toLowerCase();
          if (hay.includes(globalQLower)) return true;

          if (globalQDigits && normalizePhone(o.customerPhone).includes(globalQDigits)) return true;

          // Search inside rows
          return (o.rows || []).some((r) =>
            `${r.category} ${r.section} ${r.thickness ?? ""} ${r.dimensions ?? ""}`.toLowerCase().includes(globalQLower)
          );
        })
        .slice(0, 10)
    : [];

  const totalGlobalHits = globalCustomerHits.length + globalDocHits.length;

  const openGlobalSearch = () => {
    setShowGlobalSearch(true);
    setGlobalSearchIndex(0);
    // keep existing text if already typing, otherwise empty
    setTimeout(() => globalSearchInputRef.current?.focus(), 0);
  };

  const loadSavedOrder = (order: SavedOrder, askConfirm: boolean = true) => {
    if (askConfirm && !confirm('Φόρτωση; Τα τρέχοντα δεδομένα θα αντικατασταθούν.')) return;
    setMode(order.mode);
    setOrderNum(order.orderNum);
    setCustomer(order.customer);
    setCustomerPhone(normalizePhone(order.customerPhone));
    setProject(order.project);
    setRows(order.rows);
    setSelectedFinishes(Array.isArray(order.finishes) ? order.finishes : []);
  };

  // Loads a structured order (from a data file, or parsed from an HTML report) into the workspace
  const applyImportedOrder = (imp: {
    orderNum: string;
    isOffer: boolean;
    customer: string;
    customerPhone: string;
    project: string;
    rows: OrderItem[];
    finishes?: string[];
    hasMetadata: boolean;
  }) => {
    const typeText = imp.isOffer ? 'Προσφορά' : 'Παραγγελία';
    const confirmMsg =
      `Εισαγωγή δελτίου:\n\n` +
      `${typeText} #${imp.orderNum}\n` +
      `Πελάτης: ${imp.customer || '—'}\n` +
      `Υλικά: ${imp.rows.length}\n\n` +
      `Τα τρέχοντα δεδομένα θα αντικατασταθούν. Συνέχεια;`;

    if (!confirm(confirmMsg)) return;

    setMode(imp.isOffer ? 'OFFER' : 'ORDER');
    setOrderNum(imp.orderNum);
    setCustomer(imp.customer);
    setCustomerPhone(normalizePhone(imp.customerPhone));
    setProject(imp.project);
    setRows(imp.rows);
    setSelectedFinishes(Array.isArray(imp.finishes) ? imp.finishes : []);
    requestClean();

    if (imp.hasMetadata) {
      showNotice('Το δελτίο εισήχθη και είναι πλήρως επεξεργάσιμο (με αυτόματο υπολογισμό βάρους).');
    } else {
      setTimeout(() => {
        alert('Το δελτίο εισήχθη! ℹ️ Σημείωση: αν επεξεργαστείς πάχος/διαστάσεις σε αυτά τα υλικά, το βάρος δε θα υπολογιστεί αυτόματα, καθώς το HTML δεν περιέχει εσωτερικά δεδομένα υλικών. Η ποσότητα δουλεύει κανονικά.');
      }, 300);
    }
  };

  // Data file written next to every saved PDF (<name>.mwdata.json) — full fidelity
  const applyImportedDataText = (text: string) => {
    try {
      const d = JSON.parse(text);
      if (!d || !Array.isArray(d.rows) || d.rows.length === 0) throw new Error('bad data');
      const rows: OrderItem[] = d.rows.map((r: OrderItem, i: number) => ({
        ...r,
        id: Date.now() + i + Math.random()
      }));
      applyImportedOrder({
        orderNum: String(d.orderNum || ''),
        isOffer: d.mode === 'OFFER',
        customer: String(d.customer || ''),
        customerPhone: String(d.customerPhone || ''),
        project: String(d.project || ''),
        rows,
        finishes: Array.isArray(d.finishes) ? d.finishes : [],
        hasMetadata: rows.some(r => !!r.metadata)
      });
    } catch {
      alert('Το αρχείο δεδομένων δεν είναι έγκυρο.');
    }
  };

  const applyImportedReportText = (text: string) => {
    const parsed = parseImportedReportHtml(text);
    if (!parsed) {
      alert('Δεν ήταν δυνατή η ανάγνωση του δελτίου. Βεβαιώσου ότι επέλεξες ένα αρχείο που εξήχθη από την εφαρμογή.');
      return;
    }
    applyImportedOrder({ ...parsed, finishes: [], hasMetadata: false });
  };

  const handleImportReport = async () => {
    if (window.mwDB?.file?.openReport) {
      const res = await window.mwDB.file.openReport();
      if (!res.ok) {
        if (res.error) alert(res.error);
        return;
      }
      if (res.kind === 'data' && res.text) {
        applyImportedDataText(res.text);
      } else if (res.kind === 'html' && res.text) {
        applyImportedReportText(res.text);
      } else if (res.kind === 'pdf-no-data') {
        const g = res.guess;
        const found = g ? orderHistory.find(h => h.mode === g.mode && String(h.orderNum) === String(g.orderNum)) : undefined;
        if (found && confirm(
          `Αυτό το PDF δεν έχει αρχείο δεδομένων (δημιουργήθηκε πριν από αυτή την ενημέρωση).\n\n` +
          `Βρέθηκε όμως ${found.mode === 'OFFER' ? 'η προσφορά' : 'η παραγγελία'} #${found.orderNum} στο Ιστορικό.\n` +
          `Φόρτωση από το Ιστορικό;`
        )) {
          loadSavedOrder(found, false);
        } else if (!found) {
          alert(
            'Αυτό το PDF δεν έχει αρχείο δεδομένων δίπλα του (δημιουργήθηκε πριν από αυτή την ενημέρωση) ' +
            'και δεν βρέθηκε στο Ιστορικό.\n\nΑπό εδώ και πέρα, κάθε PDF που αποθηκεύεις θα μπορεί να εισαχθεί και να επεξεργαστεί πλήρως.'
          );
        }
      }
    } else {
      importReportInputRef.current?.click();
    }
  };

  const handleImportReportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf')) {
      alert('Το PDF δεν μπορεί να διαβαστεί απευθείας. Επίλεξε το αρχείο .mwdata.json ή .html που βρίσκεται δίπλα του.');
      return;
    }
    const isData = file.name.toLowerCase().endsWith('.json');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      if (isData) applyImportedDataText(reader.result);
      else applyImportedReportText(reader.result);
    };
    reader.readAsText(file);
  };

  // Focus search input when opened
  useEffect(() => {
    if (!showGlobalSearch) return;
    setTimeout(() => globalSearchInputRef.current?.focus(), 0);
  }, [showGlobalSearch]);

  // Keyboard shortcuts (keyboard-first flow)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // CRITICAL FIX: Don't intercept keys when user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || 
                       target.tagName === 'TEXTAREA' || 
                       target.isContentEditable;
      
      const key = e.key.toLowerCase();
      const isMod = e.ctrlKey || e.metaKey;

      // Secret density modal: Ctrl+Shift+D (allow even when typing)
      if (e.ctrlKey && e.shiftKey && key === 'd') {
        e.preventDefault();
        setDensityDraft(globalDensityOverride ? String(globalDensityOverride) : '');
        setShowDensityModal(true);
        return;
      }

      // ESC always works (close modals)
      if (key === 'escape') {
        setShowGlobalSearch(false);
        setShowDensityModal(false);
        setShowCustomerDropdown(false);
        setShowSettings(false);
        setShowHistory(false);
        setShowCustomerManager(false);
        setShowMaterialEditor(false);
        return;
      }

      // Don't handle other shortcuts when typing
      if (isTyping && !isMod) return;

      if (!isMod) return;

      // Undo: Ctrl+Z
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (key === 'k') {
        e.preventDefault();
        openGlobalSearch();
        return;
      }

      if (key === 'p') {
        e.preventDefault();
        handlePrint();
        return;
      }

      if (key === 's') {
        e.preventDefault();
        handleSavePdf();
        return;
      }

      // Ctrl+Enter to add row (only when NOT typing normally)
      if (e.key === 'Enter' && !isTyping) {
        e.preventDefault();
        handleAddRow();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    customers,
    orderHistory,
    showCustomerDropdown,
    globalDensityOverride,
    handlePrint,
    handleSavePdf,
    handleAddRow,
  ]);

  // Enter behaves like Tab (Shift+Enter = previous)
  const handleRootKeyDown = (e: React.KeyboardEvent) => {
    if (e.defaultPrevented) return;
    if (e.key !== 'Enter') return;
    if (e.ctrlKey || e.metaKey) return;

    const target = e.target as HTMLElement | null;
    if (!target) return;
    const tag = target.tagName?.toLowerCase();
    if (tag === 'textarea') return;

    // Let buttons work normally
    if (tag === 'button') return;

    e.preventDefault();

    const root = rootRef.current;
    if (!root) return;

    const focusables = Array.from(
      root.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);

    const active = document.activeElement as HTMLElement | null;
    const idx = active ? focusables.indexOf(active) : -1;
    if (idx === -1) return;

    const nextIdx = e.shiftKey ? Math.max(idx - 1, 0) : Math.min(idx + 1, focusables.length - 1);
    focusables[nextIdx]?.focus();
  };

return (
    <div ref={rootRef} onKeyDown={handleRootKeyDown} className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-24">
      <AnimatePresence>
        {saveNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 right-4 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 max-w-[420px]"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-sm font-semibold">{saveNotice.msg}</div>
                {saveNotice.path && (
                  <div className="mt-1 text-xs opacity-80 break-all">{saveNotice.path}</div>
                )}
                {saveNotice.path && (window as any).mwDB?.report?.reveal && (
                  <button
                    type="button"
                    className="mt-2 text-xs px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 transition"
                    onClick={() => (window as any).mwDB.report.reveal(saveNotice.path)}
                  >
                    Άνοιγμα φακέλου
                  </button>
                )}
              </div>
              <button
                type="button"
                className="text-white/70 hover:text-white text-lg leading-none"
                onClick={() => setSaveNotice(null)}
                title="Κλείσιμο"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-[#0f172a] text-white py-6 px-4 shadow-lg border-b border-slate-800">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-[#0f172a] rounded-lg p-2 flex items-center justify-center shadow-sm ring-1 ring-white/10">
              <img src={logo} alt="Logo" className="h-14 md:h-16 object-contain" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-wide hidden md:block">Υπολογισμός Βάρους Υλικών</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-slate-800/60 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleModeChange('ORDER')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  mode === 'ORDER' ? 'bg-white text-slate-900' : 'text-white hover:bg-slate-700'
                }`}
                title="Παραγγελία"
              >
                ΠΑΡΑΓΓΕΛΙΑ
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('OFFER')}
                className={`px-3 py-2 rounded-lg text-sm font-bold transition-colors ${
                  mode === 'OFFER' ? 'bg-white text-slate-900' : 'text-white hover:bg-slate-700'
                }`}
                title="Προσφορά"
              >
                ΠΡΟΣΦΟΡΑ
              </button>
            </div>


            <button
              type="button"
              onClick={openGlobalSearch}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              title="Global Search (Ctrl+K)"
            >
              <Search size={22} />
            </button>

            <button
              type="button"
              onClick={() => setShowSupplierOrder(true)}
              className="p-2 hover:bg-slate-700 rounded-full transition-colors relative"
              title="Δελτίο Παραγγελίας Προμηθευτή 📦"
            >
              <ClipboardList size={22} className="text-orange-400" />
            </button>

            {/* Undo/Redo */}
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-2 hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Αναίρεση (Ctrl+Z)"
              >
                ↶
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-2 hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Επανάληψη (Ctrl+Y)"
              >
                ↷
              </button>
            </div>

            {/* Order Navigation */}
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
              <button
                onClick={() => {
                  const currentOrders = orderHistory.filter(h => h.mode === mode);
                  const currentIndex = currentOrders.findIndex(h => h.orderNum === orderNum);
                  if (currentIndex > 0) {
                    const prev = currentOrders[currentIndex - 1];
                    if (confirm(`Φόρτωση προηγούμενης (#${prev.orderNum});`)) {
                      setOrderNum(prev.orderNum);
                      setCustomer(prev.customer || '');
                      setCustomerPhone(prev.customerPhone || '');
                      setProject(prev.project || '');
                      setRows(prev.rows || []);
                      setSelectedFinishes(Array.isArray(prev.finishes) ? prev.finishes : []);
                    }
                  }
                }}
                disabled={orderHistory.filter(h => h.mode === mode).findIndex(h => h.orderNum === orderNum) <= 0}
                className="p-2 hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Προηγούμενη"
              >
                ◀
              </button>
              <span className="text-xs text-slate-300 px-2 font-mono">
                {orderHistory.filter(h => h.mode === mode).findIndex(h => h.orderNum === orderNum) + 1} / {orderHistory.filter(h => h.mode === mode).length}
              </span>
              <button
                onClick={() => {
                  const currentOrders = orderHistory.filter(h => h.mode === mode);
                  const currentIndex = currentOrders.findIndex(h => h.orderNum === orderNum);
                  if (currentIndex < currentOrders.length - 1) {
                    const next = currentOrders[currentIndex + 1];
                    if (confirm(`Φόρτωση επόμενης (#${next.orderNum});`)) {
                      setOrderNum(next.orderNum);
                      setCustomer(next.customer || '');
                      setCustomerPhone(next.customerPhone || '');
                      setProject(next.project || '');
                      setRows(next.rows || []);
                      setSelectedFinishes(Array.isArray(next.finishes) ? next.finishes : []);
                    }
                  }
                }}
                disabled={orderHistory.filter(h => h.mode === mode).findIndex(h => h.orderNum === orderNum) >= orderHistory.filter(h => h.mode === mode).length - 1}
                className="p-2 hover:bg-slate-600 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Επόμενη"
              >
                ▶
              </button>
            </div>

            {lastSaved && (
              <div className="text-xs text-slate-400 flex items-center gap-1">
                <span>💾</span>
                <span className="hidden md:inline">Αποθηκεύτηκε: {lastSaved}</span>
              </div>
            )}

            {/* Batch Multiplier */}
            {rows.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-1">
                <button
                  onClick={() => {
                    const multiplier = prompt('Πολλαπλασιασμός ποσοτήτων:\n\n×2 = Διπλάσια\n×0.5 = Μισά\n\nΔώσε αριθμό:');
                    if (multiplier) {
                      const mult = parseFloat(multiplier);
                      if (!isNaN(mult) && mult > 0) {
                        setRows(rows.map(r => ({
                          ...r,
                          quantity: Math.round(r.quantity * mult),
                          weight: r.weight * mult
                        })));
                      }
                    }
                  }}
                  className="px-3 py-1.5 hover:bg-slate-600 rounded text-sm font-semibold transition-colors"
                  title="Πολλαπλασιασμός ποσοτήτων"
                >
                  ×N
                </button>
                <button
                  onClick={() => {
                    if (confirm('Διπλασιασμός όλων των ποσοτήτων;')) {
                      setRows(rows.map(r => ({
                        ...r,
                        quantity: r.quantity * 2,
                        weight: r.weight * 2
                      })));
                    }
                  }}
                  className="px-2 py-1.5 hover:bg-slate-600 rounded text-xs transition-colors"
                  title="Διπλασιασμός"
                >
                  ×2
                </button>
                <button
                  onClick={() => {
                    if (confirm('Τριπλασιασμός όλων των ποσοτήτων;')) {
                      setRows(rows.map(r => ({
                        ...r,
                        quantity: r.quantity * 3,
                        weight: r.weight * 3
                      })));
                    }
                  }}
                  className="px-2 py-1.5 hover:bg-slate-600 rounded text-xs transition-colors"
                  title="Τριπλασιασμός"
                >
                  ×3
                </button>
              </div>
            )}

            <button 
              onClick={handleNewOrder}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">{mode === "OFFER" ? "Νέα Προσφορά" : "Νέα Παραγγελία"}</span>
            </button>
            
            <div className="relative">
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <Settings size={24} />
              </button>
              
              {showSettings && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-slate-900 rounded-lg shadow-xl border z-50 overflow-hidden">
                  <button 
                    onClick={() => { setShowHistory(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <History size={18} /> Ιστορικό
                  </button>
                  <button 
                    onClick={() => { handleImportReport(); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <FileUp size={18} /> Εισαγωγή Δελτίου
                  </button>
                  <button 
                    onClick={() => { setShowTemplates(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b bg-gradient-to-r from-emerald-50 to-transparent"
                  >
                    <LayoutTemplate size={18} className="text-emerald-600" /> 
                    <span className="font-semibold text-emerald-700">Templates 📋</span>
                  </button>
                  <button 
                    onClick={() => { setShowSupplierOrder(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b bg-gradient-to-r from-orange-50 to-transparent"
                  >
                    <ClipboardList size={18} className="text-orange-600" /> 
                    <span className="font-semibold text-orange-700">Δελτίο Παραγγελίας 📦</span>
                  </button>
                  <button 
                    onClick={() => { setShowFenceCalculator(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b bg-gradient-to-r from-emerald-50 to-transparent"
                  >
                    <LayoutTemplate size={18} className="text-emerald-600" /> 
                    <span className="font-semibold text-emerald-700">Υπολογιστής Περίφραξης 📐</span>
                  </button>
                  <button 
                    onClick={() => { setCutListPrefill(undefined); setShowCuttingList(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b bg-gradient-to-r from-teal-50 to-transparent"
                  >
                    <FileDown size={18} className="text-teal-600" /> 
                    <span className="font-semibold text-teal-700">Σχέδιο Κοπής ✂️</span>
                  </button>
                  <button 
                    onClick={() => { setShowCustomerHistory(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b bg-gradient-to-r from-purple-50 to-transparent"
                  >
                    <Users size={18} className="text-purple-600" /> 
                    <span className="font-semibold text-purple-700">Ιστορικό Πελατών 👥</span>
                  </button>
                  <button 
                    onClick={() => { setShowAnalytics(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b bg-gradient-to-r from-blue-50 to-transparent"
                  >
                    <TrendingUp size={18} className="text-blue-600" /> 
                    <span className="font-semibold text-blue-700">Analytics 📊</span>
                  </button>
                  <button 
                    onClick={() => { setShowMaterialEditor(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <Database size={18} /> Διαχείριση Υλικών
                  </button>
                  <button 
                    onClick={() => { setShowReportFolderModal(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <FileText size={18} /> Φάκελος Reports
                  </button>

                  <button 
                    onClick={() => { setShowCostingModal(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <Calculator size={18} /> Κοστολόγηση
                  </button>

                  <button 
                    onClick={() => { setShowDensityCustomizationModal(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <Settings size={18} /> Αλλαγή Πυκνοτήτων
                  </button>

                  <button 
                    onClick={() => { setShowComparisonModal(true); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <Calculator size={18} /> Σύγκριση Υλικών
                  </button>

                  {window.mwDB?.update && (
                    <button
                      onClick={() => { setShowUpdates(true); setShowSettings(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                    >
                      <RefreshCw size={18} /> Ενημερώσεις εφαρμογής
                    </button>
                  )}

                  <button 
                    onClick={() => { handleBackup(); setShowSettings(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 border-b"
                  >
                    <FileDown size={18} /> Backup (Εξαγωγή)
                  </button>
                  {window.mwDB?.file?.openText ? (
                    <button
                      onClick={() => { handleRestore(); setShowSettings(false); }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <FileUp size={18} /> Restore (Εισαγωγή)
                    </button>
                  ) : (
                    <label className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                      <FileUp size={18} /> Restore (Εισαγωγή)
                      <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        {/* Horizontal Order Form */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">Πελάτης</label>
              <div className="relative" ref={customerInputRef}>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={customer}
                      onChange={(e) => {
                        setCustomer(e.target.value);
                        setCustomerDropdownIndex(0);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setShowCustomerDropdown(true);
                          setCustomerDropdownIndex((i) => Math.min(i + 1, Math.max(filteredCustomers.length - 1, 0)));
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setShowCustomerDropdown(true);
                          setCustomerDropdownIndex((i) => Math.max(i - 1, 0));
                          return;
                        }
                        if (e.key === 'Enter') {
                          if (showCustomerDropdown && filteredCustomers.length > 0) {
                            e.preventDefault();
                            const c = filteredCustomers[customerDropdownIndex] || filteredCustomers[0];
                            if (c) {
                              setCustomer(c.name);
                              setCustomerPhone(normalizePhone(c.phone));
                              setShowCustomerDropdown(false);
                            }
                          }
                          return;
                        }
                        if (e.key === 'Escape') {
                          setShowCustomerDropdown(false);
                        }
                      }}
                      className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Αναζήτηση..."
                    />
                    <Search className="absolute right-3 top-2.5 text-slate-400" size={18} />
                  </div>
                  <button 
                    onClick={() => setShowCustomerManager(true)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded border border-slate-300"
                    title="Διαχείριση Πελατών"
                  >
                    <Users size={20} />
                  </button>
                </div>

                {showCustomerDropdown && customer && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
                    {filteredCustomers.map((c, idx) => (
                      <div 
                        key={c.id}
                        className={`p-2 cursor-pointer border-b last:border-0 hover:bg-blue-50 ${idx === customerDropdownIndex ? "bg-blue-100" : ""}`}
                        onClick={() => {
                          setCustomer(c.name);
                          setCustomerPhone(normalizePhone(c.phone));
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <div className="font-bold">{c.name}</div>
                        <div className="text-sm text-slate-500">{formatPhone(c.phone)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="w-[180px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">Τηλέφωνο</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={formatPhone(customerPhone)}
                  onChange={(e) => {
                    const digits = normalizePhone(e.target.value);
                    setCustomerPhone(digits);

                    // Auto-fill customer name when phone matches exactly one customer
                    if (digits.length === 10) {
                      const hits = customers.filter(c => normalizePhone(c.phone) === digits);
                      if (hits.length === 1) setCustomer(hits[0].name);
                    }
                  }}
                  className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                {customerPhone && (
                  <a 
                    href={`tel:${customerPhone}`}
                    className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded border border-green-300 flex items-center justify-center"
                    title="Κλήση"
                  >
                    <Phone size={20} />
                  </a>
                )}
              </div>
            </div>

            <div className="w-[150px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">Ημερομηνία</label>
              <input 
                type="text" 
                value={new Date().toLocaleDateString('el-GR')}
                disabled
                className="w-full border border-slate-200 bg-slate-50 rounded px-3 py-2 text-slate-500"
              />
            </div>

            <div className="w-[120px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">Αρ. Παραγγελίας</label>
              <div className="flex gap-1">
                <input 
                  type="text" 
                  value={orderNum}
                  readOnly
                  title="Ο αριθμός δημιουργείται αυτόματα από το σύστημα"
                  className="flex-1 border border-slate-300 rounded px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                />
                <button
                  onClick={() => {
                    const num = prompt('Μετάβαση σε παραγγελία αριθμό:');
                    if (num) {
                      const found = orderHistory.find(h => h.orderNum === num && h.mode === mode);
                      if (found) {
                        // Load the order
                        if (confirm(`Φόρτωση ${mode === 'OFFER' ? 'προσφοράς' : 'παραγγελίας'} #${num};\n\nΗ τρέχουσα εργασία θα αντικατασταθεί.`)) {
                          setOrderNum(found.orderNum);
                          setCustomer(found.customer || '');
                          setCustomerPhone(found.customerPhone || '');
                          setProject(found.project || '');
                          setRows(found.rows || []);
                          setSelectedFinishes(Array.isArray(found.finishes) ? found.finishes : []);
                          setShowHistory(false);
                        }
                      } else {
                        alert(`Δεν βρέθηκε ${mode === 'OFFER' ? 'προσφορά' : 'παραγγελία'} με αριθμό ${num}`);
                      }
                    }
                  }}
                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded border border-blue-300 transition-colors"
                  title="Μετάβαση σε συγκεκριμένη παραγγελία"
                >
                  🔍
                </button>
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">Έργο</label>
              <input 
                type="text" 
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="w-[150px]">
              <label className="block text-sm font-bold text-slate-700 mb-1">Τύπος</label>
              <select 
                value={mode}
                onChange={(e) => handleModeChange(e.target.value as any)}
                className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              >
                <option value="ORDER">ΠΑΡΑΓΓΕΛΙΑ</option>
                <option value="OFFER">ΠΡΟΣΦΟΡΑ</option>
              </select>
            </div>
          </div>

          {/* Finish/treatment options — shown as check marks in the printed report */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-2">Επεξεργασία (εμφανίζεται στο δελτίο)</label>
            <div className="flex flex-wrap gap-2">
              {FINISH_OPTIONS.map(opt => {
                const checked = selectedFinishes.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleFinish(opt.key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-colors flex items-center gap-1.5 ${
                      checked
                        ? 'bg-slate-800 border-slate-800 text-white'
                        : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {checked ? '✓' : ''} {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Material Selection */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Προσθήκη Υλικού</h2>
          
          {/* Material Search Bar */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Αναζήτηση υλικού... (π.χ. IPE, 40x40, λαμαρίνα)"
                value={materialSearchQuery}
                onChange={(e) => setMaterialSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {materialSearchQuery && (
                <button
                  onClick={() => setMaterialSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            {materialSearchQuery && (
              <div className="text-xs text-slate-500 mt-1">
                Φιλτράρισμα με: "{materialSearchQuery}"
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Κατηγορία</label>
              <select 
                className="w-full border border-slate-300 rounded px-3 py-2"
                value={
                  selectedMaterialKey ? `mat:${selectedMaterialKey}` :
                  selectedSheetTypeKey ? `sheet:${selectedSheetTypeKey}` :
                  selectedPipeTypeKey ? `pipe:${selectedPipeTypeKey}` :
                  ''
                }
                onChange={(e) => {
                  const raw = e.target.value;
                  setSelectedMaterialKey('');
                  setSelectedSheetTypeKey('');
                  setSelectedPipeTypeKey('');
                  setSelectedSizeCode('');
                  setThickness('');

                  if (!raw) return;
                  const [kind, key] = raw.split(':');
                  if (kind === 'mat') setSelectedMaterialKey(key);
                  else if (kind === 'sheet') setSelectedSheetTypeKey(key);
                  else if (kind === 'pipe') setSelectedPipeTypeKey(key);
                }}
              >
                <option value="">-- Επιλογή --</option>
                <optgroup label="Δοκοί & Προφίλ">
                  {Object.entries(materials)
                    .filter(([k, m]) => {
                      // Hide placeholder groups
                      if (m.type === 'pipe_group') return false;
                      
                      if (!materialSearchQuery) return true;
                      const query = materialSearchQuery.toLowerCase();
                      return m.label.toLowerCase().includes(query) ||
                             k.toLowerCase().includes(query) ||
                             m.sizes?.some(s => s.label.toLowerCase().includes(query));
                    })
                    .map(([k, m]) => (
                      <option key={k} value={`mat:${k}`}>{getMaterialIcon(m.type, k)} {m.label}</option>
                    ))}
                </optgroup>
                <optgroup label="Λαμαρίνες">
                  {Object.entries(sheetTypes)
                    .filter(([k, m]) => {
                      if (!materialSearchQuery) return true;
                      const query = materialSearchQuery.toLowerCase();
                      return m.label.toLowerCase().includes(query) ||
                             'λαμαρίνα'.includes(query);
                    })
                    .map(([k, m]) => (
                      <option key={k} value={`sheet:${k}`}>{getSheetIcon(k)} Λαμαρίνα {m.label}</option>
                    ))}
                </optgroup>
                <optgroup label="Σωλήνες">
                  {Object.entries(pipeTypes)
                    .filter(([k, m]) => {
                      if (!materialSearchQuery) return true;
                      const query = materialSearchQuery.toLowerCase();
                      return m.label.toLowerCase().includes(query) ||
                             'σωλήνα'.includes(query) ||
                             'σωληνας'.includes(query);
                    })
                    .map(([k, m]) => (
                      <option key={k} value={`pipe:${k}`}>{getPipeIcon(k)} Σωλήνα {m.label}</option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Dynamic Fields */}
            {selectedMaterialKey && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Διατομή</label>
                  <select 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={selectedSizeCode}
                    onChange={(e) => setSelectedSizeCode(e.target.value)}
                  >
                    <option value="">-- Επιλογή --</option>
                    {materials[selectedMaterialKey].sizes?.map(s => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </div>
                {materials[selectedMaterialKey].requiresThickness && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Πάχος (mm)</label>
                    <select 
                      className="w-full border border-slate-300 rounded px-3 py-2"
                      value={thickness}
                      onChange={(e) => setThickness(e.target.value)}
                    >
                      <option value="">-- Επιλογή --</option>
                      {materials[selectedMaterialKey].sizes?.find(s => s.code === selectedSizeCode)?.thicknesses?.map(t => (
                        <option key={t} value={t}>{t} mm</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Μήκος (m)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {selectedSheetTypeKey && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Πάχος (mm)</label>
                  <select 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                  >
                    <option value="">-- Επιλογή --</option>
                    {sheetTypes[selectedSheetTypeKey].thicknesses.map(t => (
                      <option key={t} value={t}>{t} mm</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Πλάτος (mm)</label>
                  <input 
                    type="number" 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={sheetWidth}
                    onChange={(e) => setSheetWidth(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Μήκος (mm)</label>
                  <input 
                    type="number" 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={sheetLength}
                    onChange={(e) => setSheetLength(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </>
            )}

            {selectedPipeTypeKey && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Διάμετρος</label>
                  <select 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={selectedSizeCode}
                    onChange={(e) => setSelectedSizeCode(e.target.value)}
                  >
                    <option value="">-- Επιλογή --</option>
                    {pipeTypes[selectedPipeTypeKey].sizes.map(s => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Πάχος (mm)</label>
                  <select 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={thickness}
                    onChange={(e) => setThickness(e.target.value)}
                  >
                    <option value="">-- Επιλογή --</option>
                    {pipeTypes[selectedPipeTypeKey].sizes.find(s => s.code === selectedSizeCode)?.thicknesses?.map(t => (
                      <option key={t} value={t}>{t} mm</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Μήκος (m)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Τεμάχια</label>
              <input 
                type="number" 
                className="w-full border border-slate-300 rounded px-3 py-2"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
              />
            </div>
          </div>

          {previewWeight !== null && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 border-2 border-blue-200 rounded-lg px-4 py-2.5">
              <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                ⚖️ Εκτιμώμενο Βάρος
              </span>
              <span className="text-lg font-mono font-bold text-blue-800">
                {formatNumber(previewWeight)} kg
              </span>
            </div>
          )}

          <button 
            onClick={handleAddRow}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} /> Προσθήκη στη Λίστα
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b">
                <th className="p-4 font-bold">Περιγραφή</th>
                <th className="p-4 font-bold">Διατομή</th>
                <th className="p-4 font-bold">Πάχος</th>
                <th className="p-4 font-bold">Διαστάσεις</th>
                <th className="p-4 font-bold text-center">Τεμάχια</th>
                <th className="p-4 font-bold text-right">Βάρος (kg)</th>
                <th className="p-4 font-bold">📝 Σημειώσεις</th>
                <th className="p-4 font-bold text-center">Ενέργειες</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence>
                {rows.map((row) => (
                  <motion.tr 
                    key={row.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="p-4">{row.category}</td>
                    <td className="p-4 font-medium text-slate-800">{row.section}</td>
                    
                    {/* Editable Thickness */}
                    <td className="p-4">
                      {row.thickness !== null ? (
                        editingThicknessId === row.id ? (
                          <input
                            type="number"
                            step="0.1"
                            value={editingThickness}
                            onChange={(e) => setEditingThickness(e.target.value)}
                            onBlur={() => {
                              const newThickness = parseFloat(editingThickness);
                              if (!isNaN(newThickness) && newThickness > 0) {
                                handleUpdateThicknessOrDimensions(row.id, { thickness: newThickness });
                              }
                              setEditingThicknessId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newThickness = parseFloat(editingThickness);
                                if (!isNaN(newThickness) && newThickness > 0) {
                                  handleUpdateThicknessOrDimensions(row.id, { thickness: newThickness });
                                }
                                setEditingThicknessId(null);
                              } else if (e.key === 'Escape') {
                                setEditingThicknessId(null);
                              }
                            }}
                            autoFocus
                            className="w-20 px-2 py-1 border-2 border-blue-500 rounded text-center font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span
                            onClick={() => {
                              setEditingThicknessId(row.id);
                              setEditingThickness(row.thickness?.toString() || '');
                            }}
                            className="inline-block bg-slate-100 hover:bg-blue-50 px-3 py-1 rounded cursor-pointer transition-colors border-2 border-transparent hover:border-blue-200"
                            title="Κλικ για επεξεργασία"
                          >
                            t={row.thickness}mm
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    
                    {/* Editable Dimensions */}
                    <td className="p-4">
                      {editingDimensionsId === row.id ? (
                        <input
                          type="text"
                          value={editingDimensions}
                          onChange={(e) => setEditingDimensions(e.target.value)}
                          onBlur={() => {
                            if (editingDimensions.trim()) {
                              handleUpdateThicknessOrDimensions(row.id, { dimensions: editingDimensions.trim() });
                            }
                            setEditingDimensionsId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingDimensions.trim()) {
                                handleUpdateThicknessOrDimensions(row.id, { dimensions: editingDimensions.trim() });
                              }
                              setEditingDimensionsId(null);
                            } else if (e.key === 'Escape') {
                              setEditingDimensionsId(null);
                            }
                          }}
                          autoFocus
                          className="w-32 px-2 py-1 border-2 border-blue-500 rounded font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                      ) : (
                        <span
                          onClick={() => {
                            setEditingDimensionsId(row.id);
                            setEditingDimensions(row.dimensions);
                          }}
                          className="inline-block bg-slate-100 hover:bg-blue-50 px-3 py-1 rounded cursor-pointer transition-colors border-2 border-transparent hover:border-blue-200 text-slate-600"
                          title="Κλικ για επεξεργασία"
                        >
                          {row.dimensions}
                        </span>
                      )}
                    </td>
                    
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            if (row.quantity > 1) {
                              handleUpdateQuantity(row.id, row.quantity - 1);
                            }
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={row.quantity <= 1}
                          title="Μείωση"
                        >
                          −
                        </button>
                        
                        {editingRowId === row.id ? (
                          <input
                            type="number"
                            min="1"
                            value={editingQuantity}
                            onChange={(e) => setEditingQuantity(e.target.value)}
                            onBlur={() => {
                              const newQty = parseInt(editingQuantity);
                              if (!isNaN(newQty) && newQty > 0) {
                                handleUpdateQuantity(row.id, newQty);
                              }
                              setEditingRowId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newQty = parseInt(editingQuantity);
                                if (!isNaN(newQty) && newQty > 0) {
                                  handleUpdateQuantity(row.id, newQty);
                                }
                                setEditingRowId(null);
                              } else if (e.key === 'Escape') {
                                setEditingRowId(null);
                              }
                            }}
                            autoFocus
                            className="w-16 px-2 py-1 border-2 border-blue-500 rounded text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span 
                            onClick={() => {
                              setEditingRowId(row.id);
                              setEditingQuantity(row.quantity.toString());
                            }}
                            className="inline-block bg-slate-100 hover:bg-blue-50 px-3 py-1 rounded font-bold cursor-pointer transition-colors border-2 border-transparent hover:border-blue-200 min-w-[3rem]"
                            title="Κλικ για επεξεργασία"
                          >
                            {row.quantity}
                          </span>
                        )}
                        
                        <button
                          onClick={() => handleUpdateQuantity(row.id, row.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors"
                          title="Αύξηση"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-blue-700">
                      {formatNumber(row.weight)}
                    </td>
                    <td className="p-2 max-w-xs">
                      <input
                        type="text"
                        value={row.notes || ''}
                        onChange={(e) => {
                          setRows(rows.map(r =>
                            r.id === row.id ? { ...r, notes: e.target.value } : r
                          ));
                        }}
                        placeholder="Σημειώσεις..."
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:border-blue-400 focus:ring-1 focus:ring-blue-200 outline-none"
                      />
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleCopyRow(row.id)}
                          className="text-blue-500 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-full transition-colors"
                          title="Αντιγραφή γραμμής"
                        >
                          <Copy size={18} />
                        </motion.button>
                        <motion.button 
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveRow(row.id)}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-full transition-colors"
                          title="Διαγραφή"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                    Δεν έχουν προστεθεί υλικά ακόμα.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={4} className="p-4 text-right font-bold text-slate-700 text-lg">
                  <div className="flex flex-col items-end gap-1">
                    <span>ΣΥΝΟΛΙΚΟ ΒΑΡΟΣ:</span>
                    {(totalLength > 0 || totalArea > 0) && (
                      <span className="text-sm font-semibold text-slate-500">
                        {totalLength > 0 && (
                          <>Συνολικό Μήκος: <span className="font-mono text-slate-700">{formatNumber(totalLength)} m</span></>
                        )}
                        {totalLength > 0 && totalArea > 0 && <span className="mx-2">·</span>}
                        {totalArea > 0 && (
                          <>Συνολικά τ.μ.: <span className="font-mono text-slate-700">{formatNumber(totalArea)} m²</span></>
                        )}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4 text-right font-bold text-2xl text-blue-800 font-mono">
                  {formatNumber(totalWeight)} kg
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>


{/* Costing summary (optional) */}
{costingEnabled && (
  <div className="bg-white rounded-lg shadow-md p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
    <div className="flex items-center gap-3">
      <input
        id="useCostingForDoc"
        type="checkbox"
        checked={useCostingForDoc}
        onChange={(e) => setUseCostingForDoc(e.target.checked)}
      />
      <label htmlFor="useCostingForDoc" className="font-bold text-slate-700">
        Χρήση κοστολόγησης για αυτό το έγγραφο
      </label>
    </div>

    <div className="text-sm text-slate-700 flex flex-wrap items-center gap-4">
      <div>
        <span className="font-semibold">Τιμή / kg:</span>{" "}
        <span className="font-mono">{formatNumber(pricePerKg)} €</span>
      </div>
      <div className="font-bold">
        Σύνολο:{" "}
        <span className="font-mono text-lg text-emerald-700">
          {useCostingForDoc ? `${formatNumber(totalWeight * (pricePerKg || 0))} €` : "—"}
        </span>
      </div>
      <div className="text-xs text-slate-500">
        (Δεν εμφανίζεται στο τελικό report)
      </div>
    </div>
  </div>
)}

        {warnings.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle size={18} /> Έλεγχος στοιχείων
            </div>
            <ul className="mt-2 space-y-1 text-sm text-amber-900">
              {warnings.slice(0, 6).map((w, idx) => (
                <li key={idx} className={w.level === 'error' ? 'font-semibold' : ''}>• {w.msg}</li>
              ))}
              {warnings.length > 6 && (
                <li className="text-xs text-amber-700">+ {warnings.length - 6} ακόμη…</li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <button
            onClick={handleSaveAsTemplate}
            className="bg-white hover:bg-emerald-50 text-emerald-700 border-2 border-emerald-500 px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-sm transition-colors"
            title="Αποθήκευση της τρέχουσας λίστας υλικών ως Template"
          >
            <LayoutTemplate size={20} /> Αποθήκευση ως Template
          </button>

          <button
            onClick={handleCopyPack}
            className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
            title="Αντιγραφή σύνοψης (clipboard)"
          >
            <Clipboard size={20} /> Copy Pack
          </button>

          <button
            onClick={handleSavePdf}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
            title="Αποθήκευση σε PDF (desktop)"
          >
            <FileText size={20} /> Αποθήκευση PDF
          </button>

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
            title="Εκτύπωση"
          >
            <Printer size={20} /> Εκτύπωση
          </button>

          <button
            onClick={handlePrintWorkshop}
            className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-lg flex items-center gap-2 font-bold shadow-md transition-colors"
            title="Δελτίο Εργαστηρίου (χωρίς στοιχεία πελάτη, μεγάλα γράμματα, σχέδιο κοπής)"
          >
            <Printer size={20} /> Δελτίο Εργαστηρίου
          </button>
        </div>
      </main>

      {/* Modals */}
      


{/* Costing Modal */}
{showCostingModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCostingModal(false)}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold">Κοστολόγηση (προαιρετική)</h3>
        <button className="text-slate-600 hover:text-slate-900" onClick={() => setShowCostingModal(false)}>✕</button>
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={costingEnabled}
            onChange={(e) => {
              setCostingEnabled(e.target.checked);
              if (!e.target.checked) setUseCostingForDoc(false);
            }}
          />
          <span className="font-bold text-slate-700">Ενεργοποίηση κοστολόγησης</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Τιμή ανά κιλό (€ / kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={String(pricePerKg ?? 0)}
              onChange={(e) => setPricePerKg(parseFloat(e.target.value || "0") || 0)}
              className="w-full border rounded-lg px-3 py-2"
              disabled={!costingEnabled}
            />
          </div>

          <div className="bg-slate-50 rounded-lg p-3 border flex items-center justify-between">
            <div className="text-sm text-slate-700 font-semibold">Σύνολο (τρέχον έγγραφο)</div>
            <div className="font-mono font-bold text-emerald-700">
              {costingEnabled && useCostingForDoc ? `${formatNumber(totalWeight * (pricePerKg || 0))} €` : "—"}
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-600">
          Η κοστολόγηση είναι <span className="font-bold">μόνο για εσωτερική χρήση</span> και
          <span className="font-bold"> δεν αλλάζει</span> το Print Report / τελικό report.
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold"
            onClick={() => setShowCostingModal(false)}
          >
            Κλείσιμο
          </button>
        </div>
      </div>
    </div>
  </div>
)}


{/* Density Customization Modal */}
{showDensityCustomizationModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowDensityCustomizationModal(false)}>
    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="text-lg font-bold">Αλλαγή Πυκνοτήτων Υλικών</h3>
        <button className="text-slate-600 hover:text-slate-900" onClick={() => setShowDensityCustomizationModal(false)}>✕</button>
      </div>

      <div className="overflow-y-auto p-5 space-y-3">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-900 mb-4">
          <strong>Σημείωση:</strong> Οι αλλαγές πυκνότητας επηρεάζουν τους υπολογισμούς βάρους. Οι προεπιλεγμένες τιμές είναι σε kg/m³.
        </div>

        <div className="grid gap-4">
          {/* Materials */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">Υλικά (Materials)</h4>
            <div className="grid gap-2">
              {Object.entries(materials).map(([key, material]) => {
                const defaultDensity = initialMaterials[key]?.density || material.density;
                const customDensity = customDensities[`material_${key}`];
                const currentDensity = customDensity !== undefined ? customDensity : defaultDensity;
                
                return (
                  <div key={key} className="bg-slate-50 rounded-lg p-3 border flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{material.label}</div>
                      <div className="text-xs text-slate-500">Προεπιλογή: {defaultDensity} kg/m³</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={currentDensity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val && val > 0) {
                            setCustomDensities(prev => ({...prev, [`material_${key}`]: val}));
                          }
                        }}
                        className="w-24 border rounded px-2 py-1 text-sm text-right"
                      />
                      <span className="text-sm text-slate-600">kg/m³</span>
                      {customDensity !== undefined && (
                        <button
                          onClick={() => {
                            setCustomDensities(prev => {
                              const newDensities = {...prev};
                              delete newDensities[`material_${key}`];
                              return newDensities;
                            });
                          }}
                          className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded"
                          title="Επαναφορά"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sheet Types */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">Λαμαρίνες (Sheets)</h4>
            <div className="grid gap-2">
              {Object.entries(sheetTypes).map(([key, sheet]) => {
                const defaultDensity = initialSheetTypes[key]?.density || sheet.density;
                const customDensity = customDensities[`sheet_${key}`];
                const currentDensity = customDensity !== undefined ? customDensity : defaultDensity;
                
                return (
                  <div key={key} className="bg-slate-50 rounded-lg p-3 border flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Λαμαρίνα {sheet.label}</div>
                      <div className="text-xs text-slate-500">Προεπιλογή: {defaultDensity} kg/m³</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={currentDensity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val && val > 0) {
                            setCustomDensities(prev => ({...prev, [`sheet_${key}`]: val}));
                          }
                        }}
                        className="w-24 border rounded px-2 py-1 text-sm text-right"
                      />
                      <span className="text-sm text-slate-600">kg/m³</span>
                      {customDensity !== undefined && (
                        <button
                          onClick={() => {
                            setCustomDensities(prev => {
                              const newDensities = {...prev};
                              delete newDensities[`sheet_${key}`];
                              return newDensities;
                            });
                          }}
                          className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded"
                          title="Επαναφορά"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipe Types */}
          <div>
            <h4 className="font-bold text-slate-800 mb-2 text-lg">Σωλήνες (Pipes)</h4>
            <div className="grid gap-2">
              {Object.entries(pipeTypes).map(([key, pipe]) => {
                const defaultDensity = initialPipeTypes[key]?.density || pipe.density;
                const customDensity = customDensities[`pipe_${key}`];
                const currentDensity = customDensity !== undefined ? customDensity : defaultDensity;
                
                return (
                  <div key={key} className="bg-slate-50 rounded-lg p-3 border flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Σωλήνας {pipe.label}</div>
                      <div className="text-xs text-slate-500">Προεπιλογή: {defaultDensity} kg/m³</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={currentDensity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val && val > 0) {
                            setCustomDensities(prev => ({...prev, [`pipe_${key}`]: val}));
                          }
                        }}
                        className="w-24 border rounded px-2 py-1 text-sm text-right"
                      />
                      <span className="text-sm text-slate-600">kg/m³</span>
                      {customDensity !== undefined && (
                        <button
                          onClick={() => {
                            setCustomDensities(prev => {
                              const newDensities = {...prev};
                              delete newDensities[`pipe_${key}`];
                              return newDensities;
                            });
                          }}
                          className="text-xs px-2 py-1 bg-slate-200 hover:bg-slate-300 rounded"
                          title="Επαναφορά"
                        >
                          ↺
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t p-4 bg-slate-50 flex justify-between items-center">
        <button
          onClick={() => {
            if (confirm('Επαναφορά όλων των πυκνοτήτων στις προεπιλεγμένες τιμές;')) {
              setCustomDensities({});
            }
          }}
          className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-sm"
        >
          Επαναφορά Όλων
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
          onClick={() => setShowDensityCustomizationModal(false)}
        >
          Κλείσιμο
        </button>
      </div>
    </div>
  </div>
)}


{/* Material Comparison Modal */}
{showComparisonModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowComparisonModal(false)}>
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" 
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-5 border-b">
        <h3 className="text-lg font-bold">🔄 Σύγκριση Υλικών</h3>
        <button className="text-slate-600 hover:text-slate-900" onClick={() => setShowComparisonModal(false)}>✕</button>
      </div>

      <div className="overflow-y-auto p-5">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded text-sm text-blue-900 mb-4">
          <strong>Επιλέξτε έως 4 υλικά</strong> για σύγκριση βάρους ανά μέτρο με το ίδιο πάχος/διατομή
        </div>

        {/* Material Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="border rounded-lg p-4 bg-slate-50">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Υλικό #{index + 1}
              </label>
              <select
                value={comparisonMaterials[index] || ''}
                onChange={(e) => {
                  const newComparison = [...comparisonMaterials];
                  newComparison[index] = e.target.value;
                  setComparisonMaterials(newComparison.filter(Boolean));
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- Επιλογή --</option>
                <optgroup label="Δοκοί & Προφίλ">
                  {Object.entries(materials).map(([k, m]) => (
                    <option key={k} value={`mat:${k}`}>{getMaterialIcon(m.type, k)} {m.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          ))}
        </div>

        {/* Comparison Results */}
        {comparisonMaterials.length >= 2 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3 text-left font-bold">Υλικό</th>
                  <th className="p-3 text-left font-bold">Τύπος</th>
                  <th className="p-3 text-right font-bold">Πυκνότητα (kg/m³)</th>
                  <th className="p-3 text-right font-bold">Τυπικό Βάρος/μέτρο</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comparisonMaterials.map((matId, idx) => {
                  const [kind, key] = matId.split(':');
                  if (kind !== 'mat') return null;
                  const mat = materials[key];
                  if (!mat) return null;
                  
                  const density = getEffectiveDensity('material', key, mat.density || 7850);
                  const typicalSize = mat.sizes?.[0];
                  const typicalWeight = typicalSize && 'wpm' in typicalSize 
                    ? (typicalSize as any).wpm 
                    : '~';

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold">{getMaterialIcon(mat.type, key)} {mat.label}</td>
                      <td className="p-3 text-slate-600">{mat.type}</td>
                      <td className="p-3 text-right font-mono">{density}</td>
                      <td className="p-3 text-right font-mono font-bold text-blue-700">
                        {typeof typicalWeight === 'number' ? `${typicalWeight} kg/m` : typicalWeight}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="border-t p-4 bg-slate-50 flex justify-end">
        <button
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
          onClick={() => setShowComparisonModal(false)}
        >
          Κλείσιμο
        </button>
      </div>
    </motion.div>
  </div>
)}


      {/* Reports Folder Modal */}
      {showReportFolderModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowReportFolderModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Φάκελος Reports</h3>
              <button className="text-slate-600 hover:text-slate-900" onClick={() => setShowReportFolderModal(false)}>✕</button>
            </div>

            <div className="text-sm text-slate-700 mb-3">
              Όταν οριστεί φάκελος, τα reports (HTML) αποθηκεύονται εκεί αυτόματα με όνομα:
              <span className="font-mono"> ΑΡΙΘΜΟΣ_ΠΕΛΑΤΗΣ_DD-MM-YYYY.html</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border text-sm">
              <div className="font-semibold mb-1">Τρέχων φάκελος</div>
              <div className="break-all">{reportFolder || <span className="text-slate-500">Δεν έχει οριστεί</span>}</div>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                onClick={async () => {
                  try {
                    if (window.mwDB?.report?.chooseFolder) {
                      const r = await window.mwDB.report.chooseFolder();
                      if (r?.ok && r.folder) setReportFolder(r.folder);
                    } else {
                      alert("Η επιλογή φακέλου είναι διαθέσιμη μόνο στο EXE (desktop).");
                    }
                  } catch {}
                }}
              >
                Επιλογή φακέλου…
              </button>

              <button
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold"
                onClick={async () => {
                  try {
                    if (window.mwDB?.report?.clearFolder) {
                      await window.mwDB.report.clearFolder();
                      setReportFolder("");
                    } else {
                      localStorage.removeItem(REPORT_FOLDER_UI_KEY);
                      setReportFolder("");
                    }
                  } catch {}
                }}
              >
                Καθαρισμός
              </button>

              <button
                className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold ml-auto"
                onClick={() => setShowReportFolderModal(false)}
              >
                ΟΚ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4" onMouseDown={() => setShowGlobalSearch(false)}>
          <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden mt-10" onMouseDown={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center gap-2">
              <Search size={18} className="text-slate-500" />
              <input
                ref={globalSearchInputRef}
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setGlobalSearchIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setGlobalSearchIndex((i) => Math.min(i + 1, Math.max(totalGlobalHits - 1, 0)));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setGlobalSearchIndex((i) => Math.max(i - 1, 0));
                    return;
                  }
                  if (e.key === 'Enter') {
                    if (totalGlobalHits <= 0) return;
                    e.preventDefault();
                    if (globalSearchIndex < globalCustomerHits.length) {
                      const c = globalCustomerHits[globalSearchIndex];
                      setCustomer(c.name);
                      setCustomerPhone(normalizePhone(c.phone));
                      setShowGlobalSearch(false);
                      return;
                    }
                    const docIdx = globalSearchIndex - globalCustomerHits.length;
                    const o = globalDocHits[docIdx];
                    if (o) {
                      loadSavedOrder(o, true);
                      setShowGlobalSearch(false);
                    }
                    return;
                  }
                  if (e.key === 'Escape') {
                    setShowGlobalSearch(false);
                  }
                }}
                placeholder="Αναζήτηση: αριθμός, πελάτης, τηλέφωνο, υλικό, διαστάσεις…"
                className="flex-1 px-3 py-2 outline-none"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowGlobalSearch(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
                title="Κλείσιμο"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {!globalQ ? (
                <div className="p-4 text-sm text-slate-500">Γράψε κάτι για αναζήτηση…</div>
              ) : (
                <div className="py-2">
                  <div className="px-4 pt-2 pb-1 text-xs font-bold text-slate-500 uppercase">Πελάτες</div>
                  {globalCustomerHits.length === 0 ? (
                    <div className="px-4 pb-3 text-sm text-slate-500">Κανένας πελάτης</div>
                  ) : (
                    globalCustomerHits.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                          idx === globalSearchIndex ? 'bg-blue-100' : ''
                        }`}
                        onMouseEnter={() => setGlobalSearchIndex(idx)}
                        onClick={() => {
                          setCustomer(c.name);
                          setCustomerPhone(normalizePhone(c.phone));
                          setShowGlobalSearch(false);
                        }}
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-sm text-slate-500">{formatPhone(c.phone)}</div>
                      </button>
                    ))
                  )}

                  <div className="px-4 pt-3 pb-1 text-xs font-bold text-slate-500 uppercase">Παραγγελίες / Προσφορές</div>
                  {globalDocHits.length === 0 ? (
                    <div className="px-4 pb-3 text-sm text-slate-500">Κανένα αποτέλεσμα</div>
                  ) : (
                    globalDocHits.map((o, idx) => {
                      const abs = globalCustomerHits.length + idx;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={`w-full text-left px-4 py-2 hover:bg-blue-50 ${
                            abs === globalSearchIndex ? 'bg-blue-100' : ''
                          }`}
                          onMouseEnter={() => setGlobalSearchIndex(abs)}
                          onClick={() => {
                            loadSavedOrder(o, true);
                            setShowGlobalSearch(false);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-mono font-bold">{o.orderNum}</div>
                            <div className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-700">
                              {o.mode === 'OFFER' ? 'ΠΡΟΣΦΟΡΑ' : 'ΠΑΡΑΓΓΕΛΙΑ'}
                            </div>
                          </div>
                          <div className="text-sm text-slate-700">{o.customer || '—'}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(o.date).toLocaleDateString('el-GR')} • {o.project || '—'} • {formatNumber(o.totalWeight)} kg
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="p-3 border-t text-xs text-slate-500 flex justify-between">
              <span>Enter: επιλογή • ↑/↓: κίνηση • Esc: κλείσιμο</span>
              <span className="font-mono">Ctrl+K</span>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Density Modal (Ctrl+Shift+D) */}
      {showDensityModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onMouseDown={() => setShowDensityModal(false)}>
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Πυκνότητα (Global)</h3>
              <button type="button" onClick={() => setShowDensityModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Κρυφή ρύθμιση: αν οριστεί, εφαρμόζεται σε <b>όλους</b> τους υπολογισμούς (kg/m³). Άφησέ το κενό για default.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-bold text-slate-700 mb-1">kg/m³</label>
              <input
                value={densityDraft}
                onChange={(e) => setDensityDraft(e.target.value)}
                placeholder="7850"
                className="w-full border border-slate-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setGlobalDensityOverride(null);
                  setDensityDraft('');
                  setShowDensityModal(false);
                }}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold"
              >
                Απενεργοποίηση
              </button>
              <button
                type="button"
                onClick={() => setShowDensityModal(false)}
                className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold"
              >
                Άκυρο
              </button>
              <button
                type="button"
                onClick={() => {
                  const n = parseFloat((densityDraft || '').replace(',', '.'));
                  if (Number.isFinite(n) && n > 0) setGlobalDensityOverride(n);
                  else setGlobalDensityOverride(null);
                  setShowDensityModal(false);
                }}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Αποθήκευση
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-500">
              Συντόμευση: <span className="font-mono">Ctrl+Shift+D</span>
            </div>
          </div>
        </div>
      )}

<CustomerManager
        isOpen={showCustomerManager}
        onClose={() => setShowCustomerManager(false)}
        customers={customers}
        onUpdateCustomers={setCustomers}
        onSelectCustomer={(c) => {
          setCustomer(c.name);
          setCustomerPhone(normalizePhone(c.phone));
          setShowCustomerManager(false);
        }}
      />

      <OrderHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        history={orderHistory}
        onDelete={(id) => setOrderHistory(orderHistory.filter(h => h.id !== id))}
        onLoad={(order) => {
          if (confirm('Φόρτωση; Τα τρέχοντα δεδομένα θα αντικατασταθούν.')) {
            setMode(order.mode);
            setOrderNum(order.orderNum);
            setCustomer(order.customer);
            setCustomerPhone(normalizePhone(order.customerPhone));
            setProject(order.project);
            
            // Migration fix: Clean up thickness for materials that don't require it
            const cleanedRows = (order.rows || []).map((row: OrderItem) => {
              const cat = (row.category || '').toLowerCase();
              const shouldHaveThickness = 
                cat.includes('λαμαρίνα') || 
                cat.includes('σωλήνα') || 
                cat.includes('γωνί') ||
                cat.includes('λάμα') ||
                cat.includes('flat') ||
                cat.includes('rhs') ||
                cat.includes('chs');
              
              // If material shouldn't have thickness but has 0, set to null
              if (!shouldHaveThickness && (row.thickness === 0 || row.thickness === null || row.thickness === undefined)) {
                return { ...row, thickness: null };
              }
              return row;
            });
            
            setRows(cleanedRows);
            setSelectedFinishes(Array.isArray(order.finishes) ? order.finishes : []);
            requestClean();
            setShowHistory(false);
          }
        }}
      />

      <MaterialEditor
        isOpen={showMaterialEditor}
        onClose={() => setShowMaterialEditor(false)}
        materials={materials}
        sheetTypes={sheetTypes}
        pipeTypes={pipeTypes}
        onUpdateMaterials={setMaterials}
        onUpdateSheetTypes={setSheetTypes}
        onUpdatePipeTypes={setPipeTypes}
      />
      {/* Pinned Summary + Quick actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="text-sm">
              <span className="text-slate-600">Τύπος:</span>{' '}
              <span className="font-bold">{mode === 'ORDER' ? 'ΠΑΡΑΓΓΕΛΙΑ' : 'ΠΡΟΣΦΟΡΑ'}</span>{' '}
              <span className="font-mono">#{orderNum || '—'}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-600">Σύνολο:</span>{' '}
              <span className="font-bold">{formatNumber(totalWeight)} kg</span>
            </div>
            <div className="text-sm text-slate-600">
              Γραμμές: <span className="font-bold text-slate-900">{rows.length}</span>
            </div>
            {warnings.length > 0 && (
              <div className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold flex items-center gap-1">
                <AlertTriangle size={14} /> {warnings.filter(w => w.level==='error').length > 0 ? 'Διόρθωσε λάθη' : 'Προειδοποιήσεις'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNewOrder}
              className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-sm"
              title="Νέα (καθαρισμός)"
            >
              Νέα
            </button>
            <button
              type="button"
              onClick={openGlobalSearch}
              className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 font-bold text-sm flex items-center gap-2"
              title="Αναζήτηση (Ctrl+K)"
            >
              <Search size={16} /> Αναζήτηση
            </button>
            <button
              type="button"
              onClick={handleCopyPack}
              className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-sm flex items-center gap-2"
              title="Copy Pack"
            >
              <Clipboard size={16} /> Copy
            </button>
            <button
              type="button"
              onClick={handleSavePdf}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2"
              title="Αποθήκευση PDF"
            >
              <FileText size={16} /> PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm flex items-center gap-2"
              title="Εκτύπωση"
            >
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard 
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        orderHistory={orderHistory}
      />

      {/* Customer History */}
      <CustomerHistory 
        isOpen={showCustomerHistory}
        onClose={() => setShowCustomerHistory(false)}
        orderHistory={orderHistory}
        onLoadOrder={loadSavedOrder}
      />

      {/* Templates */}
      <TemplatesManager
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        templates={templates}
        onLoadTemplate={handleLoadTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* Supplier Order Form */}
      <SupplierOrderForm
        isOpen={showSupplierOrder}
        onClose={() => setShowSupplierOrder(false)}
        materials={materials}
        sheetTypes={sheetTypes}
        pipeTypes={pipeTypes}
      />

      {/* Fence Calculator */}
      <FenceCalculator
        isOpen={showFenceCalculator}
        onClose={() => setShowFenceCalculator(false)}
        materials={materials}
        pipeTypes={pipeTypes}
        sheetTypes={sheetTypes}
        getEffectiveDensity={getEffectiveDensity}
        onAddRows={handleAddFenceRows}
        onSendRailsToCutList={handleSendRailsToCutList}
      />

      <UpdatesModal isOpen={showUpdates} onClose={() => setShowUpdates(false)} />

      {/* Cutting List */}
      <CuttingListModal
        isOpen={showCuttingList}
        onClose={() => setShowCuttingList(false)}
        initialPieces={cutListPrefill}
      />

      {/* Hidden file input for web-fallback report import */}
      <input
        ref={importReportInputRef}
        type="file"
        accept=".html,.htm,.json"
        onChange={handleImportReportFileChange}
        className="hidden"
      />

    </div>
  );
}