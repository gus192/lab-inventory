import type { ChemicalInsert } from '@/types/chemical'

function parseDate(val: string | number | null): string | null {
  if (!val) return null
  const str = String(val).trim()
  if (!str) return null
  const d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return str
}

export function applyMappings(
  headers: string[],
  rawRows: (string | number | null)[][],
  mappings: Record<string, keyof ChemicalInsert | null>
): Partial<ChemicalInsert>[] {
  const rows: Partial<ChemicalInsert>[] = []

  for (const row of rawRows) {
    const entry: Partial<ChemicalInsert> = {}
    let hasData = false

    headers.forEach((header, i) => {
      const field = mappings[header]
      if (!field) return
      const val = row[i]
      if (val === null || val === undefined || val === '') return
      hasData = true

      if (field === 'quantity') {
        const n = parseFloat(String(val))
        if (!isNaN(n)) entry.quantity = n
      } else if (field === 'date_received' || field === 'expiration_date') {
        const d = parseDate(val)
        if (d) entry[field] = d
      } else {
        ;(entry as Record<string, unknown>)[field] = String(val).trim()
      }
    })

    if (hasData && entry.name) rows.push(entry)
  }

  return rows
}
