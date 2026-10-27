import { OrderItem } from '../types';

export interface MaterialStats {
  materialKey: string;
  materialName: string;
  category: string;
  totalQuantity: number;
  totalWeight: number;
  orderCount: number;
  lastUsed: Date;
  averageQuantity: number;
}

export interface SavedOrder {
  orderNum: string;
  mode: string;
  customer: string;
  customerPhone: string;
  project: string;
  rows: OrderItem[];
  timestamp: number;
}

export function analyzeMaterialUsage(orderHistory: SavedOrder[]): MaterialStats[] {
  const statsMap = new Map<string, MaterialStats>();

  orderHistory.forEach(order => {
    order.rows.forEach(row => {
      const key = `${row.category}-${row.section}`;
      
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          materialKey: key,
          materialName: row.section,
          category: row.category,
          totalQuantity: 0,
          totalWeight: 0,
          orderCount: 0,
          lastUsed: new Date(order.timestamp),
          averageQuantity: 0
        });
      }

      const stats = statsMap.get(key)!;
      stats.totalQuantity += row.quantity;
      stats.totalWeight += row.weight;
      stats.orderCount += 1;
      
      const orderDate = new Date(order.timestamp);
      if (orderDate > stats.lastUsed) {
        stats.lastUsed = orderDate;
      }
    });
  });

  // Calculate averages
  statsMap.forEach(stats => {
    stats.averageQuantity = stats.totalQuantity / stats.orderCount;
  });

  // Sort by total weight (most used first)
  return Array.from(statsMap.values())
    .sort((a, b) => b.totalWeight - a.totalWeight);
}

export function getTopMaterials(stats: MaterialStats[], limit: number = 10): MaterialStats[] {
  return stats.slice(0, limit);
}

export function getMaterialsByCategory(stats: MaterialStats[]): Record<string, MaterialStats[]> {
  const byCategory: Record<string, MaterialStats[]> = {};
  
  stats.forEach(stat => {
    if (!byCategory[stat.category]) {
      byCategory[stat.category] = [];
    }
    byCategory[stat.category].push(stat);
  });

  return byCategory;
}

export function getCustomerStats(orderHistory: SavedOrder[]) {
  const customerMap = new Map<string, {
    name: string;
    orderCount: number;
    totalWeight: number;
    lastOrder: Date;
  }>();

  orderHistory.forEach(order => {
    if (!order.customer) return;

    const key = order.customer.toLowerCase();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        name: order.customer,
        orderCount: 0,
        totalWeight: 0,
        lastOrder: new Date(order.timestamp)
      });
    }

    const stats = customerMap.get(key)!;
    stats.orderCount += 1;
    stats.totalWeight += order.rows.reduce((sum, row) => sum + row.weight, 0);
    
    const orderDate = new Date(order.timestamp);
    if (orderDate > stats.lastOrder) {
      stats.lastOrder = orderDate;
    }
  });

  return Array.from(customerMap.values())
    .sort((a, b) => b.orderCount - a.orderCount);
}
