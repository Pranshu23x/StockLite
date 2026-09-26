import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import LowStockPanel from '@/components/LowStockPanel'
import { Product, Warehouse } from '@/lib/types'

const warehouses: Warehouse[] = [
  { id: 'wh-north', name: 'North Distribution Center', location: 'Elkridge, MD' },
  { id: 'wh-south', name: 'South Fulfillment Hub', location: 'Waco, TX' },
]

function p(
  id: string,
  warehouseId: string,
  currentStock: number,
  reorderThreshold: number,
): Product {
  return {
    id,
    name: `Product ${id}`,
    category: 'Packaging',
    warehouseId,
    currentStock,
    reorderThreshold,
  }
}

// North: 1 below + 1 at threshold (+ 1 ok) -> needs 2
// South: 5 below + 2 at threshold (+ 2 ok) -> needs 7
const products: Product[] = [
  p('n-ok', 'wh-north', 420, 100),
  p('n-below', 'wh-north', 3, 5),
  p('n-at', 'wh-north', 20, 20),
  p('s-below-1', 'wh-south', 38, 100),
  p('s-below-2', 'wh-south', 15, 60),
  p('s-below-3', 'wh-south', 9, 50),
  p('s-below-4', 'wh-south', 4, 6),
  p('s-below-5', 'wh-south', 132, 150),
  p('s-at-1', 'wh-south', 8, 8),
  p('s-at-2', 'wh-south', 55, 55),
  p('s-ok-1', 'wh-south', 6, 5),
  p('s-ok-2', 'wh-south', 25, 20),
]

function tile(warehouseId: string) {
  const el = screen.getByTestId(`low-stock-${warehouseId}`)
  return {
    value: el.querySelector('.value')!.textContent,
    label: el.querySelector('.label')!.textContent,
    note: el.querySelector('.low-stock-tile-note')!.textContent,
  }
}

describe('LowStockPanel (Task 5 stretch)', () => {
  it('shows per-warehouse counts of products needing replenishment', () => {
    render(<LowStockPanel products={products} warehouses={warehouses} />)

    const north = tile('wh-north')
    expect(north.value).toBe('2')
    expect(north.label).toBe('Need replenishment · North Distribution Center')
    expect(north.note).toBe('1 below threshold · 1 at threshold')

    const south = tile('wh-south')
    expect(south.value).toBe('7')
    expect(south.label).toBe('Need replenishment · South Fulfillment Hub')
    expect(south.note).toBe('5 below threshold · 2 at threshold')
  })

  it('states the total across warehouses in the header', () => {
    render(<LowStockPanel products={products} warehouses={warehouses} />)

    expect(screen.getByRole('heading', { name: 'Replenishment needed' })).toBeInTheDocument()
    expect(
      screen.getByText(
        '9 products at or below reorder threshold across 2 warehouses.',
      ),
    ).toBeInTheDocument()
  })

  it('shows 0 for a warehouse with nothing to replenish', () => {
    const northOnlyLow = products.filter((prod) => prod.warehouseId === 'wh-north')
    render(<LowStockPanel products={northOnlyLow} warehouses={warehouses} />)

    expect(tile('wh-south')).toEqual({
      value: '0',
      label: 'Need replenishment · South Fulfillment Hub',
      note: '0 below threshold · 0 at threshold',
    })
    expect(tile('wh-north').value).toBe('2')
  })

  it('shows an all-clear message when every product is above threshold', () => {
    const allOk = [
      p('a', 'wh-north', 420, 100),
      p('b', 'wh-south', 138, 100),
    ]
    render(<LowStockPanel products={allOk} warehouses={warehouses} />)

    expect(
      screen.getByText('All warehouses are above their reorder thresholds.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('No products are at or below their reorder threshold.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('low-stock-wh-north')).not.toBeInTheDocument()
    expect(screen.queryByTestId('low-stock-wh-south')).not.toBeInTheDocument()
  })

  it('updates counts when the product list changes', () => {
    const { rerender } = render(
      <LowStockPanel products={products} warehouses={warehouses} />,
    )
    expect(tile('wh-north').value).toBe('2')

    const afterStockOut = [
      ...products,
      p('n-below-2', 'wh-north', 10, 10),
    ]
    rerender(<LowStockPanel products={afterStockOut} warehouses={warehouses} />)
    expect(tile('wh-north').value).toBe('3')
    expect(tile('wh-north').note).toBe('1 below threshold · 2 at threshold')
  })
})
