export interface Chemical {
  id: string
  name: string
  cas_number: string | null
  distributor: string | null
  container_size: string | null
  physical_state: string | null
  location: string | null
  carbon_count: number | null
  bottle_count: number | null
  storage_conditions: string | null
  hazards: string | null
  sds_url: string | null
  notes: string | null
  added_by: string | null
  added_at: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
}

export type ChemicalInsert = Omit<Chemical, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'added_at'>

export const CONTAINER_SIZES = [
  '1 mL', '5 mL', '10 mL', '25 mL', '50 mL', '100 mL', '250 mL', '500 mL', '1 L', '2 L', '4 L',
  '100 mg', '500 mg', '1 g', '5 g', '10 g', '25 g', '50 g', '100 g', '250 g', '500 g', '1 kg', '2.5 kg',
]

export const PHYSICAL_STATES = [
  'Liquid', 'Viscous liquid', 'Solid', 'Powder', 'Gel', 'Gas',
]

export const STORAGE_CONDITIONS = [
  'Room temperature',
  'Refrigerator (4°C)',
  'Freezer (−20°C)',
  'Under N₂',
  'Under Ar',
  'Dry, cool place',
  'Flammables cabinet',
  'Corrosives cabinet',
]

export const COMMON_DISTRIBUTORS = [
  'Sigma-Aldrich',
  'TCI America',
  'Fisher Scientific',
  'Alfa Aesar',
  'Acros Organics',
  'Strem Chemicals',
  'VWR',
  'Oakwood Chemical',
  'Combi-Blocks',
  'Santa Cruz Biotechnology',
  'MP Biomedicals',
  'Cayman Chemical',
]

export const HAZARD_OPTIONS = [
  'Flammable', 'Corrosive', 'Irritant', 'Toxic', 'Reactive',
  'Oxidizer', 'Moisture sensitive', 'Air sensitive', 'Environmental hazard',
]

export function normalizeDistributor(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Exact case-insensitive match → canonical spelling
  const exact = COMMON_DISTRIBUTORS.find(d => d.toLowerCase() === trimmed.toLowerCase())
  if (exact) return exact

  // Fuzzy: strip hyphens/spaces so "sigma aldrich" matches "Sigma-Aldrich"
  const fuzzy = trimmed.toLowerCase().replace(/[-\s]/g, '')
  const fuzzyMatch = COMMON_DISTRIBUTORS.find(d =>
    d.toLowerCase().replace(/[-\s]/g, '') === fuzzy
  )
  if (fuzzyMatch) return fuzzyMatch

  // Unknown distributor → Title Case each word
  return trimmed.replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

export const COLUMN_LABELS: Record<keyof ChemicalInsert, string> = {
  name: 'Chemical Name',
  cas_number: 'CAS #',
  distributor: 'Distributor',
  container_size: 'Container Size',
  physical_state: 'Physical State',
  location: 'Location',
  carbon_count: '# of Carbons',
  bottle_count: '# of Bottles',
  storage_conditions: 'Storage Conditions',
  hazards: 'Hazards',
  sds_url: 'SDS Link',
  notes: 'Notes',
  added_by: 'Added By',
}
