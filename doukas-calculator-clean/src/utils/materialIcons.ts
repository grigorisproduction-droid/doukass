// Material type icons/emojis
export const getMaterialIcon = (materialType: string, materialKey?: string): string => {
  // Specific materials
  if (materialKey?.includes('ipe')) return '🏗️';
  if (materialKey?.includes('ipn')) return '🏗️';
  if (materialKey?.includes('upn')) return '⬜';
  if (materialKey?.includes('hea')) return '🔲';
  if (materialKey?.includes('heb')) return '🔲';
  if (materialKey?.includes('rhs')) return '▭';
  if (materialKey?.includes('chs')) return '⭕';
  if (materialKey?.includes('flat')) return '📏';
  if (materialKey?.includes('angle')) return '📐';
  if (materialKey?.includes('round')) return '⚪';
  if (materialKey?.includes('square')) return '⬛';
  
  // By type
  if (materialType === 'wpm') return '🏗️';
  if (materialType === 'flat') return '📏';
  if (materialType === 'angle_equal') return '📐';
  if (materialType === 'solid_round') return '⚪';
  if (materialType === 'solid_square') return '⬛';
  if (materialType === 'rhs') return '▭';
  if (materialType === 'chs') return '⭕';
  
  return '🔧';
};

export const getSheetIcon = (sheetKey: string): string => {
  if (sheetKey === 'black') return '⬛';
  if (sheetKey === 'galv') return '✨';
  if (sheetKey === 'kritharaki') return '🔷';
  if (sheetKey === 'inox') return '💎';
  if (sheetKey === 'roll_red') return '🔴';
  if (sheetKey === 'roll_grey') return '⚫';
  if (sheetKey === 'roll_white') return '⚪';
  if (sheetKey === 'roll_green') return '🟢';
  if (sheetKey === 'roll_galv') return '✨';
  return '📄';
};

export const getPipeIcon = (pipeKey: string): string => {
  if (pipeKey === 'black') return '⚫';
  if (pipeKey === 'galv') return '⚪';
  return '🔘';
};
