'use client'

import { useMemo, useState } from 'react'
import { Transaction, Warehouse } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  IN: 'Stock in',
  OUT: 'Stock out',
  TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
}

// Deterministic timestamp text: locale APIs (toLocaleString) render
// differently in Node vs the browser and timezone-dependent getters render
// differently when the server's TZ differs from the client's — either one
// breaks React hydration. UTC numeric getters are identical everywhere.
function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(
    d.getUTCHours(),
  )}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())} UTC`
}

export default function TransactionTable({
  transactions,
  warehouses,
}: {
  transactions: Transaction[]
  warehouses?: Warehouse[]
}) {
  // Prefer the full warehouse list (so warehouses with no transactions are
  // still selectable and land on the empty state); fall back to whatever
  // warehouse names appear in the data.
  const warehouseOptions = useMemo(() => {
    if (warehouses && warehouses.length > 0) {
      return warehouses.map((w) => w.name).sort()
    }
    return Array.from(new Set(transactions.map((t) => t.warehouseName))).sort()
  }, [transactions, warehouses])

  const [typeFilter, setTypeFilter] = useState('all')
  const [warehouseFilter, setWarehouseFilter] = useState('all')

  const visibleTransactions = useMemo(() => {
    return transactions
      .filter((t) => typeFilter === 'all' || t.type === typeFilter)
      .filter(
        (t) => warehouseFilter === 'all' || t.warehouseName === warehouseFilter,
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
  }, [transactions, typeFilter, warehouseFilter])

  return (
    <>
      <div className="filter-bar">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="IN">Stock in</option>
          <option value="OUT">Stock out</option>
          <option value="TRANSFER_OUT">Transfer out</option>
          <option value="TRANSFER_IN">Transfer in</option>
        </select>

        <select
          value={warehouseFilter}
          onChange={(e) => setWarehouseFilter(e.target.value)}
          aria-label="Filter by warehouse"
        >
          <option value="all">All warehouses</option>
          {warehouseOptions.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>

      <div className="panel table-panel">
        {visibleTransactions.length === 0 ? (
          <div className="empty-state">
            <h3>No transactions match these filters</h3>
            <p>Try a different type or warehouse.</p>
          </div>
        ) : (
          <div className="table-scroll" tabIndex={0} aria-label="Transaction history table">
            <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Warehouse</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{t.productName}</td>
                  <td>{t.warehouseName}</td>
                  <td>{TYPE_LABELS[t.type] ?? t.type}</td>
                  <td>{t.quantity}</td>
                  <td>{formatTimestamp(t.timestamp)}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
