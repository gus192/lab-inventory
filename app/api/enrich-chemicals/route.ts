import { NextResponse } from 'next/server'
import { enrichByQuery } from '@/lib/pubchem'

interface ChemicalInput {
  cas_number?: string | null
  name?: string | null
}

// POST body: { chemicals: ChemicalInput[] }
// Returns: { enriched: Array<PubChemData | null> } — same order as input
export async function POST(req: Request) {
  const { chemicals } = await req.json() as { chemicals: ChemicalInput[] }

  if (!Array.isArray(chemicals) || chemicals.length === 0) {
    return NextResponse.json({ error: 'chemicals array required' }, { status: 400 })
  }

  const limited = chemicals.slice(0, 150)
  const enriched = []

  // Sequential processing to respect PubChem's 5 req/sec rate limit
  for (const c of limited) {
    const query = c.cas_number?.trim() || c.name?.trim()
    if (!query) {
      enriched.push(null)
      continue
    }
    try {
      enriched.push(await enrichByQuery(query))
    } catch {
      enriched.push(null)
    }
    await new Promise(r => setTimeout(r, 220))
  }

  return NextResponse.json({ enriched })
}
