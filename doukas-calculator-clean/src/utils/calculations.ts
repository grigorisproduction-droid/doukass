import { MaterialSize } from '../types';

export const DENSITY_MULTIPLIER = 8 / 7.85;

export function calcWeightPerMeter(type: string, dims: MaterialSize, thickness: number | null, density: number): number {
    let area_mm2 = 0;
    const t = thickness || 0;

    if (type === "rhs") {
        const b = dims.width || 0;
        const h = dims.height || 0;
        area_mm2 = b * h - (b - 2 * t) * (h - 2 * t);
    } else if (type === "chs") {
        const D = dims.diameter || 0;
        const innerD = D - 2 * t;
        area_mm2 = Math.PI / 4 * (D * D - innerD * innerD);
    } else if (type === "solid_round") {
        const D = dims.diameter || 0;
        area_mm2 = Math.PI * D * D / 4;
    } else if (type === "solid_square") {
        const a = dims.side || 0;
        area_mm2 = a * a;
    } else if (type === "flat") {
        const b = dims.width || 0;
        area_mm2 = b * t;
    } else if (type === "angle_equal") {
        const L = dims.leg || 0;
        area_mm2 = t * (2 * L - t);
    } else {
        return 0;
    }

    const area_m2 = area_mm2 * 1e-6;
    return area_m2 * density;
}

export function calcSheetWeight(width_mm: number, length_mm: number, thickness_mm: number, density: number): number {
    const area_m2 = (width_mm / 1000) * (length_mm / 1000);
    const volume_m3 = area_m2 * (thickness_mm / 1000);
    return volume_m3 * density;
}

export function formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('el-GR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function parseNumber(str: string): number {
    if (!str) return 0;
    // Replace comma with dot for parsing if needed, but standard parseFloat uses dot.
    // Greek locale uses comma as decimal separator.
    const normalized = str.replace(',', '.');
    const val = parseFloat(normalized);
    return isNaN(val) ? 0 : val;
}
