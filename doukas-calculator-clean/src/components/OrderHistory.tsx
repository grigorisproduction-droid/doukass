import React from "react";
import { X, Trash2, RotateCcw } from "lucide-react";
import { OrderItem } from "../types";

export interface SavedOrder {
  id: string;
  date: string; // ISO
  mode: "ORDER" | "OFFER";
  orderNum: string;
  customer: string;
  customerPhone: string;
  project: string;
  rows: OrderItem[];
  totalWeight: number;
  finishes?: string[];
}

interface OrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedOrder[];
  onDelete: (id: string) => void;
  onLoad: (order: SavedOrder) => void;
}

export default function OrderHistory({
  isOpen,
  onClose,
  history,
  onDelete,
  onLoad,
}: OrderHistoryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800">
            Ιστορικό Παραγγελιών / Προσφορών
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {history.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Δεν υπάρχουν αποθηκευμένες εγγραφές.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-3 border-b">Ημερομηνία</th>
                  <th className="p-3 border-b">Τύπος</th>
                  <th className="p-3 border-b">Αριθμός</th>
                  <th className="p-3 border-b">Πελάτης</th>
                  <th className="p-3 border-b">Έργο</th>
                  <th className="p-3 border-b text-right">Σύνολο (kg)</th>
                  <th className="p-3 border-b text-center">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {history.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-slate-50">
                    <td className="p-3">{new Date(order.date).toLocaleDateString("el-GR")}</td>
                    <td className="p-3 font-medium">
                      {order.mode === "OFFER" ? "ΠΡΟΣΦΟΡΑ" : "ΠΑΡΑΓΓΕΛΙΑ"}
                    </td>
                    <td className="p-3 font-mono font-bold">{order.orderNum || "-"}</td>
                    <td className="p-3 font-medium">{order.customer || "-"}</td>
                    <td className="p-3">{order.project || "-"}</td>
                    <td className="p-3 text-right font-bold">
                      {order.totalWeight.toFixed(2)}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => onLoad(order)}
                          title="Φόρτωση"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={() => onDelete(order.id)}
                          title="Διαγραφή"
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}