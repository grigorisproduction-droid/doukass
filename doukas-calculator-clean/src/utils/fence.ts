// Estimates the steel needed for a fence / balcony railing / stair railing run.
// Everything is an editable starting point: the results are added to the order as
// normal rows the user can adjust afterwards.
//
// Supported:
//  - terrain: flat, constant slope (rails follow the ground), or stepped sections
//  - three post classes: line posts, end/corner posts, gate posts (each may be longer)
//  - infill: horizontal rails only, vertical pickets, mesh panels, sheet panels
//  - accessories derived from the post / gate / span counts

export type FenceTemplate = 'fence' | 'balcony' | 'stairs';
export type Terrain = 'flat' | 'slope' | 'stepped';
export type Infill = 'rails' | 'pickets' | 'mesh' | 'sheet';
export type PostClass = 'line' | 'corner' | 'gate';

export interface FenceSegment {
  length: number; // m — horizontal length of this section (gates excluded)
  height: number; // m — fence height above ground in this section
}

export interface FenceParams {
  totalLength: number; // m — overall run length including gates (flat / slope)
  height: number;      // m — fence height above ground
  spacing: number;     // m — maximum distance between posts (centre to centre)
  embed: number;       // m — post length buried in the ground (0 when base plates are used)
  rails: number;       // number of horizontal rails per span
  gates: number;       // number of gates
  gateWidth: number;   // m — clear width of each gate
  closed: boolean;     // closed perimeter (no extra end post)

  terrain: Terrain;
  rise: number;        // m — total ground level difference along the run (slope only)
  segments: FenceSegment[]; // stepped only: net length of the run is the sum of the segments

  corners: number;     // corner posts. Open run: in addition to the 2 end posts. Closed run: total.
  cornerExtra: number; // m — extra length of corner/end posts vs. line posts
  gateExtra: number;   // m — extra length of gate posts vs. line posts

  infill: Infill;
  picketPitch: number; // m — centre to centre distance of vertical pickets
  groundGap: number;   // m — clearance between ground / slab and the bottom of pickets & panels
}

export interface PostGroup { cls: PostClass; length: number; qty: number }
export interface LenGroup { length: number; qty: number }                  // m
export interface PanelGroup { width: number; height: number; qty: number } // m

