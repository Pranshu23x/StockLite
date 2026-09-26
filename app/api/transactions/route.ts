import { NextResponse } from 'next/server'
import { transactions } from '@/lib/seed-data'

// The log lives in an in-memory store that POST /api/items appends to, so this
// route must run per request. Without it Next prerenders the seed snapshot at
// build time and production responses never show new transactions.
export const dynamic = 'force-dynamic'

// GET /api/transactions — returns the transaction log.
// New transactions are appended here as a side effect of POST /api/items
// (stock in/out and transfers both log through lib/seed-data.ts), so this
// route only needs to read the current in-memory list.
export async function GET() {
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
  return NextResponse.json({ transactions: sorted })
}
