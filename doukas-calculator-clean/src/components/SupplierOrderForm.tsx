import React, { useState, useMemo } from 'react';
import { X, ClipboardList, Trash2, Printer, Plus } from 'lucide-react';
import { Material, SheetType, PipeType } from '../types';
import { standardSheetSizes } from '../data/materials';
import { getMaterialIcon, getSheetIcon, getPipeIcon } from '../utils/materialIcons';
import { buildSupplierOrderHtml, SupplierOrderLine } from './SupplierOrderPrint';

interface SupplierOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Record<string, Material>;
  sheetTypes: Record<string, SheetType>;
  pipeTypes: Record<string, PipeType>;
}

type Kind = '' | 'mat' | 'sheet' | 'pipe';

export default function SupplierOrderForm({
  isOpen,
  onClose,
  materials,
  sheetTypes,
  pipeTypes
}: SupplierOrderFormProps) {
  const [kind, setKind] = useState<Kind>('');
  const [selectedKey, setSelectedKey] = useState('');
  const [selectedSizeCode, setSelectedSizeCode] = useState('');
  const [selectedThickness, setSelectedThickness] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [lines, setLines] = useState<SupplierOrderLine[]>([]);

  // Resolve available sizes for the currently selected category
  const availableSizes = useMemo(() => {
    if (kind === 'mat' && selectedKey) {
      return materials[selectedKey]?.sizes || [];
    }
    if (kind === 'sheet' && selectedKey) {
      return standardSheetSizes;
    }
    if (kind === 'pipe' && selectedKey) {
      return pipeTypes[selectedKey]?.sizes || [];
    }
    return [];
  }, [kind, selectedKey, materials, pipeTypes]);

  // Resolve available thicknesses for the currently selected category/size
  const availableThicknesses = useMemo(() => {
    if (kind === 'mat' && selectedKey) {
      const mat = materials[selectedKey];
      if (!mat?.requiresThickness) return [];
      const size = mat.sizes?.find(s => s.code === selectedSizeCode);
      return size?.thicknesses || [];
    }
    if (kind === 'sheet' && selectedKey) {
      return sheetTypes[selectedKey]?.thicknesses || [];
    }
    if (kind === 'pipe' && selectedKey) {
      const size = pipeTypes[selectedKey]?.sizes.find(s => s.code === selectedSizeCode);
      return size?.thicknesses || [];
    }
    return [];
  }, [kind, selectedKey, selectedSizeCode, materials, sheetTypes, pipeTypes]);

  const needsSize = kind === 'mat' || kind === 'sheet' || kind === 'pipe';
  const needsThickness = availableThicknesses.length > 0;

  const categoryLabel = useMemo(() => {
    if (kind === 'mat' && selectedKey) return materials[selectedKey]?.label || '';
    if (kind === 'sheet' && selectedKey) return `Λαμαρίνα ${sheetTypes[selectedKey]?.label || ''}`;
    if (kind === 'pipe' && selectedKey) return `Σωλήνα ${pipeTypes[selectedKey]?.label || ''}`;
    return '';
  }, [kind, selectedKey, materials, sheetTypes, pipeTypes]);

  const resetSelection = () => {
    setKind('');
    setSelectedKey('');
    setSelectedSizeCode('');
    setSelectedThickness('');
    setQuantity('1');
  };

  const handleCategoryChange = (raw: string) => {
    setSelectedSizeCode('');
    setSelectedThickness('');
    if (!raw) {
      setKind('');
      setSelectedKey('');
      return;
    }
    const [k, key] = raw.split(':');
    setKind(k as Kind);
    setSelectedKey(key);
  };

  const canAdd = () => {
    if (!kind || !selectedKey) return false;
    if (needsSize && availableSizes.length > 0 && !selectedSizeCode) return false;
    if (needsThickness && !selectedThickness) return false;
    const qty = parseFloat(quantity.replace(',', '.'));
    return !isNaN(qty) && qty > 0;
  };

  const handleAddLine = () => {
    if (!canAdd()) return;

    const qty = parseFloat(quantity.replace(',', '.'));
    let sizeLabel = '';

    if (kind === 'mat') {
      const size = materials[selectedKey]?.sizes?.find(s => s.code === selectedSizeCode);
      sizeLabel = size?.label || '—';
    } else if (kind === 'sheet') {
      const size = standardSheetSizes.find(s => s.code === selectedSizeCode);
      sizeLabel = size ? `${size.label} m` : '—';
    } else if (kind === 'pipe') {
      const size = pipeTypes[selectedKey]?.sizes.find(s => s.code === selectedSizeCode);
      sizeLabel = size?.label || '—';
    }

    const newLine: SupplierOrderLine = {
      id: `line_${Date.now()}_${Math.random()}`,
      category: categoryLabel,
      size: sizeLabel,
      thickness: selectedThickness ? `${selectedThickness}mm` : '',
      quantity: qty,
      unit: 'τεμ.'
    };

    setLines(prev => [...prev, newLine]);
    // Keep category selected for fast multi-entry, just clear size/thickness/qty
    setSelectedSizeCode('');
    setSelectedThickness('');
    setQuantity('1');
  };

  const handleRemoveLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleClearAll = () => {
    if (lines.length === 0) return;
    if (confirm('Καθαρισμός όλων των γραμμών του δελτίου;')) {
      setLines([]);
    }
  };

  const handlePrint = () => {
    if (lines.length === 0) {
      alert('Δεν έχεις προσθέσει ακόμα υλικά στο δελτίο.');
      return;
    }
    const html = buildSupplierOrderHtml(lines);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList size={26} className="text-orange-600" />
              Δελτίο Παραγγελίας Προμηθευτή
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Πρόσθεσε υλικά που θέλεις να παραγγείλεις — θα τυπωθούν μόνο αυτά.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Add-line form */}
        <div className="p-6 border-b bg-slate-50 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Κατηγορία Υλικού</label>
            <select
              value={kind && selectedKey ? `${kind}:${selectedKey}` : ''}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
            >
              <option value="">-- Επιλογή Κατηγορίας --</option>
              <optgroup label="Δοκοί & Προφίλ">
                {Object.entries(materials)
                  .filter(([, m]) => m.type !== 'pipe_group')
                  .map(([k, m]) => (
                    <option key={k} value={`mat:${k}`}>{getMaterialIcon(m.type, k)} {m.label}</option>
                  ))}
              </optgroup>
              <optgroup label="Λαμαρίνες">
                {Object.entries(sheetTypes).map(([k, m]) => (
                  <option key={k} value={`sheet:${k}`}>{getSheetIcon(k)} Λαμαρίνα {m.label}</option>
                ))}
              </optgroup>
              <optgroup label="Σωλήνες">
                {Object.entries(pipeTypes).map(([k, m]) => (
                  <option key={k} value={`pipe:${k}`}>{getPipeIcon(k)} Σωλήνα {m.label}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {kind && selectedKey && (
            <div className="grid grid-cols-3 gap-3">
              {availableSizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Μέγεθος</label>
                  <select
                    value={selectedSizeCode}
                    onChange={(e) => { setSelectedSizeCode(e.target.value); setSelectedThickness(''); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                  >
                    <option value="">-- Επιλογή --</option>
                    {availableSizes.map(s => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {needsThickness && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Πάχος (mm)</label>
                  <select
                    value={selectedThickness}
                    onChange={(e) => setSelectedThickness(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                  >
                    <option value="">-- Επιλογή --</option>
                    {availableThicknesses.map(t => (
                      <option key={t} value={t}>{t} mm</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Τεμάχια</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && canAdd()) handleAddLine(); }}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-1">
            <button
              onClick={resetSelection}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Καθαρισμός επιλογής
            </button>
            <button
              onClick={handleAddLine}
              disabled={!canAdd()}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus size={18} /> Προσθήκη στο Δελτίο
            </button>
          </div>
        </div>

        {/* Added lines */}
        <div className="flex-1 overflow-auto p-6">
          {lines.length === 0 ? (
            <div className="text-center text-slate-400 py-12">
              <ClipboardList size={56} className="mx-auto mb-3 opacity-40" />
              <p>Δεν έχεις προσθέσει ακόμα υλικά.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-left text-slate-500">
                  <th className="pb-2">Κατηγορία</th>
                  <th className="pb-2">Μέγεθος</th>
                  <th className="pb-2">Πάχος</th>
                  <th className="pb-2 text-right">Ποσότητα</th>
                  <th className="pb-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map(line => (
                  <tr key={line.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 font-medium text-slate-800">{line.category}</td>
                    <td className="py-2 text-slate-600">{line.size}</td>
                    <td className="py-2 text-slate-600">{line.thickness || '—'}</td>
                    <td className="py-2 text-right font-mono">{line.quantity.toLocaleString('el-GR')} {line.unit}</td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => handleRemoveLine(line.id)}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded-full transition-colors"
                        title="Αφαίρεση"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t bg-slate-50 flex justify-between items-center">
          <button
            onClick={handleClearAll}
            disabled={lines.length === 0}
            className="text-sm text-red-600 hover:text-red-800 disabled:text-slate-300 disabled:cursor-not-allowed font-medium"
          >
            Καθαρισμός Όλων
          </button>
          <button
            onClick={handlePrint}
            disabled={lines.length === 0}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Printer size={18} /> Εκτύπωση Δελτίου ({lines.length})
          </button>
        </div>
      </div>
    </div>
  );
}
