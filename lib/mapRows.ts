import type { ChemicalInsert } from '@/types/chemical'
import { normalizeDistributor, normalizePhysicalState, containerSizesForState, CONTAINER_SIZES } from '@/types/chemical'

// Normalize free-text container sizes to canonical values.
// Handles "100ml" → "100 mL", "1L" → "1 L", "500mg" → "500 mg", etc.
function normalizeContainerSize(raw: string): string | null {
  if (!raw) return null
  const exact = CONTAINER_SIZES.find(s => s.toLowerCase() === raw.toLowerCase())
  if (exact) return exact
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*(ml|l|mg|g|kg)$/i)
  if (m) {
    const num = m[1]
    const unit = m[2].toLowerCase()
    const canonical = unit === 'ml' ? 'mL' : unit === 'l' ? 'L' : unit === 'mg' ? 'mg' : unit === 'g' ? 'g' : 'kg'
    const built = `${num} ${canonical}`
    return CONTAINER_SIZES.find(s => s === built) ?? built
  }
  return raw || null
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

      if (field === 'carbon_count' || field === 'bottle_count') {
        const n = parseInt(String(val), 10)
        if (!isNaN(n)) entry[field] = n
      } else if (field === 'distributor') {
        entry[field] = normalizeDistributor(String(val)) ?? undefined
      } else if (field === 'physical_state') {
        entry[field] = normalizePhysicalState(String(val)) ?? undefined
      } else if (field === 'container_size') {
        const raw = String(val).trim()
        // Normalize common variants (e.g. "100ml" → "100 mL", "1l" → "1 L")
        const normalized = normalizeContainerSize(raw)
        if (normalized) entry[field] = normalized
      } else {
        ;(entry as Record<string, unknown>)[field] = String(val).trim()
      }
    })

    if (hasData && entry.name) {
      // Drop container size if it doesn't match the physical state unit type
      if (entry.container_size && entry.physical_state) {
        const valid = containerSizesForState(entry.physical_state)
        if (!valid.includes(entry.container_size)) delete entry.container_size
      }
      rows.push(entry)
    }
  }

  return rows
}
