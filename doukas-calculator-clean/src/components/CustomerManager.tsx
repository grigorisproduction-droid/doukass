import { useMemo, useState } from "react";
import { Customer } from "../types/Customer";
import { Plus, Trash2, Edit2, X, Save, Search, Phone } from "lucide-react";
import { formatPhone, normalizePhone, phoneMatches } from "../utils/phone";

interface CustomerManagerProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onUpdateCustomers: (customers: Customer[]) => void;
  onSelectCustomer?: (customer: Customer) => void;
}

export default function CustomerManager({
  isOpen,
  onClose,
  customers,
  onUpdateCustomers,
  onSelectCustomer,
}: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || phoneMatches(c.phone, searchTerm.trim())
    );
  }, [customers, searchTerm]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (!newName.trim()) return;
    const newCustomer: Customer = {
      id: Date.now().toString(),
      name: newName.trim(),
      phone: normalizePhone(newPhone),
    };
    onUpdateCustomers([...customers, newCustomer]);
    setNewName("");
    setNewPhone("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Διαγραφή πελάτη;")) {
      onUpdateCustomers(customers.filter((c) => c.id !== id));
    }
  };

  const startEdit = (c: Customer) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditPhone(c.phone);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    onUpdateCustomers(
      customers.map((c) =>
        c.id === editingId
          ? { ...c, name: editName.trim(), phone: normalizePhone(editPhone) }
          : c
      )
    );
    setEditingId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Διαχείριση Πελατών</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-grow">
          {/* Add New */}
          <div className="bg-gray-50 p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-gray-500 uppercase">Προσθήκη Νέου</h3>
            <div className="flex gap-3">
              <input
                placeholder="Όνομα"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <input
                placeholder="Τηλέφωνο"
                value={formatPhone(newPhone)}
                onChange={(e) => setNewPhone(normalizePhone(e.target.value))}
                className="flex-1 px-3 py-2 border rounded-lg"
              />
              <button
                onClick={handleAdd}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                title="Προσθήκη"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              placeholder="Αναζήτηση (όνομα ή τηλέφωνο)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>

          {/* List */}
          <div className="space-y-2">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 p-3 border rounded-xl hover:bg-gray-50"
              >
                {editingId === c.id ? (
                  <>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <input
                      value={formatPhone(editPhone)}
                      onChange={(e) => setEditPhone(normalizePhone(e.target.value))}
                      className="flex-1 px-2 py-1 border rounded"
                    />
                    <button onClick={saveEdit} className="text-green-600 p-1" title="Αποθήκευση">
                      <Save size={18} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 p-1"
                      title="Ακύρωση"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => onSelectCustomer?.(c)}
                      title={onSelectCustomer ? "Επιλογή" : undefined}
                    >
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-500">{formatPhone(c.phone)}</div>
                    </div>
                    {c.phone && (
                      <a
                        href={`tel:${formatPhone(c.phone)}`}
                        className="text-green-600 p-2 hover:bg-green-50 rounded-full"
                        title="Κλήση"
                      >
                        <Phone size={18} />
                      </a>
                    )}
                    <button
                      onClick={() => startEdit(c)}
                      className="text-blue-600 p-2 hover:bg-blue-50 rounded-full"
                      title="Επεξεργασία"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-red-600 p-2 hover:bg-red-50 rounded-full"
                      title="Διαγραφή"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="text-center text-gray-400 py-8">Δεν βρέθηκαν πελάτες</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}