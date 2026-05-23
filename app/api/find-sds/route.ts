import { NextResponse } from 'next/server'
import { enrichByQuery } from '@/lib/pubchem'

// POST body: { cas_numbers: string[] }
// Returns: { results: Record<cas, sds_url> }
export async function POST(req: Request) {
  const { cas_numbers } = await req.json()
  if (!Array.isArray(cas_numbers) || cas_numbers.length === 0) {
    return NextResponse.json({ error: 'cas_numbers array required' }, { status: 400 })
  }

  const limited = cas_numbers.slice(0, 50)
  const results: Record<string, string> = {}

  for (const cas of limited) {
    if (!cas || typeof cas !== 'string') continue
    try {
      const data = await enrichByQuery(cas.trim())
      results[cas] = data?.sds_url ?? `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cas)}`
    } catch {
      results[cas] = `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cas)}`
    }
  }

  return NextResponse.json({ results })
}
