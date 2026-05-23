import * as XLSX from 'xlsx'
import type { ChemicalInsert } from '@/types/chemical'

export function normalizeHeader(h: string): keyof ChemicalInsert | null {
  const key = h.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[#\.]/g, '')
  const map: Record<string, keyof ChemicalInsert> = {
    // name
    'chemical name': 'name', 'chemical': 'name', 'name': 'name',
    'compound': 'name', 'compound name': 'name', 'reagent': 'name', 'substance': 'name',
    // cas
    'cas': 'cas_number', 'cas ': 'cas_number', 'cas number': 'cas_number',
    'cas no': 'cas_number', 'cas registry': 'cas_number', 'casnumber': 'cas_number',
    // distributor
    'distributor': 'distributor', 'supplier': 'distributor', 'vendor': 'distributor',
    'manufacturer': 'distributor', 'source': 'distributor', 'company': 'distributor',
    // container size
    'container size': 'container_size', 'size': 'container_size',
    'amount': 'container_size', 'quantity': 'container_size', 'qty': 'container_size',
    'package size': 'container_size', 'pack size': 'container_size',
    // physical state
    'physical state': 'physical_state', 'state': 'physical_state',
    'form': 'physical_state', 'appearance': 'physical_state',
    // location
    'location': 'location', 'storage location': 'location',
    'stored in': 'location', 'cabinet': 'location', 'hood': 'location',
    'shelf': 'location', 'storage': 'location', 'where': 'location',
    // carbon count
    '# of carbons': 'carbon_count', 'carbons': 'carbon_count',
    'carbon count': 'carbon_count', 'number of carbons': 'carbon_count',
    'c chain': 'carbon_count',
    // bottle count
    '# of bottles': 'bottle_count', 'bottles': 'bottle_count',
    'bottle count': 'bottle_count', 'number of bottles': 'bottle_count',
    'stock': 'bottle_count', 'count': 'bottle_count', 'qty on hand': 'bottle_count',
    // storage conditions
    'storage conditions': 'storage_conditions', 'conditions': 'storage_conditions',
    'store at': 'storage_conditions', 'temperature': 'storage_conditions',
    // hazards
    'hazards': 'hazards', 'hazard': 'hazards', 'ghs': 'hazards',
    'safety': 'hazards', 'danger': 'hazards',
    // sds
    'sds link': 'sds_url', 'sds': 'sds_url', 'sds url': 'sds_url',
    'msds': 'sds_url', 'safety data sheet': 'sds_url',
    // added by
    'added by': 'added_by', 'added_by': 'added_by', 'entered by': 'added_by',
    'submitter': 'added_by', 'person': 'added_by',
    // notes
    'notes': 'notes', 'note': 'notes', 'comments': 'notes',
    'comment': 'notes', 'remarks': 'notes',
  }
  return map[key] ?? null
}

export function parseFileRaw(buffer: ArrayBuffer): {
  headers: string[]
  rawRows: (string | number | null)[][]
  suggestedMappings: Record<string, keyof ChemicalInsert | null>
} {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (string | number | null)[][]

  if (raw.length < 1) return { headers: [], rawRows: [], suggestedMappings: {} }

  const headers = (raw[0] ?? []).map(h => (h != null ? String(h) : ''))
  const rawRows = raw.slice(1).filter(row => row.some(c => c != null && c !== ''))
  const suggestedMappings: Record<string, keyof ChemicalInsert | null> = {}
  headers.forEach(h => { suggestedMappings[h] = normalizeHeader(h) })

  return { headers, rawRows, suggestedMappings }
}
