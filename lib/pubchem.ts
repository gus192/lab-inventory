const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PUBCHEM_VIEW = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view'

export interface PubChemData {
  cid: number
  cas_number: string | null
  iupac_name: string | null
  molecular_formula: string | null
  carbon_count: number | null
  sds_url: string
  pubchem_url: string
  hazards: string
  storage_conditions: string | null
}

async function pget(url: string) {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function parseCarbons(formula: string | null | undefined): number | null {
  if (!formula) return null
  // Match C at start of Hill-notation formula, not followed by lowercase (e.g. not Ca, Cl, Co)
  const m = formula.match(/^C(\d+)?(?![a-z])/)
  if (!m) return null
  return m[1] ? parseInt(m[1]) : 1
}

const PICTOGRAM_TO_HAZARD: Array<[string, string]> = [
  ['flame over circle', 'Oxidizer'],
  ['oxidizing', 'Oxidizer'],
  ['flame', 'Flammable'],
  ['corrosion', 'Corrosive'],
  ['skull', 'Toxic'],
  ['exclamation', 'Irritant'],
  ['environment', 'Environmental hazard'],
  ['exploding', 'Reactive'],
  ['explosive', 'Reactive'],
]

function parseGHSHazards(ghsData: unknown): string {
  const hazards: string[] = []
  try {
    const sections = (ghsData as any)?.Record?.Section ?? []
    for (const section of sections) {
      if (section.TOCHeading !== 'GHS Classification') continue
      for (const sub of section.Section ?? []) {
        if (sub.TOCHeading !== 'Pictogram(s)') continue
        for (const info of sub.Information ?? []) {
          for (const swm of info.Value?.StringWithMarkup ?? []) {
            const text = (swm.String ?? '').toLowerCase()
            for (const [key, hazard] of PICTOGRAM_TO_HAZARD) {
              if (text.includes(key) && !hazards.includes(hazard)) {
                hazards.push(hazard)
              }
            }
          }
        }
      }
    }
  } catch { /* silent */ }
  return hazards.join(', ')
}

const STORAGE_MAP: Array<[string, string]> = [
  ['freez', 'Freezer (−20°C)'],
  ['-20', 'Freezer (−20°C)'],
  ['−20', 'Freezer (−20°C)'],
  ['refrigerat', 'Refrigerator (4°C)'],
  ['4 °c', 'Refrigerator (4°C)'],
  ['4°c', 'Refrigerator (4°C)'],
  ['cold room', 'Refrigerator (4°C)'],
  ['nitrogen', 'Under N₂'],
  ['inert gas', 'Under N₂'],
  ['argon', 'Under Ar'],
  ['flammab', 'Flammables cabinet'],
  ['corros', 'Corrosives cabinet'],
  ['desicat', 'Dry, cool place'],
  ['dry, cool', 'Dry, cool place'],
  ['cool, dry', 'Dry, cool place'],
  ['dry and cool', 'Dry, cool place'],
  ['cool place', 'Dry, cool place'],
  ['room temp', 'Room temperature'],
  ['ambient temp', 'Room temperature'],
]

function parseStorageConditions(storageData: unknown): string | null {
  try {
    let text = ''
    const sections = (storageData as any)?.Record?.Section ?? []
    for (const section of sections) {
      for (const info of section.Information ?? []) {
        for (const swm of info.Value?.StringWithMarkup ?? []) {
          text += ' ' + (swm.String ?? '')
        }
      }
    }
    const lower = text.toLowerCase()
    for (const [key, val] of STORAGE_MAP) {
      if (lower.includes(key)) return val
    }
  } catch { /* silent */ }
  return null
}

export async function enrichByCid(cid: number): Promise<PubChemData | null> {
  try {
    const [propsData, synData, ghsData, storageData] = await Promise.all([
      pget(`${PUBCHEM}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`),
      pget(`${PUBCHEM}/compound/cid/${cid}/synonyms/JSON`),
      pget(`${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=GHS+Classification`),
      pget(`${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=Storage+Conditions`),
    ])

    const props = propsData?.PropertyTable?.Properties?.[0] ?? {}
    const synonyms: string[] = synData?.InformationList?.Information?.[0]?.Synonym ?? []
    const cas = synonyms.find((s: string) => /^\d{1,7}-\d{2}-\d$/.test(s)) ?? null
    const formula = props.MolecularFormula ?? null

    return {
      cid,
      cas_number: cas,
      iupac_name: props.IUPACName ?? null,
      molecular_formula: formula,
      carbon_count: parseCarbons(formula),
      sds_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}#section=Safety-and-Hazards`,
      pubchem_url: `https://pubchem.ncbi.nlm.nih.gov/compound/${cid}`,
      hazards: parseGHSHazards(ghsData),
      storage_conditions: parseStorageConditions(storageData),
    }
  } catch {
    return null
  }
}

export async function enrichByQuery(query: string): Promise<PubChemData | null> {
  const cidData = await pget(`${PUBCHEM}/compound/name/${encodeURIComponent(query)}/cids/JSON`)
  const cid: number = cidData?.IdentifierList?.CID?.[0]
  if (!cid) return null
  return enrichByCid(cid)
}
