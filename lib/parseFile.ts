import * as XLSX from 'xlsx'
import type { ChemicalInsert } from '@/types/chemical'

// Maps common header names from uploaded files to our schema fields
const HEADER_MAP: Record<string, keyof ChemicalInsert> = {
  'name': 'name',
  'chemical': 'name',
  'chemical name': 'name',
  'compound': 'name',
  'compound name': 'name',
  'reagent': 'name',
  'cas': 'cas_number',
  'cas number': 'cas_number',
  'cas#': 'cas_number',
  'cas no': 'cas_number',
  'cas no.': 'cas_number',
  'location': 'location',
  'storage': 'location',
  'storage location': 'location',
  'cabinet': 'location',
  'hood': 'location',
  'quantity': 'quantity',
  'qty': 'quantity',
  'amount': 'quantity',
  'mass': 'quantity',
  'volume': 'quantity',
  'unit': 'unit',
  'units': 'unit',
  'supplier': 'supplier',
  'vendor': 'supplier',
  'manufacturer': 'supplier',
  'source': 'supplier',
  'catalog': 'catalog_number',
  'catalog#': 'catalog_number',
  'catalog number': 'catalog_number',
  'cat#': 'catalog_number',
  'cat no': 'catalog_number',
  'part number': 'catalog_number',
  'lot': 'lot_number',
  'lot#': 'lot_number',
  'lot number': 'lot_number',
  'batch': 'lot_number',
  'date received': 'date_received',
  'received': 'date_received',
  'date': 'date_received',
  'purchase date': 'date_received',
  'expiration': 'expiration_date',
  'expiration date': 'expiration_date',
  'expiry': 'expiration_date',
  'expiry date': 'expiration_date',
  'exp date': 'expiration_date',
  'exp': 'expiration_date',
  'sds': 'sds_url',
  'sds url': 'sds_url',
  'sds link': 'sds_url',
  'msds': 'sds_url',
  'purchase url': 'purchase_url',
  'purchase link': 'purchase_url',
  'url': 'purchase_url',
  'link': 'purchase_url',
  'notes': 'notes',
  'note': 'notes',
  'comments': 'notes',
  'comment': 'notes',
}

function normalizeHeader(h: string): keyof ChemicalInsert | null {
  const key = h.toLowerCase().trim()
  return HEADER_MAP[key] ?? null
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }
  const str = String(val).trim()
  if (!str) return null
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0]
  }
  return str
}

export function parseFileBuffer(
  buffer: ArrayBuffer,
  filename: string
): { rows: Partial<ChemicalInsert>[]; unmappedHeaders: string[] } {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: false })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as unknown[][]

  if (raw.length < 2) return { rows: [], unmappedHeaders: [] }

  const headerRow = (raw[0] as unknown[]).map(String)
  const mappings = headerRow.map(h => ({ original: h, field: normalizeHeader(h) }))
  const unmappedHeaders = mappings.filter(m => !m.field).map(m => m.original).filter(Boolean)

  const rows: Partial<ChemicalInsert>[] = []
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as unknown[]
    const entry: Partial<ChemicalInsert> = {}
    let hasData = false

    mappings.forEach(({ field }, colIdx) => {
      if (!field) return
      const val = row[colIdx]
      if (val === '' || val === null || val === undefined) return
      hasData = true

      if (field === 'quantity') {
        const n = parseFloat(String(val))
        if (!isNaN(n)) entry.quantity = n
      } else if (field === 'date_received' || field === 'expiration_date') {
        entry[field] = parseDate(val) ?? undefined
      } else {
        ;(entry as Record<string, unknown>)[field] = String(val).trim()
      }
    })

    if (hasData && entry.name) rows.push(entry)
  }

  return { rows, unmappedHeaders }
}
