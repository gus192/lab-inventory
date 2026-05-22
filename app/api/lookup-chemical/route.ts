import { NextResponse } from 'next/server'

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'

async function pget(url: string) {
  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return null
  return res.json()
}

// Try to get a direct SDS PDF URL from Sigma-Aldrich by CAS number
async function findSigmaSDS(cas: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://www.sigmaaldrich.com/api/2.0/products/search?query=${encodeURIComponent(cas)}&brand=SIAL&page=1&pageSize=3`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
        },
        next: { revalidate: 3600 },
      }
    )
    if (!res.ok) return null
    const data = await res.json()
    const productNumber = data?.results?.[0]?.productNumber ?? data?.results?.[0]?.product_number
    if (productNumber) {
      return `https://www.sigmaaldrich.com/deepweb/assets/sigmaaldrich/product/documents/${productNumber}_SDS_EN_US.pdf`
    }
  } catch {
    // silent fail — fall through to alternatives
  }
  return null
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('q')?.trim()
  if (!query) return NextResponse.json({ error: 'q required' }, { status: 400 })

  try {
    // 1. Get CID from PubChem
    const cidData = await pget(
      `${PUBCHEM}/compound/name/${encodeURIComponent(query)}/cids/JSON`
    )
    if (!cidData) return NextResponse.json({ error: 'Chemical not found' }, { status: 404 })

    const cid: number = cidData.IdentifierList?.CID?.[0]
    if (!cid) return NextResponse.json({ error: 'Chemical not found' }, { status: 404 })

    // 2. Fetch properties, synonyms, description in parallel
    const [propsData, synData, descData] = await Promise.all([
      pget(`${PUBCHEM}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`),
      pget(`${PUBCHEM}/compound/cid/${cid}/synonyms/JSON`),
      pget(`${PUBCHEM}/compound/cid/${cid}/description/JSON`),
    ])

    const props = propsData?.PropertyTable?.Properties?.[0] ?? {}
    const synonyms: string[] = synData?.InformationList?.Information?.[0]?.Synonym ?? []
    const cas = synonyms.find((s: string) => /^\d{1,7}-\d{2}-\d$/.test(s)) ?? null

    const preferredName =
      descData?.InformationList?.Information?.find((i: { Title?: string }) => i.Title)?.Title ||
      synonyms[0] ||
      props.IUPACName ||
      query

    // 3. Try to find a direct SDS PDF (Sigma-Aldrich)
    const sigmaSDSPdf = cas ? await findSigmaSDS(cas) : null

    // 4. Build SDS candidates — best first
    const term = encodeURIComponent(cas ?? query)
    const sdsLinks: { label: string; url: string }[] = []

    if (sigmaSDSPdf) {
      sdsLinks.push({ label: 'Sigma-Aldrich SDS (PDF)', url: sigmaSDSPdf })
    }

    sdsLinks.push(
      {
        label: 'Fisher Scientific SDS',
        url: `https://www.fishersci.com/us/en/catalog/search/sds?selectLang=EN&msdsKeyword=${term}`,
      },
      {
        label: 'Sigma-Aldrich SDS Search',
        url: `https://www.sigmaaldrich.com/US/en/search#q=${term}&t=literature`,
      },
      {
        label: 'PubChem Safety Data',
        url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`,
      }
    )

    // Best URL: Sigma PDF if found, otherwise Fisher search (returns SDS docs)
    const sds_url = sigmaSDSPdf ?? sdsLinks[0].url

    return NextResponse.json({
      cid,
      name: preferredName,
      iupac_name: props.IUPACName ?? null,
      cas_number: cas,
      molecular_formula: props.MolecularFormula ?? null,
      molecular_weight: props.MolecularWeight ?? null,
      pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      sds_links: sdsLinks,
      sds_url,
    })
  } catch (err) {
    return NextResponse.json(
      { error: `Lookup failed: ${(err as Error).message}` },
      { status: 500 }
    )
  }
}
