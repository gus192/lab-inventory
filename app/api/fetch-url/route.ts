import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import type { ChemicalInsert } from '@/types/chemical'

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

function extractJsonLd(html: string): Record<string, unknown> | null {
  try {
    const $ = cheerio.load(html)
    let result: Record<string, unknown> | null = null
    $('script[type="application/ld+json"]').each((_, el) => {
      if (result) return
      try {
        const data = JSON.parse($(el).html() ?? '')
        if (data?.name) result = data
      } catch {
        // ignore
      }
    })
    return result
  } catch {
    return null
  }
}

function parseSigmaAldrich(html: string, url: string): Partial<ChemicalInsert> {
  const $ = cheerio.load(html)
  const ld = extractJsonLd(html)

  const name =
    (ld?.name as string) ||
    $('h1[data-testid="product-name"]').text().trim() ||
    $('h1.product-title').text().trim() ||
    $('h1').first().text().trim()

  const casMatch =
    html.match(/CAS Number[:\s]*([0-9-]+)/i) ||
    html.match(/"casNumber":"([0-9-]+)"/) ||
    html.match(/([0-9]{2,7}-[0-9]{2}-[0-9])\b/)

  const catalogMatch =
    html.match(/"productNumber":"([^"]+)"/) ||
    html.match(/Catalog Number[:\s]*([A-Z0-9-]+)/i) ||
    url.match(/\/([A-Z0-9]+)(?:\?|$)/)

  return {
    name: name || undefined,
    cas_number: casMatch?.[1] || undefined,
    catalog_number: catalogMatch?.[1] || undefined,
    supplier: url.includes('sigmaaldrich') ? 'Sigma-Aldrich' : 'MilliporeSigma',
    purchase_url: url,
  }
}

function parseFisher(html: string, url: string): Partial<ChemicalInsert> {
  const $ = cheerio.load(html)
  const ld = extractJsonLd(html)

  const name =
    (ld?.name as string) ||
    $('h1.product-title, h1[data-automation="product-title"]').text().trim() ||
    $('h1').first().text().trim()

  const casMatch = html.match(/CAS[:\s#]*([0-9]{2,7}-[0-9]{2}-[0-9])/i)
  const catalogMatch =
    html.match(/Catalog Number[:\s]*([A-Z0-9-]+)/i) ||
    url.match(/catalog\/([A-Z0-9]+)/)

  return {
    name: name || undefined,
    cas_number: casMatch?.[1] || undefined,
    catalog_number: catalogMatch?.[1] || undefined,
    supplier: url.includes('thermofisher') ? 'Thermo Fisher' : 'Fisher Scientific',
    purchase_url: url,
  }
}

function parseVWR(html: string, url: string): Partial<ChemicalInsert> {
  const ld = extractJsonLd(html)
  const $ = cheerio.load(html)

  const name =
    (ld?.name as string) ||
    $('h1.product-name, h1').first().text().trim()

  const casMatch = html.match(/CAS[:\s#]*([0-9]{2,7}-[0-9]{2}-[0-9])/i)
  const catalogMatch =
    html.match(/Cat\.?\s*No\.?\s*([A-Z0-9-]+)/i) ||
    url.match(/\/([A-Z0-9]+)(?:\?|$)/)

  return {
    name: name || undefined,
    cas_number: casMatch?.[1] || undefined,
    catalog_number: catalogMatch?.[1] || undefined,
    supplier: 'VWR',
    purchase_url: url,
  }
}

function parseGeneric(html: string, url: string): Partial<ChemicalInsert> {
  const $ = cheerio.load(html)
  const ld = extractJsonLd(html)

  const name =
    (ld?.name as string) ||
    $('h1').first().text().trim()

  const casMatch = html.match(/CAS[:\s#]*([0-9]{2,7}-[0-9]{2}-[0-9])/i)

  return {
    name: name || undefined,
    cas_number: casMatch?.[1] || undefined,
    purchase_url: url,
  }
}

export async function POST(req: Request) {
  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    const html = await fetchHtml(url)
    let result: Partial<ChemicalInsert>

    if (url.includes('sigmaaldrich') || url.includes('milliporesigma')) {
      result = parseSigmaAldrich(html, url)
    } else if (url.includes('fishersci') || url.includes('thermofisher')) {
      result = parseFisher(html, url)
    } else if (url.includes('vwr.com')) {
      result = parseVWR(html, url)
    } else {
      result = parseGeneric(html, url)
    }

    // Strip empty fields
    const clean = Object.fromEntries(
      Object.entries(result).filter(([, v]) => v !== undefined && v !== '')
    )

    return NextResponse.json(clean)
  } catch (err) {
    return NextResponse.json(
      { error: `Could not fetch URL: ${(err as Error).message}` },
      { status: 422 }
    )
  }
}
