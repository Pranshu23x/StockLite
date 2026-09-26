'use client'

import { useMemo, useState } from 'react'
import { Transaction } from '@/lib/types'

const TYPE_LABELS: Record<string, string> = {
  IN: 'Stock in',
  OUT: 'Stock out',
  TRANSFER_OUT: 'Transfer out',
  TRANSFER_IN: 'Transfer in',
}

// Format the timestamp deterministically. toLocaleString() depends on the
// environment's locale, so the Node server and the browser rendered
// different strings ("26/9/2026, 4:00:54 pm" vs "9/26/2026, 4:00:54 PM")
// and React hydration crashed. Using only numeric Date getters keeps SSR
// and client output identical regardless of locale.
function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  const hour24 = d.getHours()
  const hour12 = hour24 % 12 || 12
  const meridiem = hour24 < 12 ? 'am' : 'pm'
  return (
    `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}, ` +
    `${hour12}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${meridiem}`
  )
}

export default function TransactionTable({
  transactions,
}: {
  transactions: Transaction[]
}) {
  const warehouseOptions = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.warehouseName))).sort(),
    [transactions],
  )

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
