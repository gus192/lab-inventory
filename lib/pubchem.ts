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
  if (!formula) return null        // unknown — no formula
  const m = formula.match(/^C(\d+)?(?![a-z])/)
  if (!m) return 0                 // formula exists but no C = 0 carbons
  return m[1] ? parseInt(m[1]) : 1
}

// Recursively collect every "String" value from a PubChem JSON response
function collectStrings(obj: unknown): string {
  if (!obj || typeof obj !== 'object') return ''
  const o = obj as Record<string, unknown>
  let text = typeof o.String === 'string' ? ' ' + o.String : ''
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object') text += collectStrings(val)
  }
  return text
}

// Map keywords found anywhere in the GHS section to our hazard labels.
// More specific entries must come before shorter overlapping ones.
const HAZARD_KEYWORDS: Array<[string, string]> = [
  ['flame over circle', 'Oxidizer'],
  ['oxidizing', 'Oxidizer'],
  ['oxidising', 'Oxidizer'],
  ['flammable', 'Flammable'],   // H225/H226 statements AND "Flame" pictogram description
  ['flame', 'Flammable'],       // fallback: pictogram named "Flame"
  ['exploding bomb', 'Reactive'],
  ['explosive', 'Reactive'],
  ['self-react', 'Reactive'],
  ['corrosion', 'Corrosive'],
  ['corrosive', 'Corrosive'],
  ['skull', 'Toxic'],
  ['acute tox', 'Toxic'],
  ['fatal', 'Toxic'],
  ['exclamation mark', 'Irritant'],
  ['irritant', 'Irritant'],
  ['irritat', 'Irritant'],
  ['harmful', 'Irritant'],
  ['environment', 'Environmental hazard'],
  ['aquatic', 'Environmental hazard'],
]

function parseGHSHazards(ghsData: unknown): string {
  if (!ghsData) return ''
  const hazards: string[] = []
  try {
    const text = collectStrings(ghsData).toLowerCase()
    for (const [key, hazard] of HAZARD_KEYWORDS) {
      if (text.includes(key) && !hazards.includes(hazard)) {
        hazards.push(hazard)
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
  if (!storageData) return null
  try {
    const text = collectStrings(storageData).toLowerCase()
    for (const [key, val] of STORAGE_MAP) {
      if (text.includes(key)) return val
    }
  } catch { /* silent */ }
  return null
}

// Order matters: more specific entries before broader overlapping ones
const PHYSICAL_STATE_MAP: Array<[string, string]> = [
  ['viscous', 'Viscous liquid'],
  ['syrupy', 'Viscous liquid'],
  ['syrup', 'Viscous liquid'],
  ['oily', 'Viscous liquid'],
  ['resinous', 'Viscous liquid'],
  ['powder', 'Powder'],       // before "crystalline" and "solid"
  ['granular', 'Powder'],
  ['granule', 'Powder'],
  ['flour', 'Powder'],
  ['dust', 'Powder'],
  ['gel', 'Gel'],
  ['paste', 'Gel'],
  ['jelly', 'Gel'],
  ['gas', 'Gas'],
  ['vapor', 'Gas'],
  ['vapour', 'Gas'],
  ['gaseous', 'Gas'],
  ['liquid', 'Liquid'],       // after viscous/gel checks
  ['solution', 'Liquid'],
  ['crystalline', 'Solid'],   // after powder check
  ['crystal', 'Solid'],
  ['solid', 'Solid'],
  ['waxy', 'Solid'],
  ['wax', 'Solid'],
  ['pellet', 'Solid'],
  ['flake', 'Solid'],
  ['needle', 'Solid'],
  ['prism', 'Solid'],
  ['glassy', 'Solid'],
]

function parsePhysicalState(physData: unknown): string | null {
  if (!physData) return null
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
