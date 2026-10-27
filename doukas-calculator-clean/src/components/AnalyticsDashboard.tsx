import React, { useMemo, useState } from 'react';
import { X, TrendingUp, Package, Users, Calendar } from 'lucide-react';
import { analyzeMaterialUsage, getTopMaterials, getMaterialsByCategory, getCustomerStats } from '../utils/analytics';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  orderHistory: any[];
}

export default function AnalyticsDashboard({ isOpen, onClose, orderHistory }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'materials' | 'customers'>('materials');

  const materialStats = useMemo(() => analyzeMaterialUsage(orderHistory), [orderHistory]);
  const topMaterials = useMemo(() => getTopMaterials(materialStats, 15), [materialStats]);
  const materialsByCategory = useMemo(() => getMaterialsByCategory(materialStats), [materialStats]);
  const customerStats = useMemo(() => getCustomerStats(orderHistory), [orderHistory]);

  if (!isOpen) return null;

  const maxWeight = topMaterials[0]?.totalWeight || 1;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp size={28} className="text-blue-600" />
              Analytics Dashboard
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Ανάλυση {orderHistory.length} παραγγελιών
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-slate-50">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'materials'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Package size={18} className="inline mr-2" />
            Υλικά
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-6 py-3 font-semibold transition-colors ${
              activeTab === 'customers'
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            <Users size={18} className="inline mr-2" />
            Πελάτες
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'materials' ? (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-2 border-blue-200">
                  <div className="text-sm font-semibold text-blue-800 mb-1">Συνολικά Υλικά</div>
                  <div className="text-3xl font-bold text-blue-900">{materialStats.length}</div>
                  <div className="text-xs text-blue-600 mt-1">Διαφορετικά είδη</div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                  <div className="text-sm font-semibold text-green-800 mb-1">Συνολικό Βάρος</div>
                  <div className="text-3xl font-bold text-green-900">
                    {materialStats.reduce((sum, m) => sum + m.totalWeight, 0).toLocaleString('el-GR', {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </div>
                  <div className="text-xs text-green-600 mt-1">kg συνολικά</div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-2 border-purple-200">
                  <div className="text-sm font-semibold text-purple-800 mb-1">Παραγγελίες</div>
                  <div className="text-3xl font-bold text-purple-900">{orderHistory.length}</div>
                  <div className="text-xs text-purple-600 mt-1">Σύνολο παραγγελιών</div>
                </div>
              </div>

              {/* Top Materials Heatmap */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  🔥 Top 15 Υλικά (κατά βάρος)
                </h3>
                <div className="space-y-2">
                  {topMaterials.map((material, index) => {
                    const percentage = (material.totalWeight / maxWeight) * 100;
                    const color = 
                      index === 0 ? 'bg-red-500' :
                      index < 3 ? 'bg-orange-500' :
                      index < 5 ? 'bg-yellow-500' :
                      index < 10 ? 'bg-blue-500' : 'bg-slate-400';

                    return (
                      <div key={material.materialKey} className="bg-slate-50 rounded-lg p-3 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-slate-400 w-8">#{index + 1}</span>
                            <div>
                              <div className="font-bold text-slate-800">{material.materialName}</div>
                              <div className="text-xs text-slate-500">{material.category}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-blue-700">
                              {material.totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} kg
                            </div>
                            <div className="text-xs text-slate-500">
                              {material.orderCount} παραγγελίες · Μ.Ο. {material.averageQuantity.toFixed(1)} τεμ.
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${color} transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By Category */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Κατανομή ανά Κατηγορία</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(materialsByCategory).map(([category, materials]) => {
                    const totalWeight = materials.reduce((sum, m) => sum + m.totalWeight, 0);
                    return (
                      <div key={category} className="bg-white border-2 border-slate-200 rounded-lg p-4">
                        <div className="font-bold text-slate-800 mb-2">{category}</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 0 })} kg
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {materials.length} διαφορετικά υλικά
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Stats */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  👥 Top Πελάτες
                </h3>
                <div className="space-y-2">
                  {customerStats.slice(0, 20).map((customer, index) => (
                    <div key={customer.name} className="bg-slate-50 rounded-lg p-4 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold text-slate-400 w-8">#{index + 1}</span>
                          <div>
                            <div className="font-bold text-slate-800">{customer.name}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <Calendar size={12} />
                              Τελευταία: {customer.lastOrder.toLocaleDateString('el-GR')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-700">{customer.orderCount} παραγγελίες</div>
                          <div className="text-sm text-slate-600">
                            {customer.totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 0 })} kg
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-slate-50 text-center text-sm text-slate-500">
          Δεδομένα από {orderHistory.length} παραγγελίες
        </div>
      </div>
    </div>
  );
}
