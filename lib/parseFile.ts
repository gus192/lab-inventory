import * as XLSX from 'xlsx'
import type { ChemicalInsert } from '@/types/chemical'

const HEADER_MAP: Record<string, keyof ChemicalInsert> = {
  'name': 'name',
  'chemical': 'name',
  'chemical name': 'name',
  'compound': 'name',
  'compound name': 'name',
  'reagent': 'name',
  'reagent name': 'name',
  'substance': 'name',
  'substance name': 'name',
  'material': 'name',
  'cas': 'cas_number',
  'cas number': 'cas_number',
  'cas#': 'cas_number',
  'cas no': 'cas_number',
  'cas no.': 'cas_number',
  'casnumber': 'cas_number',
  'cas registry': 'cas_number',
  'cas registry number': 'cas_number',
  'location': 'location',
  'storage': 'location',
  'storage location': 'location',
  'cabinet': 'location',
  'hood': 'location',
  'shelf': 'location',
  'room': 'location',
  'stored in': 'location',
  'stored at': 'location',
  'where': 'location',
  'quantity': 'quantity',
  'qty': 'quantity',
  'amount': 'quantity',
  'mass': 'quantity',
  'volume': 'quantity',
  'weight': 'quantity',
  'size': 'quantity',
  'unit': 'unit',
  'units': 'unit',
  'supplier': 'supplier',
  'vendor': 'supplier',
  'manufacturer': 'supplier',
  'source': 'supplier',
  'company': 'supplier',
  'brand': 'supplier',
  'made by': 'supplier',
  'catalog': 'catalog_number',
  'catalog#': 'catalog_number',
  'catalog number': 'catalog_number',
  'catalogue number': 'catalog_number',
  'cat#': 'catalog_number',
  'cat no': 'catalog_number',
  'cat no.': 'catalog_number',
  'part number': 'catalog_number',
  'part#': 'catalog_number',
  'product number': 'catalog_number',
  'product#': 'catalog_number',
  'item number': 'catalog_number',
  'sku': 'catalog_number',
  'lot': 'lot_number',
  'lot#': 'lot_number',
  'lot number': 'lot_number',
  'batch': 'lot_number',
  'batch number': 'lot_number',
  'batch#': 'lot_number',
  'date received': 'date_received',
  'received': 'date_received',
  'date': 'date_received',
  'purchase date': 'date_received',
  'date purchased': 'date_received',
  'arrival date': 'date_received',
  'received date': 'date_received',
  'expiration': 'expiration_date',
  'expiration date': 'expiration_date',
  'expiry': 'expiration_date',
  'expiry date': 'expiration_date',
  'exp date': 'expiration_date',
  'exp': 'expiration_date',
  'expires': 'expiration_date',
  'best before': 'expiration_date',
  'use by': 'expiration_date',
  'sds': 'sds_url',
  'sds url': 'sds_url',
  'sds link': 'sds_url',
  'msds': 'sds_url',
  'msds url': 'sds_url',
  'safety data sheet': 'sds_url',
  'purchase url': 'purchase_url',
  'purchase link': 'purchase_url',
  'url': 'purchase_url',
  'link': 'purchase_url',
  'order url': 'purchase_url',
  'reorder link': 'purchase_url',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'comment': 'notes',
  'remarks': 'notes',
  'description': 'notes',
}

export function normalizeHeader(h: string): keyof ChemicalInsert | null {
  const key = h.toLowerCase().trim().replace(/\s+/g, ' ')
  return HEADER_MAP[key] ?? null
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }
  const str = String(val).trim()
  if (!str) return null
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return str
}

// Returns raw headers + rows so the UI can do manual mapping
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
