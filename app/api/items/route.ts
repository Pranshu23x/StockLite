import { NextResponse } from 'next/server'
import { applyStockMovement, applyTransfer, products } from '@/lib/seed-data'

export async function GET() {
  return NextResponse.json({ products })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const action = body.action

  // Belt-and-braces type guard: quantities may only arrive as numbers,
  // numeric strings, null or undefined (the last two fall through to the
  // whole-unit check in lib/seed-data.ts via Number()). Booleans, objects
  // and arrays would otherwise be coerced by Number() into a valid quantity
  // (e.g. true -> 1), so they are rejected here before any business logic.
  const quantity = body.quantity
  if (body.action === 'stock' || body.action === 'transfer') {
    const allowed =
      quantity === undefined ||
      quantity === null ||
      typeof quantity === 'number' ||
      typeof quantity === 'string'
    if (!allowed) {
      return NextResponse.json(
        { error: 'quantity must be a number' },
        { status: 400 },
      )
    }
  }

  try {
    if (action === 'stock') {
      const { productId, direction } = body as {
        productId: string
        quantity: number
        direction: 'IN' | 'OUT'
      }
      if (direction !== 'IN' && direction !== 'OUT') {
        return NextResponse.json(
          { error: 'direction must be IN or OUT' },
          { status: 400 },
        )
      }
      const product = applyStockMovement(productId, Number(quantity), direction)
      return NextResponse.json({ product, products })
    }

    if (action === 'transfer') {
      const { productId, destWarehouseId } = body as {
        productId: string
        destWarehouseId: string
        quantity: number
      }
      const { source, destination } = applyTransfer(
        productId,
        destWarehouseId,
        Number(quantity),
      )
      return NextResponse.json({ source, destination, products })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
