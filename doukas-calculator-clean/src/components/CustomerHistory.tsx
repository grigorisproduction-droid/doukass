import React, { useState, useMemo } from 'react';
import { X, Calendar, Package, TrendingUp, Search } from 'lucide-react';
import { SavedOrder } from './OrderHistory';

interface CustomerHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  orderHistory: SavedOrder[];
  onLoadOrder: (order: SavedOrder) => void;
}

export default function CustomerHistory({ isOpen, onClose, orderHistory, onLoadOrder }: CustomerHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Group orders by customer
  const customerGroups = useMemo(() => {
    const groups = new Map<string, {
      name: string;
      orders: SavedOrder[];
      totalWeight: number;
      totalOrders: number;
      lastOrder: Date;
    }>();

    orderHistory.forEach(order => {
      const customerName = order.customer || '(Χωρίς πελάτη)';
      const key = customerName.toLowerCase();

      if (!groups.has(key)) {
        groups.set(key, {
          name: customerName,
          orders: [],
          totalWeight: 0,
          totalOrders: 0,
          lastOrder: new Date(order.date)
        });
      }

      const group = groups.get(key)!;
      group.orders.push(order);
      group.totalOrders++;
      group.totalWeight += order.rows.reduce((sum, row) => sum + row.weight, 0);
      
      const orderDate = new Date(order.date);
      if (orderDate > group.lastOrder) {
        group.lastOrder = orderDate;
      }
    });

    return Array.from(groups.values())
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }, [orderHistory]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customerGroups;
    const query = searchQuery.toLowerCase();
    return customerGroups.filter(c => 
      c.name.toLowerCase().includes(query)
    );
  }, [customerGroups, searchQuery]);

  const selectedOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    const group = customerGroups.find(c => c.name === selectedCustomer);
    return group?.orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
  }, [customerGroups, selectedCustomer]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              👥 Ιστορικό Πελατών
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {customerGroups.length} πελάτες · {orderHistory.length} παραγγελίες
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg">
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b bg-slate-50">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Αναζήτηση πελάτη..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Customers List */}
          <div className="w-1/3 border-r overflow-auto">
            <div className="p-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.name}
                  onClick={() => setSelectedCustomer(customer.name)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                    selectedCustomer === customer.name
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'hover:bg-slate-50 border-2 border-transparent'
                  }`}
                >
                  <div className="font-bold text-slate-800">{customer.name}</div>
                  <div className="text-sm text-slate-600 mt-1">
                    {customer.totalOrders} παραγγελίες
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {customer.totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 0 })} kg συνολικά
                  </div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <Calendar size={10} />
                    {customer.lastOrder.toLocaleDateString('el-GR')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Orders Timeline */}
          <div className="flex-1 overflow-auto p-6">
            {selectedCustomer ? (
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">
                  Παραγγελίες: {selectedCustomer}
                </h3>
                <div className="space-y-4">
                  {selectedOrders.map((order) => {
                    const totalWeight = order.rows.reduce((sum, row) => sum + row.weight, 0);
                    return (
                      <div key={order.orderNum} className="bg-white border-2 border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-bold text-blue-700">
                              {order.mode === 'OFFER' ? '📋 Προσφορά' : '📦 Παραγγελία'} #{order.orderNum}
                            </div>
                            <div className="text-sm text-slate-600 mt-1">
                              {order.project && <span>Έργο: {order.project} · </span>}
                              {new Date(order.date).toLocaleString('el-GR')}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onLoadOrder(order);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                          >
                            Φόρτωση
                          </button>
                        </div>

                        {/* Materials Summary */}
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-slate-500">Υλικά</div>
                              <div className="font-bold text-slate-800">{order.rows.length} είδη</div>
                            </div>
                            <div>
                              <div className="text-slate-500">Συνολικό Βάρος</div>
                              <div className="font-bold text-blue-700">
                                {totalWeight.toLocaleString('el-GR', { minimumFractionDigits: 2 })} kg
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Materials List */}
                        <div className="space-y-1">
                          {order.rows.slice(0, 5).map((row, idx) => (
                            <div key={idx} className="text-xs text-slate-600 flex justify-between">
                              <span>{row.section} · {row.dimensions}</span>
                              <span className="font-mono">{row.quantity} τεμ.</span>
                            </div>
                          ))}
                          {order.rows.length > 5 && (
                            <div className="text-xs text-slate-400 italic">
                              + {order.rows.length - 5} ακόμα...
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <Package size={64} className="mx-auto mb-4 opacity-50" />
                  <p>Επέλεξε πελάτη για να δεις το ιστορικό</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
