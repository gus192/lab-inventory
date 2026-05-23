import type { ChemicalInsert } from '@/types/chemical'
import { normalizeDistributor } from '@/types/chemical'

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

      if (field === 'carbon_count' || field === 'bottle_count') {
        const n = parseInt(String(val), 10)
        if (!isNaN(n)) entry[field] = n
      } else if (field === 'distributor') {
        entry[field] = normalizeDistributor(String(val)) ?? undefined
      } else {
        ;(entry as Record<string, unknown>)[field] = String(val).trim()
      }
    })

    if (hasData && entry.name) rows.push(entry)
  }

  return rows
}
