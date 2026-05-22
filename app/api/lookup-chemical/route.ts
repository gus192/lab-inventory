import { NextResponse } from 'next/server'

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

async function pget(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  return res.json()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  if (!query) return NextResponse.json({ error: 'q required' }, { status: 400 })

  try {
    // 1. Get CID(s) for the query
    const cidData = await pget(
      `${PUBCHEM}/compound/name/${encodeURIComponent(query)}/cids/JSON`
    )
    if (!cidData) return NextResponse.json({ error: 'Chemical not found' }, { status: 404 })

    const cid: number = cidData.IdentifierList?.CID?.[0]
    if (!cid) return NextResponse.json({ error: 'Chemical not found' }, { status: 404 })

    // 2. Get properties + synonyms in parallel
    const [propsData, synData, descData] = await Promise.all([
      pget(`${PUBCHEM}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`),
      pget(`${PUBCHEM}/compound/cid/${cid}/synonyms/JSON`),
      pget(`${PUBCHEM}/compound/cid/${cid}/description/JSON`),
    ])

    const props = propsData?.PropertyTable?.Properties?.[0] ?? {}
    const synonyms: string[] = synData?.InformationList?.Information?.[0]?.Synonym ?? []

    // Extract CAS number (format: digits-digits-digit)
    const cas = synonyms.find((s: string) => /^\d{1,7}-\d{2}-\d$/.test(s)) ?? null

    // Preferred name: first description title or first synonym
    const preferredName =
      descData?.InformationList?.Information?.find((i: { Title?: string }) => i.Title)?.Title ||
      synonyms[0] ||
      props.IUPACName ||
      query

    // Build SDS candidates
    const sdsLinks: { label: string; url: string }[] = [
      {
        label: 'PubChem Safety & Hazards',
        url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`,
      },
    ]
    if (cas) {
      sdsLinks.push(
        {
          label: 'Sigma-Aldrich SDS',
          url: `https://www.sigmaaldrich.com/US/en/search#q=${encodeURIComponent(cas)}&t=literature`,
        },
        {
          label: 'Fisher Scientific SDS',
          url: `https://www.fishersci.com/us/en/catalog/search/sds?selectLang=EN&msdsKeyword=${encodeURIComponent(cas)}`,
        }
      )
    } else {
      sdsLinks.push(
        {
          label: 'Sigma-Aldrich SDS',
          url: `https://www.sigmaaldrich.com/US/en/search#q=${encodeURIComponent(query)}&t=literature`,
        },
        {
          label: 'Fisher Scientific SDS',
          url: `https://www.fishersci.com/us/en/catalog/search/sds?selectLang=EN&msdsKeyword=${encodeURIComponent(query)}`,
        }
      )
    }

    return NextResponse.json({
      cid,
      name: preferredName,
      iupac_name: props.IUPACName ?? null,
      cas_number: cas,
      molecular_formula: props.MolecularFormula ?? null,
      molecular_weight: props.MolecularWeight ?? null,
      pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      sds_links: sdsLinks,
      // Best SDS URL to auto-fill (PubChem always works)
      sds_url: sdsLinks[0].url,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Lookup failed: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
