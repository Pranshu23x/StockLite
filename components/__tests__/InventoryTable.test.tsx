import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InventoryTable from '@/components/InventoryTable'
import { Product, Warehouse } from '@/lib/types'

const warehouses: Warehouse[] = [
  { id: 'wh-north', name: 'North Distribution Center', location: 'Elkridge, MD' },
  { id: 'wh-south', name: 'South Fulfillment Hub', location: 'Waco, TX' },
]

const products: Product[] = [
  {
    id: 'p-1',
    name: 'Packing Tape',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock: 210,
    reorderThreshold: 80,
  },
  {
    id: 'p-2',
    name: 'Shipping Box',
    category: 'Packaging',
    warehouseId: 'wh-south',
    currentStock: 38,
    reorderThreshold: 100,
  },
  {
    id: 'p-3',
    name: 'Safety Vest',
    category: 'Safety',
    warehouseId: 'wh-north',
    currentStock: 20,
    reorderThreshold: 20,
  },
  {
    id: 'p-4',
    name: 'Nitrile Gloves',
    category: 'Safety',
    warehouseId: 'wh-south',
    currentStock: 140,
    reorderThreshold: 50,
  },
  {
    id: 'p-5',
    name: 'Barcode Scanner',
    category: 'Electronics',
    warehouseId: 'wh-north',
    currentStock: 4,
    reorderThreshold: 6,
  },
  {
    id: 'p-6',
    name: 'Pallet Jack',
    category: 'Equipment',
    warehouseId: 'wh-south',
    currentStock: 12,
    reorderThreshold: 4,
  },
  {
    id: 'p-7',
    name: 'Restock Crate',
    category: 'Materials',
    warehouseId: 'wh-north',
    currentStock: 0,
    reorderThreshold: 10,
  },
]

function renderTable() {
  return render(<InventoryTable products={products} warehouses={warehouses} />)
}

function bodyRows() {
  const groups = screen.queryAllByRole('rowgroup')
  if (groups.length < 2) return []
  return within(groups[1]).queryAllByRole('row')
}

function visibleNames() {
  return bodyRows().map((row) => within(row).getAllByRole('cell')[0].textContent)
}

describe('InventoryTable', () => {
  it('shows name, category, warehouse, current stock, and reorder threshold', () => {
    renderTable()

    for (const heading of [
      'Product',
      'Category',
      'Warehouse',
      'Current stock',
      'Reorder threshold',
      'Status',
    ]) {
      expect(screen.getByRole('columnheader', { name: heading })).toBeInTheDocument()
    }

    expect(screen.getAllByRole('row')).toHaveLength(products.length + 1)

    const boxRow = bodyRows().find(
      (row) => within(row).getAllByRole('cell')[0].textContent === 'Shipping Box',
    )!
    const cells = within(boxRow).getAllByRole('cell').map((c) => c.textContent)
    expect(cells).toEqual([
      'Shipping Box',
      'Packaging',
      'South Fulfillment Hub',
      '38',
      '100',
      'Low stock · below threshold',
    ])
  })

  it('filters by category', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Safety')

    expect(visibleNames()).toEqual(['Safety Vest', 'Nitrile Gloves'])
  })

  it('shows only low stock items when low stock is checked, using stock <= threshold', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByLabelText('Low stock only'))

    // 38 <= 100 (below), 20 === 20 (at threshold), 4 <= 6 (below), 0 <= 10 (out)
    expect(visibleNames()).toEqual([
      'Shipping Box',
      'Safety Vest',
      'Barcode Scanner',
      'Restock Crate',
    ])
    expect(visibleNames()).not.toContain('Packing Tape')
    expect(visibleNames()).not.toContain('Nitrile Gloves')
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
  })

  it('combines the category and low stock filters', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Safety')
    await user.click(screen.getByLabelText('Low stock only'))

    expect(visibleNames()).toEqual(['Safety Vest'])

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Packaging')
    expect(visibleNames()).toEqual(['Shipping Box'])

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Electronics')
    expect(visibleNames()).toEqual(['Barcode Scanner'])

    // Equipment stock is above threshold, so the filters together match nothing
    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Equipment')
    expect(visibleNames()).toEqual([])
    expect(
      screen.getByRole('heading', { name: 'No products match these filters' }),
    ).toBeInTheDocument()
  })

  it('shows an empty state with a clear filters action when nothing matches', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.selectOptions(screen.getByLabelText('Filter by category'), 'Equipment')
    await user.click(screen.getByLabelText('Low stock only'))

    expect(
      screen.getByRole('heading', { name: 'No products match these filters' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(
      screen.queryByRole('heading', { name: 'No products match these filters' }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('Filter by category')).toHaveValue('all')
    expect(screen.getByLabelText('Low stock only')).not.toBeChecked()
    expect(bodyRows()).toHaveLength(products.length)
  })
})
