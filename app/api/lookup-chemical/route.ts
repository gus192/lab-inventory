import { NextResponse } from 'next/server'
import { enrichByQuery } from '@/lib/pubchem'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  if (!query) return NextResponse.json({ error: 'q required' }, { status: 400 })

  try {
    const data = await enrichByQuery(query)
    if (!data) return NextResponse.json({ error: 'Chemical not found' }, { status: 404 })

    return NextResponse.json({
      cid: data.cid,
      cas_number: data.cas_number,
      iupac_name: data.iupac_name,
      molecular_formula: data.molecular_formula,
      carbon_count: data.carbon_count,
      hazards: data.hazards || null,
      storage_conditions: data.storage_conditions,
      pubchem_url: data.pubchem_url,
      sds_url: data.sds_url,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Lookup failed: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
