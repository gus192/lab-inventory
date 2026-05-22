import { NextResponse } from 'next/server'

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

async function findSigmaSDS(cas: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.sigmaaldrich.com/api/2.0/products/search?query=${encodeURIComponent(cas)}&brand=SIAL&page=1&pageSize=3`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0.0.0',
        },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const productNumber = data?.results?.[0]?.productNumber ?? data?.results?.[0]?.product_number
    if (productNumber) {
      return `https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/documents/${productNumber}_SDS_EN_US.pdf`
    }
  } catch { /* silent */ }
  return null
}

async function getSdsForCas(cas: string): Promise<string> {
  // 1. Try Sigma-Aldrich PDF
  const sigma = await findSigmaSDS(cas)
  if (sigma) return sigma

  // 2. Fall back to Fisher search URL (reliable, returns actual SDS docs)
  return `https://www.fishersci.com/us/en/catalog/search/sds?selectLang=EN&msdsKeyword=${encodeURIComponent(cas)}`
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
