// Shared types used across the StockLite app.

export type Warehouse = {
  id: string
  name: string
  location: string
}

export type Product = {
  id: string
  name: string
  category: string
  warehouseId: string
  currentStock: number
  reorderThreshold: number
}

export type TransactionType = 'IN' | 'OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN'

export type Transaction = {
  id: string
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  type: TransactionType
  quantity: number
  timestamp: string // ISO string
  linkedTransactionId?: string // pairs TRANSFER_OUT with TRANSFER_IN
}

export type StaffUser = {
  id: string
  name: string
  role: 'staff'
}

// Low-stock status shared by the inventory table and status badge.
export type StockStatus = 'ok' | 'low' | 'critical'

// The single source of truth for "needs replenishment": a product is low
// stock when current stock is AT or BELOW its reorder threshold. The table
// filter, the status badges, and the low-stock panel all use this helper so
// the three can never disagree.
export function isLowStock(product: Product): boolean {
  return product.currentStock <= product.reorderThreshold
}

export function getStockStatus(product: Product): StockStatus {
  if (product.currentStock < product.reorderThreshold) return 'critical'
  if (isLowStock(product)) return 'low'
  return 'ok'
}

export function getStockStatusLabel(status: StockStatus): string {
  if (status === 'critical') return 'Low stock · below threshold'
  if (status === 'low') return 'Low stock · at threshold'
  return 'In stock'
}
