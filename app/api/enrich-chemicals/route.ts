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

  const limited = chemicals.slice(0, 100)
  const enriched = await Promise.all(
    limited.map(async (c) => {
      const query = c.cas_number?.trim() || c.name?.trim()
      if (!query) return null
      try {
        return await enrichByQuery(query)
      } catch {
        return null
      }
    })
  )

  return NextResponse.json({ enriched })
}
