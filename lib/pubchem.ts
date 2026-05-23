const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug'
const PUBCHEM_VIEW = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug_view'

export interface PubChemData {
  cid: number
  cas_number: string | null
  iupac_name: string | null
  molecular_formula: string | null
  carbon_count: number | null
  physical_state: string | null
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
  const m = formula.match(/^C(\d+)?(?![a-z])/)
  if (!m) return null
  return m[1] ? parseInt(m[1]) : 1
}

// Recursively search PubChem section tree for a heading
function findSection(sections: any[], heading: string): any | null {
  for (const section of sections) {
    if (section.TOCHeading === heading) return section
    if (Array.isArray(section.Section)) {
      const found = findSection(section.Section, heading)
      if (found) return found
    }
  }
  return null
}

// Collect all String values from a PubChem response object
function collectStrings(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return ''
  let text = ''
  const o = obj as Record<string, unknown>
  if (typeof o.String === 'string') text += ' ' + o.String
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object') text += collectStrings(val)
  }
  return text
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
    const topSections = (ghsData as any)?.Record?.Section ?? []
    // PubChem nests Pictogram(s) inside Chemical Safety > GHS Classification
    const pictogramSection = findSection(topSections, 'Pictogram(s)')
    if (!pictogramSection) return ''
    for (const info of pictogramSection.Information ?? []) {
      for (const swm of info.Value?.StringWithMarkup ?? []) {
        const text = (swm.String ?? '').toLowerCase()
        for (const [key, hazard] of PICTOGRAM_TO_HAZARD) {
          if (text.includes(key) && !hazards.includes(hazard)) {
            hazards.push(hazard)
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
    // Collect all text from the response (storage conditions section is nested)
    const text = collectStrings(storageData).toLowerCase()
    for (const [key, val] of STORAGE_MAP) {
      if (text.includes(key)) return val
    }
  } catch { /* silent */ }
  return null
}

const PHYSICAL_STATE_MAP: Array<[string, string]> = [
  ['viscous', 'Viscous liquid'],
  ['oily liquid', 'Viscous liquid'],
  ['liquid', 'Liquid'],
  ['powder', 'Powder'],
  ['crystalline solid', 'Solid'],
  ['white solid', 'Solid'],
  ['solid', 'Solid'],
  ['crystal', 'Solid'],
  ['gas', 'Gas'],
  ['gel', 'Gel'],
]

function parsePhysicalState(physData: unknown): string | null {
  try {
    const text = collectStrings(physData).toLowerCase()
    for (const [key, val] of PHYSICAL_STATE_MAP) {
      if (text.includes(key)) return val
    }
  } catch { /* silent */ }
  return null
}

export async function enrichByCid(cid: number): Promise<PubChemData | null> {
  try {
    const [propsData, synData, ghsData, storageData, physData] = await Promise.all([
      pget(`${PUBCHEM}/compound/cid/${cid}/property/IUPACName,MolecularFormula,MolecularWeight/JSON`),
      pget(`${PUBCHEM}/compound/cid/${cid}/synonyms/JSON`),
      pget(`${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=GHS+Classification`),
      pget(`${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=Storage+Conditions`),
      pget(`${PUBCHEM_VIEW}/data/compound/${cid}/JSON?heading=Physical+Description`),
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
      physical_state: parsePhysicalState(physData),
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
