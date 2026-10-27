// One-dimensional cutting stock: fit required piece lengths into standard bars
// with as little waste as possible. All lengths are in millimetres.

export interface CutPiece {
  length: number; // mm
  qty: number;
}

export interface CutBar {
  pieces: number[]; // piece lengths in this bar, longest first
  waste: number;    // leftover mm (offcut) after all cuts and saw kerfs
}

export interface CutPatternGroup {
  pattern: number[]; // identical bars are grouped
  count: number;
  waste: number;
}

export interface CutPlan {
  stockLength: number;
  kerf: number;
  bars: CutBar[];
  groups: CutPatternGroup[];
  totalBars: number;
  totalPieces: number;
  totalWaste: number;      // mm
  wastePercent: number;    // 0..100 of purchased length
  lowerBound: number;      // theoretical minimum number of bars
  isOptimal: boolean;      // totalBars === lowerBound
  tooLong: number[];       // distinct piece lengths that do not fit a bar at all
}

// Small deterministic PRNG so the same input always gives the same plan
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface WorkBar {
  pieces: number[];
  remaining: number; // capacity left, in "len + kerf" units
}

// Best-fit placement of items (already in the order to try)
function packBestFit(items: number[], capacity: number, kerf: number): WorkBar[] {
  const bars: WorkBar[] = [];
  for (const len of items) {
    const size = len + kerf;
    let best = -1;
    let bestLeft = Infinity;
    for (let i = 0; i < bars.length; i++) {
      const left = bars[i].remaining - size;
      if (left >= 0 && left < bestLeft) {
        best = i;
        bestLeft = left;
      }
    }
    if (best === -1) {
      bars.push({ pieces: [len], remaining: capacity - size });
    } else {
      bars[best].pieces.push(len);
      bars[best].remaining = bestLeft;
    }
  }
  return bars;
}

// Prefer fewer bars; among equals prefer concentrating waste into few big offcuts
function score(bars: WorkBar[]): [number, number] {
  let sq = 0;
  for (const b of bars) sq += b.remaining * b.remaining;
  return [bars.length, -sq];
}

function better(a: [number, number], b: [number, number]): boolean {
  if (a[0] !== b[0]) return a[0] < b[0];
  return a[1] < b[1];
}

export function planCuts(pieces: CutPiece[], stockLength: number, kerf: number, iterations = 400): CutPlan {
  const k = Math.max(0, kerf);
  const capacity = stockLength + k;

  const items: number[] = [];
  const tooLongSet = new Set<number>();
  for (const p of pieces) {
    const len = Math.round(p.length);
    const qty = Math.max(0, Math.floor(p.qty));
    if (len <= 0 || qty === 0) continue;
    if (len > stockLength) {
      tooLongSet.add(len);
      continue;
    }
    for (let i = 0; i < qty; i++) items.push(len);
  }

  const sumSizes = items.reduce((s, l) => s + l + k, 0);
  const lowerBound = items.length === 0 ? 0 : Math.ceil(sumSizes / capacity);

  let bestBars: WorkBar[] = [];
  if (items.length > 0) {
    const sorted = [...items].sort((a, b) => b - a);
    bestBars = packBestFit(sorted, capacity, k);
    let bestScore = score(bestBars);

    const rand = mulberry32(12345);
    for (let it = 0; it < iterations && bestBars.length > lowerBound; it++) {
      const noisy = items
        .map(l => ({ l, key: l * (1 + (rand() - 0.5) * 0.35) }))
        .sort((a, b) => b.key - a.key)
        .map(x => x.l);
      const cand = packBestFit(noisy, capacity, k);
      const sc = score(cand);
      if (better(sc, bestScore)) {
        bestBars = cand;
        bestScore = sc;
      }
    }
  }

  const bars: CutBar[] = bestBars
    .map(b => {
      const pcs = [...b.pieces].sort((a, c) => c - a);
      const used = pcs.reduce((s, l) => s + l, 0) + Math.max(0, pcs.length - 1) * k;
      return { pieces: pcs, waste: stockLength - used };
    })
    .sort((a, b) => {
      if (a.waste !== b.waste) return a.waste - b.waste;
      return a.pieces.join(',').localeCompare(b.pieces.join(','));
    });

  const groupMap = new Map<string, CutPatternGroup>();
  for (const b of bars) {
    const key = b.pieces.join(',');
    const g = groupMap.get(key);
    if (g) g.count++;
    else groupMap.set(key, { pattern: b.pieces, count: 1, waste: b.waste });
  }
  const groups = Array.from(groupMap.values());

  const totalWaste = bars.reduce((s, b) => s + b.waste, 0);
  const purchased = bars.length * stockLength;

  return {
    stockLength,
    kerf: k,
    bars,
    groups,
    totalBars: bars.length,
    totalPieces: items.length,
    totalWaste,
    wastePercent: purchased > 0 ? (totalWaste / purchased) * 100 : 0,
    lowerBound,
    isOptimal: bars.length === lowerBound,
    tooLong: Array.from(tooLongSet).sort((a, b) => b - a)
  };
}
