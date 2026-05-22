import { NextResponse } from 'next/server'

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

async function getSdsForCas(cas: string): Promise<string> {
  try {
    const res = await fetch(`${PUBCHEM}/compound/name/${encodeURIComponent(cas)}/cids/JSON`)
    if (res.ok) {
      const data = await res.json()
      const cid = data?.IdentifierList?.CID?.[0]
      if (cid) return `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`
    }
  } catch { /* silent */ }
  return `https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(cas)}`
}

// POST body: { cas_numbers: string[] }
// Returns: { results: Record<cas, sds_url> }
export async function POST(req: Request) {
  const { cas_numbers } = await req.json()

  if (!Array.isArray(cas_numbers) || cas_numbers.length === 0) {
    return NextResponse.json({ error: 'cas_numbers array required' }, { status: 400 })
  }

  // Cap at 50 to avoid long-running requests
  const limited = cas_numbers.slice(0, 50)
  const results: Record<string, string> = {}

  // Process with small delay between requests to respect rate limits
  for (const cas of limited) {
    if (!cas || typeof cas !== 'string') continue
    try {
      results[cas] = await getSdsForCas(cas.trim())
      // Small delay to be polite to external APIs
      await new Promise(r => setTimeout(r, 150))
    } catch {
      results[cas] = `https://www.fishersci.com/us/en/catalog/search/sds?selectLang=EN&msdsKeyword=${encodeURIComponent(cas)}`
    }
  }

  return NextResponse.json({ results })
}
