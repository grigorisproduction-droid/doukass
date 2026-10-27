import React, { useState, useMemo } from 'react';
import { X, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { Material, MaterialSize, PipeType, SheetType, OrderItem } from '../types';
import {
  computeFence, computeAccessories, FenceParams, FenceTemplate, Terrain, Infill,
  AccessoryBasis, AccessoryDef, PostClass, TEMPLATE_DEFAULTS
} from '../utils/fence';
import { calcWeightPerMeter, calcSheetWeight, formatNumber, parseNumber } from '../utils/calculations';
import { getMaterialIcon, getPipeIcon } from '../utils/materialIcons';

interface FenceCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Record<string, Material>;
  pipeTypes: Record<string, PipeType>;
  sheetTypes: Record<string, SheetType>;
  getEffectiveDensity: (type: 'material' | 'sheet' | 'pipe', key: string, defaultDensity: number) => number;
  onAddRows: (rows: OrderItem[]) => void;
  onSendRailsToCutList?: (pieces: { length: number; qty: number }[]) => void;
}

type Kind = 'mat' | 'pipe';

interface PickerState {
  kind: Kind;
  key: string;
  sizeCode: string;
  thickness: string;
}

interface SegState { id: number; length: string; height: string }

interface AccState {
  id: string;
  label: string;
  basis: AccessoryBasis;
  perUnit: string;
  unitWeight: string;
  enabled: boolean;
}

const emptyPicker: PickerState = { kind: 'pipe', key: '', sizeCode: '', thickness: '' };

const TEMPLATE_LABEL: Record<FenceTemplate, string> = {
  fence: 'Περίφραξη',
  balcony: 'Μπαλκονόκαγκελο',
  stairs: 'Κάγκελο σκάλας'
};

const POST_CLASS_LABEL: Record<PostClass, string> = {
  line: 'Στύλοι γραμμής',
  corner: 'Γωνιακοί / ακραίοι στύλοι',
  gate: 'Στύλοι πύλης'
};

const BASIS_LABEL: Record<AccessoryBasis, string> = {
  post: 'ανά στύλο',
  gate: 'ανά πύλη',
  span: 'ανά άνοιγμα'
};

const INITIAL_ACCS: AccState[] = [
  { id: 'caps', label: 'Καπάκια στύλων', basis: 'post', perUnit: '1', unitWeight: '0', enabled: false },
  { id: 'anchors', label: 'Αγκύρια / βίδες στήριξης', basis: 'post', perUnit: '4', unitWeight: '0', enabled: false },
  { id: 'hinges', label: 'Μεντεσέδες πύλης', basis: 'gate', perUnit: '2', unitWeight: '0', enabled: false },
  { id: 'lock', label: 'Κλειδαριά / μάνδαλο πύλης', basis: 'gate', perUnit: '1', unitWeight: '0', enabled: false }
];

const mmOf = (m: number) => Math.round(m * 1000);
let segCounter = 1;

// ---------- small presentational helpers (defined outside so they keep their identity between renders) ----------

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} className="w-full border border-slate-300 rounded px-2 py-1.5" />
      {hint && <div className="text-[11px] text-slate-400 mt-0.5">{hint}</div>}
    </div>
  );
}

interface PickerCtx {
  categoryOptions: { value: string; label: string }[];
  sizesFor: (p: PickerState) => MaterialSize[];
  thicknessesFor: (p: PickerState) => number[];
  setPicked: (setter: (p: PickerState) => void, raw: string) => void;
}

