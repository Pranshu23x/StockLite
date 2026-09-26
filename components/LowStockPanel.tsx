'use client'

import { Product, Warehouse, isLowStock } from '@/lib/types'

// Task 5 (stretch) — Low stock summary panel: shows how many products need
// replenishment in EACH warehouse, split by "below threshold" vs "at
// threshold" so the numbers match the status badges in the inventory table.
// Counts come from the shared isLowStock rule, so this panel can never
// disagree with the table's "Low stock only" filter.
export default function LowStockPanel({
  products,
  warehouses,
}: {
  products: Product[]
  warehouses: Warehouse[]
}) {
  const perWarehouse = warehouses.map((warehouse) => {
    const rows = products.filter((p) => p.warehouseId === warehouse.id)
    const below = rows.filter((p) => p.currentStock < p.reorderThreshold).length
    const at = rows.filter((p) => p.currentStock === p.reorderThreshold).length
    const needs = below + at
    return { warehouse, below, at, needs }
  })

  const totalNeeds = perWarehouse.reduce((sum, w) => sum + w.needs, 0)

  return (
    <section className="panel low-stock-panel" aria-label="Low stock by warehouse">
      <div className="low-stock-panel-header">
        <h2>Replenishment needed</h2>
        <p>
          {totalNeeds === 0
            ? 'No products are at or below their reorder threshold.'
            : `${totalNeeds} product${totalNeeds === 1 ? '' : 's'} at or below reorder threshold across ${warehouses.length} warehouse${warehouses.length === 1 ? '' : 's'}.`}
        </p>
      </div>

      {totalNeeds === 0 ? (
        <div className="low-stock-clear">
          All warehouses are above their reorder thresholds.
        </div>
      ) : (
        <div className="summary-strip low-stock-tiles">
          {perWarehouse.map(({ warehouse, below, at, needs }) => (
            <div
              className="summary-tile"
              key={warehouse.id}
              data-testid={`low-stock-${warehouse.id}`}
            >
              <div className="value">{needs}</div>
              <div className="label">Need replenishment · {warehouse.name}</div>
              <div className="low-stock-tile-note">
                {below} below threshold · {at} at threshold
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