export interface FenceResult {
  valid: boolean;
  netLength: number;     // run length without gates
  spans: number;         // total number of spans between posts
  spanLength: number;    // average span length (m)
  linePosts: number;
  cornerPosts: number;
  gatePosts: number;
  totalPosts: number;
  postLength: number;    // m — length of a standard line post (incl. buried part)
  postGroups: PostGroup[];
  railGroups: LenGroup[];
  railPieces: number;
  railLength: number;    // m — length of the longest rail group (0 if none)
  totalRailMeters: number;
  picketGroups: LenGroup[];
  picketCount: number;
  totalPicketMeters: number;
  panelGroups: PanelGroup[];
  panelCount: number;
  totalPostMeters: number;
  meshArea: number;      // m² of infill surface (net length × height)
  anchors: number;       // suggested anchors, one per post
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const mm = (m: number) => Math.round(m * 1000);

function addLen(map: Map<number, number>, lengthM: number, qty: number) {
  if (qty <= 0 || !(lengthM > 0)) return;
  const k = mm(lengthM);
  map.set(k, (map.get(k) || 0) + qty);
}

function toLenGroups(map: Map<number, number>): LenGroup[] {
  return Array.from(map.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([k, qty]) => ({ length: k / 1000, qty }));
}

// Picks `count` items spread as evenly as possible out of `from`
function evenPick(from: number[], count: number): number[] {
  const n = from.length;
  const k = Math.max(0, Math.min(count, n));
  if (k === 0) return [];
  const picked = new Set<number>();
  for (let j = 0; j < k; j++) {
    let pos = Math.min(n - 1, Math.max(0, Math.round(((j + 0.5) * n) / k - 0.5)));
    while (picked.has(pos) && pos < n - 1) pos++;
    while (picked.has(pos) && pos > 0) pos--;
    picked.add(pos);
  }
  return Array.from(picked).map(i => from[i]);
}

export function computeFence(p: FenceParams): FenceResult {
  const gates = Math.max(0, Math.floor(p.gates || 0));
  const gateWidth = Math.max(0, p.gateWidth || 0);
  const embed = Math.max(0, p.embed || 0);
  const cornerExtra = Math.max(0, p.cornerExtra || 0);
  const gateExtra = Math.max(0, p.gateExtra || 0);
  const groundGap = Math.max(0, p.groundGap || 0);
  const railsPerSpan = Math.max(0, Math.floor(p.rails || 0));

  // ---- sections of the run ----
  let sections: FenceSegment[];
  let riseTotal = 0;
  if (p.terrain === 'stepped') {
    sections = (p.segments || []).filter(s => s.length > 0 && s.height > 0);
  } else {
    const net = Math.max(0, (p.totalLength || 0) - gates * gateWidth);
    sections = net > 0 && p.height > 0 ? [{ length: net, height: p.height }] : [];
    if (p.terrain === 'slope') riseTotal = Math.abs(p.rise || 0);
  }

  const netLength = sections.reduce((s, x) => s + x.length, 0);
  const tallest = p.terrain === 'stepped'
    ? sections.reduce((m, s) => Math.max(m, s.height), 0)
    : Math.max(0, p.height || 0);
  const gatePostLen = round3(tallest + embed + gateExtra);
  const gatePosts = gates * 2;

  const empty: FenceResult = {
    valid: false, netLength: round3(netLength), spans: 0, spanLength: 0,
    linePosts: 0, cornerPosts: 0, gatePosts, totalPosts: gatePosts,
    postLength: round3(Math.max(0, (p.height || 0) + embed)),
    postGroups: gatePosts > 0 && tallest > 0 ? [{ cls: 'gate', length: gatePostLen, qty: gatePosts }] : [],
    railGroups: [], railPieces: 0, railLength: 0, totalRailMeters: 0,
    picketGroups: [], picketCount: 0, totalPicketMeters: 0,
    panelGroups: [], panelCount: 0,
    totalPostMeters: 0, meshArea: 0, anchors: gatePosts
  };

  if (!(p.spacing > 0) || !(tallest > 0)) return empty;
  if (sections.length === 0) {
    return { ...empty, valid: gates > 0, totalPostMeters: round3(gatePosts * gatePostLen) };
  }

  // ---- spans, posts, rails, pickets, panels ----
  const railMap = new Map<number, number>();
  const picketMap = new Map<number, number>();
  const panelMap = new Map<string, PanelGroup>();
  const postHeights: number[] = []; // height above ground of each post along the run
  let totalSpans = 0;

  sections.forEach((sec, i) => {
    const spans = Math.max(1, Math.ceil(sec.length / p.spacing - 1e-9));
    const spanLen = sec.length / spans;
    totalSpans += spans;

    // posts at the start of each span of this section
    for (let k = 0; k < spans; k++) {
      const h = (k === 0 && i > 0) ? Math.max(sections[i - 1].height, sec.height) : sec.height;
      postHeights.push(h);
    }
    if (i === sections.length - 1) {
      if (!p.closed) postHeights.push(sec.height);
      else if (sections.length > 1) postHeights[0] = Math.max(postHeights[0], sec.height);
    }

    // rails follow the ground on a slope
    const slopeFactor = p.terrain === 'slope' && netLength > 0
      ? Math.hypot(1, riseTotal / netLength)
      : 1;
    addLen(railMap, spanLen * slopeFactor, spans * railsPerSpan);

    if (p.infill === 'pickets' && p.picketPitch > 0) {
      const perSpan = Math.max(0, Math.ceil(spanLen / p.picketPitch - 1e-9) - 1);
      addLen(picketMap, Math.max(0, sec.height - groundGap), spans * perSpan);
    }

    if ((p.infill === 'mesh' || p.infill === 'sheet') && sec.height - groundGap > 0) {
      const w = round3(spanLen);
      const h = round3(sec.height - groundGap);
      const key = `${mm(w)}x${mm(h)}`;
      const cur = panelMap.get(key);
      if (cur) cur.qty += spans;
      else panelMap.set(key, { width: w, height: h, qty: spans });
    }
  });

  // ---- classify posts ----
  const n = postHeights.length;
  const allIdx = postHeights.map((_, i) => i);
  const corner = new Set<number>();
  const wantCorners = Math.max(0, Math.floor(p.corners || 0));
  if (!p.closed) {
    corner.add(0);
    if (n > 1) corner.add(n - 1);
    const interior = allIdx.filter(i => !corner.has(i));
    evenPick(interior, wantCorners).forEach(i => corner.add(i));
  } else {
    evenPick(allIdx, wantCorners).forEach(i => corner.add(i));
  }

  const postMap = new Map<string, PostGroup>();
  const addPost = (cls: PostClass, length: number, qty: number) => {
    if (qty <= 0) return;
    const key = `${cls}:${mm(length)}`;
    const cur = postMap.get(key);
    if (cur) cur.qty += qty;
    else postMap.set(key, { cls, length: round3(length), qty });
  };
  postHeights.forEach((h, i) => {
    if (corner.has(i)) addPost('corner', h + embed + cornerExtra, 1);
    else addPost('line', h + embed, 1);
  });
  if (gatePosts > 0) addPost('gate', gatePostLen, gatePosts);

  const order: Record<PostClass, number> = { line: 0, corner: 1, gate: 2 };
  const postGroups = Array.from(postMap.values())
    .sort((a, b) => order[a.cls] - order[b.cls] || b.length - a.length);

  const linePosts = postGroups.filter(g => g.cls === 'line').reduce((s, g) => s + g.qty, 0);
  const cornerPosts = postGroups.filter(g => g.cls === 'corner').reduce((s, g) => s + g.qty, 0);
  const totalPosts = linePosts + cornerPosts + gatePosts;

  const railGroups = toLenGroups(railMap);
  const picketGroups = toLenGroups(picketMap);
  const panelGroups = Array.from(panelMap.values()).sort((a, b) => b.width - a.width);

  const railPieces = railGroups.reduce((s, g) => s + g.qty, 0);
  const picketCount = picketGroups.reduce((s, g) => s + g.qty, 0);
  const panelCount = panelGroups.reduce((s, g) => s + g.qty, 0);
  const lineLen0 = postGroups.find(g => g.cls === 'line')?.length ?? postGroups[0]?.length ?? 0;

  return {
    valid: true,
    netLength: round3(netLength),
    spans: totalSpans,
    spanLength: round3(netLength / totalSpans),
    linePosts,
    cornerPosts,
    gatePosts,
    totalPosts,
    postLength: lineLen0,
    postGroups,
    railGroups,
    railPieces,
    railLength: railGroups[0]?.length ?? 0,
    totalRailMeters: round3(railGroups.reduce((s, g) => s + g.length * g.qty, 0)),
    picketGroups,
    picketCount,
    totalPicketMeters: round3(picketGroups.reduce((s, g) => s + g.length * g.qty, 0)),
    panelGroups,
    panelCount,
    totalPostMeters: round3(postGroups.reduce((s, g) => s + g.length * g.qty, 0)),
    meshArea: round3(sections.reduce((s, x) => s + x.length * x.height, 0)),
    anchors: totalPosts
  };
}

// ---------------------------------------------------------------------------
// Accessories
// ---------------------------------------------------------------------------

export type AccessoryBasis = 'post' | 'gate' | 'span';

export interface AccessoryDef {
  id: string;
  label: string;
  basis: AccessoryBasis; // what the quantity is derived from
  perUnit: number;       // pieces per post / gate / span
  unitWeight: number;    // kg per piece (0 = unknown, can be edited later in the order)
  enabled: boolean;
}

export interface AccessoryLine {
  id: string;
  label: string;
  qty: number;
  unitWeight: number;
}

export function computeAccessories(defs: AccessoryDef[], r: FenceResult, gates: number): AccessoryLine[] {
  const lines: AccessoryLine[] = [];
  for (const d of defs) {
    if (!d.enabled || !(d.perUnit > 0)) continue;
    const base = d.basis === 'post' ? r.totalPosts : d.basis === 'gate' ? Math.max(0, Math.floor(gates)) : r.spans;
    const qty = Math.round(base * d.perUnit);
    if (qty > 0) lines.push({ id: d.id, label: d.label, qty, unitWeight: d.unitWeight || 0 });
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Templates: sensible starting values for each kind of job (all editable)
// ---------------------------------------------------------------------------

export interface TemplateDefaults {
  totalLength: string; height: string; spacing: string; embed: string; rails: string;
  gates: string; gateWidth: string; closed: boolean;
  terrain: Terrain; rise: string; corners: string;
  infill: Infill; picketPitch: string; groundGap: string;
  basePlates: boolean;
}

export const TEMPLATE_DEFAULTS: Record<FenceTemplate, TemplateDefaults> = {
  fence: {
    totalLength: '25', height: '1.5', spacing: '2.5', embed: '0.4', rails: '2',
    gates: '0', gateWidth: '4', closed: false,
    terrain: 'flat', rise: '0', corners: '0',
    infill: 'rails', picketPitch: '0.12', groundGap: '0.05',
    basePlates: false
  },
  balcony: {
    totalLength: '4', height: '1', spacing: '1.2', embed: '0', rails: '2',
    gates: '0', gateWidth: '1', closed: false,
    terrain: 'flat', rise: '0', corners: '0',
    infill: 'pickets', picketPitch: '0.12', groundGap: '0.05',
    basePlates: true
  },
  stairs: {
    totalLength: '4.2', height: '0.95', spacing: '1.2', embed: '0', rails: '2',
    gates: '0', gateWidth: '1', closed: false,
    terrain: 'slope', rise: '2.7', corners: '0',
    infill: 'pickets', picketPitch: '0.12', groundGap: '0.05',
    basePlates: true
  }
};
