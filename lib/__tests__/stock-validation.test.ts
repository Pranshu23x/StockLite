import { describe, expect, it, vi } from 'vitest'
import { getStockStatus, isLowStock, Product } from '@/lib/types'

// seed-data keeps its store in module scope, so every test loads a fresh
// copy of the module to isolate mutations.
type SeedModule = typeof import('@/lib/seed-data')

async function freshStore(): Promise<SeedModule> {
  vi.resetModules()
  return import('@/lib/seed-data')
}

const snapshot = (store: SeedModule) => JSON.stringify(store.products)

function expectNoWrites(store: SeedModule, before: string, txCount: number) {
  expect(snapshot(store)).toBe(before)
  expect(store.transactions.length).toBe(txCount)
}

describe('applyStockMovement — stock in/out must be whole units (Task 5)', () => {
  for (const quantity of [2.5, 0.5, 1.999, 10.1, 0, -5, NaN, Infinity]) {
    for (const direction of ['IN', 'OUT'] as const) {
      it(`rejects ${String(quantity)} on ${direction} with zero writes`, async () => {
        const store = await freshStore()
        const before = snapshot(store)
        const txCount = store.transactions.length

        expect(() => store.applyStockMovement('p-001', quantity, direction)).toThrow(
          /whole number/,
        )
        expectNoWrites(store, before, txCount)
      })
    }
  }

  it('rejects non-number quantities such as the string "2.5"', async () => {
    const store = await freshStore()
    const before = snapshot(store)
    const txCount = store.transactions.length

    expect(() =>
      store.applyStockMovement('p-001', '2.5' as unknown as number, 'IN'),
    ).toThrow(/whole number/)
    expectNoWrites(store, before, txCount)
  })

  it('accepts whole numbers and lands exactly', async () => {
    const store = await freshStore()
    const box = store.products.find((p) => p.id === 'p-001')!
    expect(box.currentStock).toBe(420)

    store.applyStockMovement('p-001', 5, 'IN')
    expect(box.currentStock).toBe(425)

    store.applyStockMovement('p-001', 425, 'OUT')
    expect(box.currentStock).toBe(0)
    expect(box.currentStock).not.toBeLessThan(0)
  })

  it('blocks OUT beyond stock so inventory never goes negative', async () => {
    const store = await freshStore()
    const before = snapshot(store)
    const txCount = store.transactions.length
    const printer = store.products.find((p) => p.id === 'p-007')!
    expect(printer.currentStock).toBe(3)

    expect(() => store.applyStockMovement('p-007', 4, 'OUT')).toThrow(
      /Insufficient stock/,
    )
    expect(printer.currentStock).toBe(3)
    expectNoWrites(store, before, txCount)
  })
})

describe('applyTransfer — whole units only, both warehouses updated (Task 5)', () => {
  for (const quantity of [2.5, 0.5, 1.999]) {
    it(`rejects ${quantity} with zero writes`, async () => {
      const store = await freshStore()
      const before = snapshot(store)
      const txCount = store.transactions.length

      expect(() => store.applyTransfer('p-001', 'wh-south', quantity)).toThrow(
        /whole number/,
      )
      expectNoWrites(store, before, txCount)
    })
  }

  it('updates BOTH warehouses and conserves the product total', async () => {
    const store = await freshStore()
    const totalFor = (name: string) =>
      store.products
        .filter((p) => p.name === name)
        .reduce((sum, p) => sum + p.currentStock, 0)

    const name = 'Corrugated Shipping Box (M)'
    const before = totalFor(name)
    const txBefore = store.transactions.length
    expect(before).toBe(458)

    const { source, destination } = store.applyTransfer('p-001', 'wh-south', 10)

    expect(source.warehouseId).toBe('wh-north')
    expect(source.currentStock).toBe(410)
    expect(destination.warehouseId).toBe('wh-south')
    expect(destination.currentStock).toBe(48)
    expect(totalFor(name)).toBe(before)
    expect(store.transactions.length).toBe(txBefore + 2)
  })

  it('rejects transfers beyond source stock with no writes', async () => {
    const store = await freshStore()
    const before = snapshot(store)
    const txCount = store.transactions.length

    expect(() => store.applyTransfer('p-007', 'wh-south', 4)).toThrow(
      /exceeds available stock/,
    )
    expectNoWrites(store, before, txCount)
  })
})

describe('low stock rule: currentStock <= reorderThreshold (Task 5)', () => {
  const product = (currentStock: number, reorderThreshold: number): Product => ({
    id: 'p-x',
    name: 'Fixture',
    category: 'Packaging',
    warehouseId: 'wh-north',
    currentStock,
    reorderThreshold,
  })

  it('isLowStock covers below AND at threshold', () => {
    expect(isLowStock(product(4, 6))).toBe(true)
    expect(isLowStock(product(6, 6))).toBe(true)
    expect(isLowStock(product(7, 6))).toBe(false)
    expect(isLowStock(product(0, 6))).toBe(true)
  })

  it('getStockStatus agrees with isLowStock for every case', () => {
    for (const [stock, threshold] of [
      [4, 6],
      [6, 6],
      [7, 6],
      [0, 5],
      [100, 100],
      [101, 100],
    ]) {
      const p = product(stock, threshold)
      expect(isLowStock(p)).toBe(getStockStatus(p) !== 'ok')
    }
  })

  it('still distinguishes below threshold vs at threshold for badges', () => {
    expect(getStockStatus(product(4, 6))).toBe('critical')
    expect(getStockStatus(product(6, 6))).toBe('low')
    expect(getStockStatus(product(7, 6))).toBe('ok')
  })
})
