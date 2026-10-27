import React, { useState, useMemo, useEffect } from 'react';
import { X, Scissors, Plus, Trash2, Printer } from 'lucide-react';
import { planCuts, CutPiece } from '../utils/cutting';
import { formatNumber } from '../utils/calculations';

interface CuttingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPieces?: CutPiece[];
}

interface Row { id: number; length: string; qty: string; }

let rid = 1;
const newRow = (length = '', qty = '1'): Row => ({ id: rid++, length, qty });

export default function CuttingListModal({ isOpen, onClose, initialPieces }: CuttingListModalProps) {
  const [stockLength, setStockLength] = useState('6000');
  const [kerf, setKerf] = useState('3');
  const [rows, setRows] = useState<Row[]>([newRow()]);

  useEffect(() => {
    if (isOpen && initialPieces && initialPieces.length > 0) {
      setRows(initialPieces.map(p => newRow(String(p.length), String(p.qty))));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialPieces]);

  const pieces: CutPiece[] = useMemo(() =>
    rows
      .map(r => ({ length: parseFloat(r.length.replace(',', '.')) || 0, qty: parseInt(r.qty) || 0 }))
      .filter(p => p.length > 0 && p.qty > 0),
    [rows]
  );

  const stock = parseFloat(stockLength.replace(',', '.')) || 0;
  const kerfMm = parseFloat(kerf.replace(',', '.')) || 0;

  const plan = useMemo(() => {
    if (stock <= 0 || pieces.length === 0) return null;
    return planCuts(pieces, stock, kerfMm);
  }, [pieces, stock, kerfMm]);

  const updateRow = (id: number, patch: Partial<Row>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  };
  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id: number) => setRows(prev => prev.filter(r => r.id !== id));

  const handlePrint = () => {
    if (!plan) return;
    const todayStr = new Date().toLocaleString('el-GR');
    const rowsHtml = plan.groups.map(g => `
      <tr>
        <td class="text-right">${g.count}×</td>
        <td>${g.pattern.map(l => `${l}mm`).join(' + ')}</td>
        <td class="text-right">${g.waste}mm</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html lang="el"><head><meta charset="UTF-8">
<title>Σχέδιο Κοπής - Report</title>
<style>
 * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
 body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color:#111827; margin:16px; position:relative; }
 h1 { font-size: 16px; margin:0 0 10px; color:#374151; font-weight:600; }
 .doc-banner { display:flex; justify-content:space-between; align-items:center; background:#0f766e; color:#fff; border:2px solid #115e59; border-radius:8px; padding:12px 20px; margin:0 0 16px; }
 .doc-banner-title { font-size:28px; font-weight:800; }
 .doc-banner-number { font-size:16px; font-weight:700; background:rgba(255,255,255,0.18); padding:6px 16px; border-radius:6px; white-space:nowrap; }
 .meta { font-size:12px; margin-bottom:14px; }
 .meta span { display:inline-block; margin-right:20px; }
 table { width:100%; border-collapse:collapse; margin-top:6px; margin-bottom:14px; }
 th, td { border:1px solid #d1d5db; padding:5px 8px; }
 thead { background:#f3f4f6; }
 .text-right { text-align:right; }
 .section-title { margin-top:18px; font-weight:600; font-size:13px; color:#115e59; border-bottom:2px solid #0f766e; padding-bottom:2px; display:inline-block; }
 body::before { content:"Σ. ΔΟΥΚΑΣ Α.Ε."; position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-25deg); font-size:72px; font-weight:800; color:#000; opacity:0.04; white-space:nowrap; pointer-events:none; z-index:-1; }
 .report-footer { margin-top:24px; padding-top:6px; border-top:1px solid #d1d5db; font-size:10px; color:#6b7280; text-align:right; }
 @media print { body { margin:8mm; } }
</style></head><body>
<h1>ΔΟΥΚΑΣ Α.Ε.</h1>
<div class="doc-banner">
  <div class="doc-banner-title">ΣΧΕΔΙΟ ΚΟΠΗΣ</div>
  <div class="doc-banner-number">${plan.totalBars} ράβδοι</div>
</div>
<div class="meta">
  <span><strong>Ημερομηνία:</strong> ${todayStr}</span>
  <span><strong>Ράβδος:</strong> ${stock}mm</span>
  <span><strong>Κοπή (kerf):</strong> ${kerfMm}mm</span>
  <span><strong>Φύρα:</strong> ${plan.wastePercent.toFixed(1)}%</span>
</div>
<div class="section-title">Πρότυπα Κοπής</div>
<table>
  <thead><tr><th style="width:70px;">Ράβδοι</th><th>Κομμάτια ανά ράβδο</th><th style="width:110px;">Φύρα / ράβδο</th></tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<div class="report-footer">
  <div>Σ. ΔΟΥΚΑΣ Α.Ε.</div>
  <div>14 χλμ Δράμας-Καβάλας, Δράμα, ΤΚ 66300</div>
</div>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.open(); w.document.write(html); w.document.close(); w.focus();
      w.onload = () => { try { w.print(); } catch {} };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Scissors size={26} className="text-teal-600" />
              Σχέδιο Κοπής
            </h2>
            <p className="text-sm text-slate-500 mt-1">Δώσε τα μήκη που χρειάζεσαι — υπολογίζει πώς να τα κόψεις με τη λιγότερη φύρα.</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          <div className="flex gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Μήκος ράβδου (mm)</label>
              <input value={stockLength} onChange={e => setStockLength(e.target.value)} className="w-32 border border-slate-300 rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Κοπή δίσκου / kerf (mm)</label>
              <input value={kerf} onChange={e => setKerf(e.target.value)} className="w-32 border border-slate-300 rounded px-2 py-1.5" />
            </div>
          </div>

          <div>
            <div className="text-sm font-bold text-slate-700 mb-2">Απαιτούμενα Μήκη</div>
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="flex gap-2 items-center">
                  <input
                    value={r.length}
                    onChange={e => updateRow(r.id, { length: e.target.value })}
                    placeholder="Μήκος (mm)"
                    className="flex-1 border border-slate-300 rounded px-2 py-1.5"
                  />
                  <span className="text-slate-400 text-sm">×</span>
                  <input
                    value={r.qty}
                    onChange={e => updateRow(r.id, { qty: e.target.value })}
                    placeholder="Τεμ."
                    className="w-20 border border-slate-300 rounded px-2 py-1.5"
                  />
                  <button onClick={() => removeRow(r.id)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-full">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addRow} className="mt-2 text-sm text-teal-700 hover:text-teal-900 font-medium flex items-center gap-1">
              <Plus size={16} /> Προσθήκη γραμμής
            </button>
          </div>

          {plan && (
            <div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div><span className="text-slate-500">Ράβδοι:</span> <span className="font-bold">{plan.totalBars}</span></div>
                <div><span className="text-slate-500">Τεμάχια:</span> <span className="font-bold">{plan.totalPieces}</span></div>
                <div><span className="text-slate-500">Φύρα:</span> <span className="font-bold">{formatNumber(plan.totalWaste)}mm ({plan.wastePercent.toFixed(1)}%)</span></div>
                <div><span className="text-slate-500">Βέλτιστο:</span> <span className="font-bold">{plan.isOptimal ? '✓ Ναι' : `κάτω όριο ${plan.lowerBound}`}</span></div>
              </div>

              {plan.tooLong.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
                  ⚠️ Αυτά τα μήκη δεν χωράνε σε ράβδο {stock}mm: {plan.tooLong.map(l => `${l}mm`).join(', ')}
                </div>
              )}

              <div className="space-y-1.5">
                {plan.groups.map((g, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="font-bold text-teal-700">{g.count}×</span>{' '}
                      {g.pattern.map(l => `${l}mm`).join(' + ')}
                    </div>
                    <div className="text-slate-500">φύρα {g.waste}mm</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button
            onClick={handlePrint}
            disabled={!plan || plan.totalBars === 0}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold px-6 py-2.5 rounded-lg flex items-center gap-2"
          >
            <Printer size={18} /> Εκτύπωση Σχεδίου
          </button>
        </div>
      </div>
    </div>
  );
}
