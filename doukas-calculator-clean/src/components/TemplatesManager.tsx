import React, { useState } from 'react';
import { X, LayoutTemplate, Trash2, Package } from 'lucide-react';
import { OrderItem } from '../types';

export interface OrderTemplate {
  id: string;
  name: string;
  createdAt: number;
  rows: OrderItem[];
}

interface TemplatesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  templates: OrderTemplate[];
  onLoadTemplate: (template: OrderTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function TemplatesManager({
  isOpen,
  onClose,
  templates,
  onLoadTemplate,
  onDeleteTemplate
}: TemplatesManagerProps) {
  if (!isOpen) return null;

  const sorted = [...templates].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LayoutTemplate size={26} className="text-emerald-600" />
              Templates Παραγγελιών
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {templates.length} αποθηκευμένα templates
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 py-16">
              <Package size={64} className="mb-4 opacity-40" />
              <p className="font-medium">Δεν υπάρχουν αποθηκευμένα templates</p>
              <p className="text-sm mt-1">
                Πρόσθεσε υλικά στη λίστα και πάτησε "💾 Αποθήκευση ως Template"
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.map((tpl) => {
                const totalWeight = tpl.rows.reduce((sum, r) => sum + r.weight, 0);
                return (
                  <div
                    key={tpl.id}
                    className="bg-slate-50 hover:bg-emerald-50 border-2 border-transparent hover:border-emerald-200 rounded-lg p-4 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800">{tpl.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {tpl.rows.length} υλικά · {totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(tpl.createdAt).toLocaleDateString('el-GR')}
                        </div>
                        <div className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                          {tpl.rows.slice(0, 4).map((r, i) => (
                            <span key={i}>{r.section} · {r.dimensions}</span>
                          ))}
                          {tpl.rows.length > 4 && <span className="italic">+{tpl.rows.length - 4} ακόμα...</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => {
                            onLoadTemplate(tpl);
                            onClose();
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
                        >
                          Φόρτωση
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Διαγραφή του template "${tpl.name}";`)) {
                              onDeleteTemplate(tpl.id);
                            }
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                          title="Διαγραφή"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
