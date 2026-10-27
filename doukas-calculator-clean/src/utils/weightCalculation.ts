import { OrderItem, Material, SheetType, PipeType } from '../types';
import { calcWeightPerMeter, calcSheetWeight, parseNumber } from './calculations';

interface RecalcContext {
  materials: Record<string, Material>;
  sheetTypes: Record<string, SheetType>;
  pipeTypes: Record<string, PipeType>;
}

/**
 * Parses a dimensions string back into numeric values.
 * Supports "L=25m" (length) and "1000x2000mm" (width x height).
 */
function parseDimensionsString(dimensions: string): { length?: number; width?: number; height?: number } {
  const lengthMatch = dimensions.match(/^L=([\d.,]+)m$/i);
  if (lengthMatch) {
    return { length: parseNumber(lengthMatch[1]) };
  }

  const areaMatch = dimensions.match(/^([\d.,]+)\s*x\s*([\d.,]+)mm$/i);
  if (areaMatch) {
    return { width: parseNumber(areaMatch[1]), height: parseNumber(areaMatch[2]) };
  }

  return {};
}

/**
 * Recalculates the weight of a row given (possibly edited) dimensions, thickness and quantity.
 * Returns null if recalculation isn't possible (e.g. no metadata, or values incomplete) —
 * caller should fall back to proportional scaling in that case.
 */
export function recalculateRowWeight(
  row: OrderItem,
  newDimensions: string,
  newThickness: number | null,
  newQuantity: number,
  ctx: RecalcContext
): number | null {
  const meta = row.metadata;
  if (!meta) return null;

  const dims = parseDimensionsString(newDimensions);

  if (meta.materialType === 'wpm') {
    if (dims.length === undefined || !meta.wpm) return null;
    return meta.wpm * dims.length * newQuantity;
  }

  if (meta.materialType === 'profile') {
    if (dims.length === undefined || !meta.materialKey) return null;
    const mat = ctx.materials[meta.materialKey];
    const size = mat?.sizes?.find(s => s.code === meta.sizeCode);
    if (!mat || !size) return null;
    const t = mat.requiresThickness ? (newThickness ?? 0) : 0;
    const wpm = calcWeightPerMeter(mat.type, size, t, meta.density);
    return wpm * dims.length * newQuantity;
  }

  if (meta.materialType === 'sheet') {
    if (dims.width === undefined || dims.height === undefined || newThickness === null) return null;
    if (!meta.sheetTypeKey) return null;
    return calcSheetWeight(dims.width, dims.height, newThickness, meta.density) * newQuantity;
  }

  if (meta.materialType === 'pipe') {
    if (dims.length === undefined || newThickness === null) return null;
    if (!meta.pipeTypeKey) return null;
    const type = ctx.pipeTypes[meta.pipeTypeKey];
    const size = type?.sizes.find(s => s.code === meta.sizeCode);
    if (!type || !size) return null;
    const wpm = calcWeightPerMeter('chs', size, newThickness, meta.density);
    return wpm * dims.length * newQuantity;
  }

  return null;
}