function PickerBlock({ title, subtitle, p, setP, ctx }: {
  title: string; subtitle?: string; p: PickerState; setP: (p: PickerState) => void; ctx: PickerCtx;
}) {
  const thicknesses = ctx.thicknessesFor(p);
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <div className="text-sm font-bold text-slate-700">{title}</div>
      {subtitle && <div className="text-[11px] text-slate-500 mb-2">{subtitle}</div>}
      <div className={`grid grid-cols-3 gap-2 ${subtitle ? '' : 'mt-2'}`}>
        <select
          value={p.key ? `${p.kind}:${p.key}` : ''}
          onChange={(e) => ctx.setPicked(setP, e.target.value)}
          className="col-span-3 border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
        >
          <option value="">-- Υλικό --</option>
          {ctx.categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {p.key && (
          <select
            value={p.sizeCode}
            onChange={(e) => setP({ ...p, sizeCode: e.target.value, thickness: '' })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">-- Μέγεθος --</option>
            {ctx.sizesFor(p).map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
        )}
        {p.key && p.sizeCode && thicknesses.length > 0 && (
          <select
            value={p.thickness}
            onChange={(e) => setP({ ...p, thickness: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
          >
            <option value="">-- Πάχος --</option>
            {thicknesses.map(t => <option key={t} value={t}>{t} mm</option>)}
          </select>
        )}
      </div>
    </div>
  );
}

export default function FenceCalculator({
  isOpen, onClose, materials, pipeTypes, sheetTypes, getEffectiveDensity, onAddRows, onSendRailsToCutList
}: FenceCalculatorProps) {
  const [template, setTemplate] = useState<FenceTemplate>('fence');

  const [totalLength, setTotalLength] = useState(TEMPLATE_DEFAULTS.fence.totalLength);
  const [height, setHeight] = useState(TEMPLATE_DEFAULTS.fence.height);
  const [spacing, setSpacing] = useState(TEMPLATE_DEFAULTS.fence.spacing);
  const [embed, setEmbed] = useState(TEMPLATE_DEFAULTS.fence.embed);
  const [rails, setRails] = useState(TEMPLATE_DEFAULTS.fence.rails);
  const [gates, setGates] = useState(TEMPLATE_DEFAULTS.fence.gates);
  const [gateWidth, setGateWidth] = useState(TEMPLATE_DEFAULTS.fence.gateWidth);
  const [closed, setClosed] = useState(TEMPLATE_DEFAULTS.fence.closed);

  const [terrain, setTerrain] = useState<Terrain>('flat');
  const [rise, setRise] = useState('0');
  const [segments, setSegments] = useState<SegState[]>([
    { id: segCounter++, length: '5', height: '1.2' },
    { id: segCounter++, length: '5', height: '1.5' }
  ]);

  const [corners, setCorners] = useState('0');
  const [cornerExtra, setCornerExtra] = useState('0');
  const [gateExtra, setGateExtra] = useState('0.2');

  const [infill, setInfill] = useState<Infill>('rails');
  const [picketPitchCm, setPicketPitchCm] = useState('12');
  const [groundGapCm, setGroundGapCm] = useState('5');
  const [meshKgPerM2, setMeshKgPerM2] = useState('0');
  const [meshLabel, setMeshLabel] = useState('Πάνελ περίφραξης');
  const [sheetKey, setSheetKey] = useState('');
  const [sheetThickness, setSheetThickness] = useState('');

  const [post, setPost] = useState<PickerState>(emptyPicker);
  const [corner, setCorner] = useState<PickerState>(emptyPicker);
  const [gate, setGate] = useState<PickerState>(emptyPicker);
  const [rail, setRail] = useState<PickerState>(emptyPicker);
  const [picket, setPicket] = useState<PickerState>(emptyPicker);

  const [plateEnabled, setPlateEnabled] = useState(false);
  const [plateW, setPlateW] = useState('150');
  const [plateH, setPlateH] = useState('150');
  const [plateT, setPlateT] = useState('8');
  const [accs, setAccs] = useState<AccState[]>(INITIAL_ACCS);

  const applyTemplate = (t: FenceTemplate) => {
    const d = TEMPLATE_DEFAULTS[t];
    setTemplate(t);
    setTotalLength(d.totalLength); setHeight(d.height); setSpacing(d.spacing); setEmbed(d.embed);
    setRails(d.rails); setGates(d.gates); setGateWidth(d.gateWidth); setClosed(d.closed);
    setTerrain(d.terrain); setRise(d.rise); setCorners(d.corners);
    setInfill(d.infill);
    setPicketPitchCm(String(Math.round(parseFloat(d.picketPitch) * 100)));
    setGroundGapCm(String(Math.round(parseFloat(d.groundGap) * 100)));
    setPlateEnabled(d.basePlates);
  };

  const params: FenceParams = {
    totalLength: parseNumber(totalLength),
    height: parseNumber(height),
    spacing: parseNumber(spacing),
    embed: parseNumber(embed),
    rails: parseNumber(rails),
    gates: parseNumber(gates),
    gateWidth: parseNumber(gateWidth),
    closed,
    terrain,
    rise: parseNumber(rise),
    segments: segments.map(s => ({ length: parseNumber(s.length), height: parseNumber(s.height) })),
    corners: parseNumber(corners),
    cornerExtra: parseNumber(cornerExtra),
    gateExtra: parseNumber(gateExtra),
    infill,
    picketPitch: parseNumber(picketPitchCm) / 100,
    groundGap: parseNumber(groundGapCm) / 100
  };

  const paramsKey = JSON.stringify(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => computeFence(params), [paramsKey]);

  const accDefs: AccessoryDef[] = accs.map(a => ({
    id: a.id, label: a.label, basis: a.basis, perUnit: parseNumber(a.perUnit),
    unitWeight: parseNumber(a.unitWeight), enabled: a.enabled
  }));
  const accLines = computeAccessories(accDefs, result, params.gates);

  // ---------- material pickers ----------
  const categoryOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    Object.entries(materials)
      .filter(([, m]) => m.type !== 'pipe_group')
      .forEach(([k, m]) => opts.push({ value: `mat:${k}`, label: `${getMaterialIcon(m.type, k)} ${m.label}` }));
    Object.entries(pipeTypes)
      .forEach(([k, m]) => opts.push({ value: `pipe:${k}`, label: `${getPipeIcon(k)} Σωλήνα ${m.label}` }));
    return opts;
  }, [materials, pipeTypes]);

  const sizesFor = (p: PickerState): MaterialSize[] => {
    if (!p.key) return [];
    if (p.kind === 'mat') return materials[p.key]?.sizes || [];
    return pipeTypes[p.key]?.sizes || [];
  };

  const thicknessesFor = (p: PickerState): number[] => {
    if (!p.key || !p.sizeCode) return [];
    const size = sizesFor(p).find(s => s.code === p.sizeCode);
    return size?.thicknesses || [];
  };

  const setPicked = (setter: (p: PickerState) => void, raw: string) => {
    if (!raw) { setter(emptyPicker); return; }
    const [kind, key] = raw.split(':');
    setter({ kind: kind as Kind, key, sizeCode: '', thickness: '' });
  };

  const ctx: PickerCtx = { categoryOptions, sizesFor, thicknessesFor, setPicked };

  const isReady = (p: PickerState) =>
    !!(p.key && p.sizeCode && (thicknessesFor(p).length === 0 || p.thickness));

  const postReady = isReady(post);
  const cornerReady = isReady(corner);
  const gateReady = isReady(gate);
  const railReady = isReady(rail);
  const picketReady = isReady(picket);

  const sheetThicknesses = sheetKey ? (sheetTypes[sheetKey]?.thicknesses || []) : [];
  const sheetReady = !!(sheetKey && sheetThickness);
  const meshReady = infill === 'mesh';

  // ---------- row builders ----------
  const buildRowFromPicker = (p: PickerState, lengthM: number, qty: number, notes: string): OrderItem | null => {
    if (!p.key || !p.sizeCode || qty <= 0 || lengthM <= 0) return null;
    const idv = () => Date.now() + Math.random();

    if (p.kind === 'mat') {
      const mat = materials[p.key];
      const size = mat?.sizes?.find(s => s.code === p.sizeCode);
      if (!mat || !size) return null;
      if (mat.type === 'wpm') {
        const weight = (size.wpm || 0) * lengthM * qty;
        return {
          id: idv(), category: mat.label, section: size.label,
          thickness: null, dimensions: `L=${formatNumber(lengthM)}m`, quantity: qty, weight, notes,
          metadata: { materialType: 'wpm', materialKey: p.key, sizeCode: p.sizeCode, density: mat.density || 7850, wpm: size.wpm || 0 }
        };
      }
      const t = mat.requiresThickness ? parseNumber(p.thickness) : 0;
      const density = getEffectiveDensity('material', p.key, mat.density || 7850);
      const wpm = calcWeightPerMeter(mat.type, size, t, density);
      return {
        id: idv(), category: mat.label, section: size.label,
        thickness: mat.requiresThickness ? t : null, dimensions: `L=${formatNumber(lengthM)}m`, quantity: qty,
        weight: wpm * lengthM * qty, notes,
        metadata: { materialType: 'profile', materialKey: p.key, sizeCode: p.sizeCode, density }
      };
    }

    const type = pipeTypes[p.key];
    const size = type?.sizes.find(s => s.code === p.sizeCode);
    if (!size) return null;
    const t = parseNumber(p.thickness);
    const density = getEffectiveDensity('pipe', p.key, type.density);
    const wpm = calcWeightPerMeter('chs', size, t, density);
    return {
      id: idv(), category: `Σωλήνα ${type.label}`, section: size.label,
      thickness: t, dimensions: `L=${formatNumber(lengthM)}m`, quantity: qty, weight: wpm * lengthM * qty, notes,
      metadata: { materialType: 'pipe', pipeTypeKey: p.key, sizeCode: p.sizeCode, density }
    };
  };

  // Which picker will supply each group of posts. Corner / gate posts without their own
  // material fall back to the line-post material.
  const pickerFor = (cls: PostClass): { which: 'post' | 'corner' | 'gate'; p: PickerState; ready: boolean } => {
    if (cls === 'corner' && cornerReady) return { which: 'corner', p: corner, ready: true };
    if (cls === 'gate' && gateReady) return { which: 'gate', p: gate, ready: true };
    return { which: 'post', p: post, ready: postReady };
  };

  const buildRows = (): OrderItem[] => {
    const out: OrderItem[] = [];
    const tl = TEMPLATE_LABEL[template];

    // posts (merge groups that share material and length)
    const merged = new Map<string, { p: PickerState; length: number; qty: number; classes: Set<PostClass> }>();
    result.postGroups.forEach(g => {
      const pk = pickerFor(g.cls);
      if (!pk.ready) return;
      const key = `${pk.which}:${mmOf(g.length)}`;
      const cur = merged.get(key);
      if (cur) { cur.qty += g.qty; cur.classes.add(g.cls); }
      else merged.set(key, { p: pk.p, length: g.length, qty: g.qty, classes: new Set([g.cls]) });
    });
    merged.forEach(m => {
      const what = Array.from(m.classes).map(c => POST_CLASS_LABEL[c]).join(' + ');
      const r = buildRowFromPicker(m.p, m.length, m.qty, `${tl} – ${what}`);
      if (r) out.push(r);
    });

    // horizontal rails
    if (railReady) {
      result.railGroups.forEach(g => {
        const r = buildRowFromPicker(rail, g.length, g.qty, `${tl} – οριζόντιες`);
        if (r) out.push(r);
      });
    }

    // vertical pickets
    if (infill === 'pickets' && picketReady) {
      result.picketGroups.forEach(g => {
        const r = buildRowFromPicker(picket, g.length, g.qty, `${tl} – κάθετα`);
        if (r) out.push(r);
      });
    }

    // mesh panels
    if (infill === 'mesh') {
      const kg = parseNumber(meshKgPerM2);
      result.panelGroups.forEach(g => {
        out.push({
          id: Date.now() + Math.random(),
          category: 'Πλέγμα / Πάνελ',
          section: meshLabel.trim() || 'Πάνελ περίφραξης',
          thickness: null,
          dimensions: `${mmOf(g.width)}x${mmOf(g.height)}mm`,
          quantity: g.qty,
          weight: kg * g.width * g.height * g.qty,
          notes: `${tl} – πάνελ`
        });
      });
    }

    // sheet panels
    if (infill === 'sheet' && sheetReady) {
      const type = sheetTypes[sheetKey];
      const t = parseNumber(sheetThickness);
      const density = getEffectiveDensity('sheet', sheetKey, type.density);
      result.panelGroups.forEach(g => {
        const w = mmOf(g.width);
        const h = mmOf(g.height);
        out.push({
          id: Date.now() + Math.random(),
          category: `Λαμαρίνα ${type.label}`,
          section: `t=${t}mm`,
          thickness: t,
          dimensions: `${w}x${h}mm`,
          quantity: g.qty,
          weight: calcSheetWeight(w, h, t, density) * g.qty,
          notes: `${tl} – φύλλα`,
          metadata: { materialType: 'sheet', sheetTypeKey: sheetKey, density }
        });
      });
    }

    // base plates (one per post)
    if (plateEnabled && result.totalPosts > 0) {
      const w = parseNumber(plateW);
      const h = parseNumber(plateH);
      const t = parseNumber(plateT);
      if (w > 0 && h > 0 && t > 0) {
        const black = sheetTypes['black'];
        const density = black ? getEffectiveDensity('sheet', 'black', black.density) : 7850;
        out.push({
          id: Date.now() + Math.random(),
          category: 'Πλάκα βάσης',
          section: `t=${t}mm`,
          thickness: t,
          dimensions: `${w}x${h}mm`,
          quantity: result.totalPosts,
          weight: calcSheetWeight(w, h, t, density) * result.totalPosts,
          notes: `${tl} – πλάκες βάσης στύλων`,
          metadata: black ? { materialType: 'sheet', sheetTypeKey: 'black', density } : undefined
        });
      }
    }

    // other accessories
    accLines.forEach(a => {
      out.push({
        id: Date.now() + Math.random(),
        category: 'Παρελκόμενα',
        section: a.label,
        thickness: null,
        dimensions: '—',
        quantity: a.qty,
        weight: a.unitWeight * a.qty,
        notes: tl
      });
    });

    return out;
  };

  const anythingToAdd =
    postReady || cornerReady || gateReady || railReady ||
    (infill === 'pickets' && picketReady) || meshReady || (infill === 'sheet' && sheetReady) ||
    plateEnabled || accLines.length > 0;

  const handleAdd = () => {
    if (!result.valid) return;
    const newRows = buildRows();
    if (newRows.length === 0) {
      alert('Επίλεξε τουλάχιστον ένα υλικό (στύλους, οριζόντιες, κ.λπ.) για να προστεθεί στην παραγγελία.');
      return;
    }
    onAddRows(newRows);
    onClose();
  };

  // ---------- cutting plan hand-off ----------
  const toPieces = (groups: { length: number; qty: number }[]) => {
    const byLen = new Map<number, number>();
    groups.forEach(g => byLen.set(mmOf(g.length), (byLen.get(mmOf(g.length)) || 0) + g.qty));
    return Array.from(byLen.entries()).sort((a, b) => b[0] - a[0]).map(([length, qty]) => ({ length, qty }));
  };

  const sendRails = () => {
    if (result.railPieces > 0) onSendRailsToCutList?.(toPieces(result.railGroups));
  };
  const sendPickets = () => {
    if (result.picketCount > 0) onSendRailsToCutList?.(toPieces(result.picketGroups));
  };
  const sendPosts = () => {
    // only posts that use the main (line) post material, so that one plan = one section
    const g = result.postGroups.filter(x => pickerFor(x.cls).which === 'post');
    if (g.length > 0) onSendRailsToCutList?.(toPieces(g));
  };

  // ---------- segments editing ----------
  const updateSeg = (id: number, patch: Partial<SegState>) =>
    setSegments(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  const addSeg = () =>
    setSegments(prev => [...prev, { id: segCounter++, length: '', height: prev[prev.length - 1]?.height || '1.5' }]);
  const removeSeg = (id: number) => setSegments(prev => prev.filter(s => s.id !== id));

  const updateAcc = (id: string, patch: Partial<AccState>) =>
    setAccs(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));

  if (!isOpen) return null;

  const isStairs = template === 'stairs';
  const showGates = template === 'fence';
  const lengthLabel = terrain === 'slope' ? 'Οριζόντιο μήκος (m)' : 'Συνολικό μήκος (m)';
  const sendButtonCls = 'text-sm text-emerald-700 hover:text-emerald-900 disabled:text-slate-300 font-medium';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutGrid size={26} className="text-emerald-600" />
              Υπολογιστής Περίφραξης / Κάγκελων
            </h2>
            <p className="text-sm text-slate-500 mt-1">Δώσε τις διαστάσεις και πρόσθεσε τα υλικά στην παραγγελία. Όλα τα αποτελέσματα είναι ενδεικτικά και επεξεργάσιμα.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Template */}
          <div>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(TEMPLATE_LABEL) as FenceTemplate[]).map(t => (
                <button
                  key={t}
                  onClick={() => applyTemplate(t)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border ${template === t ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                >
                  {TEMPLATE_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Η επιλογή τύπου φορτώνει ενδεικτικές αρχικές τιμές. Για κάγκελα (μπαλκόνι/σκάλα) έλεγξε ύψος και μέγιστο κενό κατά τους ισχύοντες κανονισμούς.
            </div>
          </div>

          {/* Terrain */}
          <div className="flex gap-4 items-center flex-wrap text-sm">
            <span className="font-semibold text-slate-600">{isStairs ? 'Κλίση:' : 'Έδαφος:'}</span>
            {([
              ['flat', 'Επίπεδο'],
              ['slope', 'Με κλίση'],
              ['stepped', 'Σκαλωτό (τμήματα)']
            ] as [Terrain, string][]).map(([v, l]) => (
              <label key={v} className="flex items-center gap-1.5 text-slate-700">
                <input type="radio" name="terrain" checked={terrain === v} onChange={() => setTerrain(v)} />
                {l}
              </label>
            ))}
          </div>

          {/* Basic dimensions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {terrain !== 'stepped' ? (
              <>
                <Field label={lengthLabel} value={totalLength} onChange={setTotalLength} />
                <Field label="Ύψος (m)" value={height} onChange={setHeight} />
              </>
            ) : (
              <div className="col-span-2 text-sm text-slate-600 flex items-end pb-1.5">
                Συνολικό μήκος τμημάτων: <span className="font-bold ml-1">{formatNumber(result.netLength)} m</span>
              </div>
            )}
            {terrain === 'slope' && (
              <Field label="Υψομετρική διαφορά (m)" value={rise} onChange={setRise} hint="Οι οριζόντιες ακολουθούν την κλίση" />
            )}
            <Field label="Βήμα στύλων (m)" value={spacing} onChange={setSpacing} />
            <Field label="Πάκτωση (m)" value={embed} onChange={setEmbed} hint={plateEnabled ? 'Με πλάκες βάσης: συνήθως 0' : undefined} />
            <Field label="Οριζόντιες / άνοιγμα" value={rails} onChange={setRails} />
            <Field
              label={closed ? 'Γωνιακοί στύλοι (σύνολο)' : 'Επιπλέον γωνιακοί'}
              value={corners}
              onChange={setCorners}
              hint={closed ? undefined : 'Εκτός των 2 ακραίων'}
            />
            <Field label="Επιπλέον μήκος γωνιακών (m)" value={cornerExtra} onChange={setCornerExtra} />
            {showGates && (
              <>
                <Field label="Πύλες (τεμ.)" value={gates} onChange={setGates} />
                <Field label="Πλάτος πύλης (m)" value={gateWidth} onChange={setGateWidth} />
                <Field label="Επιπλέον μήκος στύλων πύλης (m)" value={gateExtra} onChange={setGateExtra} />
              </>
            )}
            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} />
                Κλειστή περίμετρος
              </label>
            </div>
          </div>

          {terrain === 'stepped' && (
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm font-bold text-slate-700 mb-1">Τμήματα (σκαλωτό έδαφος)</div>
              <div className="text-[11px] text-slate-500 mb-2">
                Κάθε τμήμα έχει δικό του μήκος και ύψος. Ο στύλος ανάμεσα σε δύο τμήματα παίρνει το μεγαλύτερο ύψος. Οι πύλες προστίθενται επιπλέον. Οι γωνιακοί κατανέμονται ενδεικτικά.
              </div>
              <div className="space-y-2">
                {segments.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-14">Τμήμα {i + 1}</span>
                    <input value={s.length} onChange={e => updateSeg(s.id, { length: e.target.value })} placeholder="Μήκος (m)" className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm" />
                    <input value={s.height} onChange={e => updateSeg(s.id, { height: e.target.value })} placeholder="Ύψος (m)" className="w-28 border border-slate-300 rounded px-2 py-1.5 text-sm" />
                    <button onClick={() => removeSeg(s.id)} disabled={segments.length <= 1} className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addSeg} className="mt-2 text-sm text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1">
                <Plus size={14} /> Προσθήκη τμήματος
              </button>
            </div>
          )}

          {/* Infill */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-3">
            <div className="flex gap-4 items-center flex-wrap text-sm">
              <span className="font-semibold text-slate-600">Πλήρωση:</span>
              {([
                ['rails', 'Μόνο οριζόντιες'],
                ['pickets', 'Κάθετα κάγκελα'],
                ['mesh', 'Πάνελ / πλέγμα'],
                ['sheet', 'Λαμαρίνα']
              ] as [Infill, string][]).map(([v, l]) => (
                <label key={v} className="flex items-center gap-1.5 text-slate-700">
                  <input type="radio" name="infill" checked={infill === v} onChange={() => setInfill(v)} />
                  {l}
                </label>
              ))}
            </div>
            {(infill === 'pickets' || infill === 'mesh' || infill === 'sheet') && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {infill === 'pickets' && (
                  <Field label="Βήμα κάθετων (cm)" value={picketPitchCm} onChange={setPicketPitchCm} hint="Από κέντρο σε κέντρο" />
                )}
                <Field label="Κενό από έδαφος (cm)" value={groundGapCm} onChange={setGroundGapCm} />
                {infill === 'mesh' && (
                  <>
                    <Field label="Περιγραφή πάνελ" value={meshLabel} onChange={setMeshLabel} />
                    <Field label="Βάρος (kg/m²)" value={meshKgPerM2} onChange={setMeshKgPerM2} hint="Προαιρετικό" />
                  </>
                )}
                {infill === 'sheet' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Τύπος λαμαρίνας</label>
                      <select
                        value={sheetKey}
                        onChange={e => { setSheetKey(e.target.value); setSheetThickness(''); }}
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
                      >
                        <option value="">-- Τύπος --</option>
                        {Object.entries(sheetTypes).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Πάχος</label>
                      <select
                        value={sheetThickness}
                        onChange={e => setSheetThickness(e.target.value)}
                        disabled={!sheetKey}
                        className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm bg-white"
                      >
                        <option value="">-- Πάχος --</option>
                        {sheetThicknesses.map(t => <option key={t} value={t}>{t} mm</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {!result.valid ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3">
              Συμπλήρωσε ύψος, μήκος και βήμα στύλων μεγαλύτερα από 0 για να γίνει ο υπολογισμός.
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><span className="text-slate-500">Ανοίγματα:</span> <span className="font-bold">{result.spans}</span></div>
                <div><span className="text-slate-500">Μέσο άνοιγμα:</span> <span className="font-bold">{formatNumber(result.spanLength)} m</span></div>
                <div><span className="text-slate-500">Σύνολο στύλων:</span> <span className="font-bold">{result.totalPosts}</span></div>
                <div><span className="text-slate-500">Εμβαδόν πλήρωσης:</span> <span className="font-bold">{formatNumber(result.meshArea)} m²</span></div>
              </div>
              <div className="border-t border-emerald-200 pt-2 space-y-1">
                {result.postGroups.map(g => (
                  <div key={`${g.cls}-${g.length}`}>
                    <span className="text-slate-500">{POST_CLASS_LABEL[g.cls]}:</span>{' '}
                    <span className="font-bold">{g.qty} × {formatNumber(g.length)} m</span>
                  </div>
                ))}
                {result.railGroups.map(g => (
                  <div key={`r-${g.length}`}>
                    <span className="text-slate-500">Οριζόντιες{terrain === 'slope' ? ' (κεκλιμένες)' : ''}:</span>{' '}
                    <span className="font-bold">{g.qty} × {formatNumber(g.length)} m</span>
                  </div>
                ))}
                {infill === 'pickets' && result.picketGroups.map(g => (
                  <div key={`p-${g.length}`}>
                    <span className="text-slate-500">Κάθετα:</span>{' '}
                    <span className="font-bold">{g.qty} × {formatNumber(g.length)} m</span>
                  </div>
                ))}
                {(infill === 'mesh' || infill === 'sheet') && result.panelGroups.map(g => (
                  <div key={`m-${g.width}-${g.height}`}>
                    <span className="text-slate-500">{infill === 'mesh' ? 'Πάνελ' : 'Φύλλα'}:</span>{' '}
                    <span className="font-bold">{g.qty} × {formatNumber(g.width)} × {formatNumber(g.height)} m</span>
                  </div>
                ))}
                {plateEnabled && (
                  <div><span className="text-slate-500">Πλάκες βάσης:</span> <span className="font-bold">{result.totalPosts} τεμ.</span></div>
                )}
                {accLines.map(a => (
                  <div key={a.id}><span className="text-slate-500">{a.label}:</span> <span className="font-bold">{a.qty} τεμ.</span></div>
                ))}
              </div>
            </div>
          )}

          {/* Materials */}
          <PickerBlock title="Υλικό Στύλων Γραμμής" p={post} setP={setPost} ctx={ctx} />
          {(result.cornerPosts > 0) && (
            <PickerBlock
              title="Υλικό Γωνιακών / Ακραίων Στύλων"
              subtitle="Προαιρετικό — αν δεν επιλεγεί, χρησιμοποιείται το υλικό των στύλων γραμμής."
              p={corner} setP={setCorner} ctx={ctx}
            />
          )}
          {showGates && params.gates > 0 && (
            <PickerBlock
              title="Υλικό Στύλων Πύλης"
              subtitle="Προαιρετικό — αν δεν επιλεγεί, χρησιμοποιείται το υλικό των στύλων γραμμής."
              p={gate} setP={setGate} ctx={ctx}
            />
          )}
          <PickerBlock title="Υλικό Οριζοντίων" p={rail} setP={setRail} ctx={ctx} />
          {infill === 'pickets' && <PickerBlock title="Υλικό Κάθετων" p={picket} setP={setPicket} ctx={ctx} />}

          {/* Accessories */}
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm font-bold text-slate-700 mb-2">Παρελκόμενα</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="flex items-center gap-2 text-slate-700 w-60">
                  <input type="checkbox" checked={plateEnabled} onChange={e => setPlateEnabled(e.target.checked)} />
                  Πλάκες βάσης στύλων (1 ανά στύλο)
                </label>
                <input value={plateW} onChange={e => setPlateW(e.target.value)} disabled={!plateEnabled} className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
                <span className="text-slate-400">×</span>
                <input value={plateH} onChange={e => setPlateH(e.target.value)} disabled={!plateEnabled} className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
                <span className="text-slate-400">mm, πάχος</span>
                <input value={plateT} onChange={e => setPlateT(e.target.value)} disabled={!plateEnabled} className="w-14 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
                <span className="text-slate-400">mm</span>
              </div>
              {accs
                .filter(a => a.basis !== 'gate' || (showGates && params.gates > 0))
                .map(a => (
                  <div key={a.id} className="flex items-center gap-2 flex-wrap">
                    <label className="flex items-center gap-2 text-slate-700 w-60">
                      <input type="checkbox" checked={a.enabled} onChange={e => updateAcc(a.id, { enabled: e.target.checked })} />
                      {a.label}
                    </label>
                    <input value={a.perUnit} onChange={e => updateAcc(a.id, { perUnit: e.target.value })} disabled={!a.enabled} className="w-14 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
                    <span className="text-slate-400">τεμ. {BASIS_LABEL[a.basis]}, βάρος</span>
                    <input value={a.unitWeight} onChange={e => updateAcc(a.id, { unitWeight: e.target.value })} disabled={!a.enabled} className="w-16 border border-slate-300 rounded px-2 py-1 disabled:bg-slate-100" />
                    <span className="text-slate-400">kg/τεμ.</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-between items-center gap-3 flex-wrap">
          {onSendRailsToCutList && (
            <div className="flex gap-4 flex-wrap">
              <button onClick={sendRails} disabled={!result.valid || result.railPieces <= 0} className={sendButtonCls}>
                Οριζόντιες → Σχέδιο Κοπής
              </button>
              {infill === 'pickets' && (
                <button onClick={sendPickets} disabled={!result.valid || result.picketCount <= 0} className={sendButtonCls}>
                  Κάθετα → Σχέδιο Κοπής
                </button>
              )}
              <button onClick={sendPosts} disabled={!result.valid || result.totalPosts <= 0} className={sendButtonCls}>
                Στύλοι → Σχέδιο Κοπής
              </button>
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={!result.valid || !anythingToAdd}
            className="ml-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> Προσθήκη στην Παραγγελία
          </button>
        </div>
      </div>
    </div>
  );
}
