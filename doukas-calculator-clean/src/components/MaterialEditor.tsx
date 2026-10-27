import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Edit2 } from 'lucide-react';
import { Material, SheetType, PipeType, MaterialSize } from '../types';

interface MaterialEditorProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Record<string, Material>;
  sheetTypes: Record<string, SheetType>;
  pipeTypes: Record<string, PipeType>;
  onUpdateMaterials: (materials: Record<string, Material>) => void;
  onUpdateSheetTypes: (types: Record<string, SheetType>) => void;
  onUpdatePipeTypes: (types: Record<string, PipeType>) => void;
}

export default function MaterialEditor({ 
  isOpen, onClose, materials, sheetTypes, pipeTypes,
  onUpdateMaterials, onUpdateSheetTypes, onUpdatePipeTypes 
}: MaterialEditorProps) {
  const [activeTab, setActiveTab] = useState<'materials' | 'sheets' | 'pipes'>('materials');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editKey, setEditKey] = useState('');

  if (!isOpen) return null;

  const handleDelete = (key: string) => {
    if (!confirm('Είστε σίγουρος;')) return;
    
    if (activeTab === 'materials') {
      const newMaterials = { ...materials };
      delete newMaterials[key];
      onUpdateMaterials(newMaterials);
    } else if (activeTab === 'sheets') {
      const newSheets = { ...sheetTypes };
      delete newSheets[key];
      onUpdateSheetTypes(newSheets);
    } else {
      const newPipes = { ...pipeTypes };
      delete newPipes[key];
      onUpdatePipeTypes(newPipes);
    }
  };

  const handleSave = (key: string, data: any) => {
    if (activeTab === 'materials') {
      onUpdateMaterials({ ...materials, [key]: data });
    } else if (activeTab === 'sheets') {
      onUpdateSheetTypes({ ...sheetTypes, [key]: data });
    } else {
      onUpdatePipeTypes({ ...pipeTypes, [key]: data });
    }
    setEditingItem(null);
    setEditKey('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800">Διαχείριση Υλικών</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex border-b">
          <button 
            className={`px-4 py-2 ${activeTab === 'materials' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-600'}`}
            onClick={() => setActiveTab('materials')}
          >
            Δοκοί & Προφίλ
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'sheets' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-600'}`}
            onClick={() => setActiveTab('sheets')}
          >
            Λαμαρίνες
          </button>
          <button 
            className={`px-4 py-2 ${activeTab === 'pipes' ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-slate-600'}`}
            onClick={() => setActiveTab('pipes')}
          >
            Σωλήνες
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {editingItem ? (
            <EditForm 
              type={activeTab} 
              initialData={editingItem} 
              itemKey={editKey}
              onSave={handleSave} 
              onCancel={() => { setEditingItem(null); setEditKey(''); }} 
            />
          ) : (
            <div>
              <button 
                onClick={() => { setEditingItem({}); setEditKey(''); }}
                className="mb-4 flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                <Plus size={18} /> Προσθήκη Νέου
              </button>
              
              <div className="grid gap-2">
                {Object.entries(activeTab === 'materials' ? materials : activeTab === 'sheets' ? sheetTypes : pipeTypes).map(([key, item]) => (
                  <div key={key} className="flex justify-between items-center p-3 border rounded hover:bg-slate-50">
                    <div>
                      <span className="font-bold">{item.label}</span>
                      <span className="text-sm text-slate-500 ml-2">({key})</span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingItem(item); setEditKey(key); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(key)} className="p-2 text-red-600 hover:bg-red-100 rounded">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditForm({ type, initialData, itemKey, onSave, onCancel }: any) {
  const [formData, setFormData] = useState(initialData);
  const [key, setKey] = useState(itemKey);
  
  // Separate state for JSON text to prevent cursor jumping
  const [jsonText, setJsonText] = useState(() => 
    JSON.stringify(
      type === 'sheets' 
        ? (initialData.thicknesses || []) 
        : (initialData.sizes || []), 
      null, 
      2
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Parse JSON before saving
    try {
      const parsed = JSON.parse(jsonText);
      const dataToSave = {
        ...formData,
        [type === 'sheets' ? 'thicknesses' : 'sizes']: parsed
      };
      onSave(key || formData.key || `custom_${Date.now()}`, dataToSave);
    } catch (err) {
      alert('Σφάλμα στο JSON! Παρακαλώ ελέγξτε τη σύνταξη.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">Κλειδί (ID)</label>
          <input 
            type="text" 
            value={key} 
            onChange={e => setKey(e.target.value)} 
            className="w-full border p-2 rounded"
            placeholder="π.χ. ipe_new"
            required
            disabled={!!itemKey}
          />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">Όνομα</label>
          <input 
            type="text" 
            value={formData.label || ''} 
            onChange={e => setFormData({...formData, label: e.target.value})} 
            className="w-full border p-2 rounded"
            required
          />
        </div>
      </div>

      {/* Dynamic fields based on type */}
      {type === 'materials' && (
        <div>
           <label className="block text-sm font-bold mb-1">Τύπος Υπολογισμού</label>
           <select 
             value={formData.type || 'wpm'} 
             onChange={e => setFormData({...formData, type: e.target.value})}
             className="w-full border p-2 rounded"
           >
             <option value="wpm">Βάρος ανά μέτρο (Standard)</option>
             <option value="rhs">Κοιλοδοκός (RHS)</option>
             <option value="chs">Σωλήνα (CHS)</option>
             <option value="solid_round">Μασίφ Στρογγυλό</option>
             <option value="solid_square">Μασίφ Τετράγωνο</option>
             <option value="flat">Λάμα (Flat)</option>
             <option value="angle_equal">Γωνία (Angle)</option>
           </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-bold mb-1">Πυκνότητα (kg/m³)</label>
        <input 
          type="number" 
          value={formData.density || 7850} 
          onChange={e => setFormData({...formData, density: parseFloat(e.target.value)})} 
          className="w-full border p-2 rounded"
        />
      </div>

      {/* JSON Editor for complex nested data (sizes/thicknesses) for simplicity */}
      <div>
        <label className="block text-sm font-bold mb-1">Δεδομένα Διαστάσεων (JSON)</label>
        <textarea
          value={jsonText}
          onChange={e => setJsonText(e.target.value)}
          className="w-full border p-2 rounded font-mono text-sm h-64"
          placeholder={type === 'sheets' ? '[0.5, 1, 1.5, 2]' : '[{"code": "IPE100", "label": "IPE 100", "wpm": 8.1}]'}
        />
        <p className="text-xs text-slate-500 mt-1">
          Επεξεργαστείτε τις διαστάσεις σε μορφή JSON. Προσοχή στη σύνταξη.
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">
          Ακύρωση
        </button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Save size={18} className="inline mr-2" />
          Αποθήκευση
        </button>
      </div>
    </form>
  );
}
