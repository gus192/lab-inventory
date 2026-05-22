// URL scraping kept for compatibility but chemical lookup via PubChem is preferred
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { url } = await req.json()
  if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const casMatch = html.match(/CAS[:\s#]*([0-9]{2,7}-[0-9]{2}-[0-9])/i)
    const nameMatch = html.match(/<h1[^>]*>([^<]{5,100})<\/h1>/)

    return NextResponse.json({
      name: nameMatch?.[1]?.trim() ?? null,
      cas_number: casMatch?.[1] ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 422 })
  }
}
