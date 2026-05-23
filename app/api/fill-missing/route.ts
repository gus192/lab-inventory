import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { enrichByQuery } from '@/lib/pubchem'

export async function POST() {
  // Fetch any non-deleted chemical missing at least one enrichable field
  const { data: missing, error } = await supabase
    .from('chemicals')
    .select('id, name, cas_number, sds_url, hazards, storage_conditions, physical_state, carbon_count')
    .is('deleted_at', null)
    .or('sds_url.is.null,hazards.is.null,storage_conditions.is.null,physical_state.is.null,carbon_count.is.null')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!missing || missing.length === 0) return NextResponse.json({ filled: 0, total: 0 })

  let filled = 0
  for (const c of missing) {
    const query = (c.cas_number as string | null)?.trim() || (c.name as string)?.trim()
    if (!query) continue
    try {
      const data = await enrichByQuery(query)
      if (!data) continue
      const update: Record<string, unknown> = {}
      if (!c.sds_url && data.sds_url) update.sds_url = data.sds_url
      // "None" means we found the compound but it has no GHS hazards — store it so we don't retry
      if (!c.hazards && data.hazards) update.hazards = data.hazards
      if (!c.storage_conditions && data.storage_conditions) update.storage_conditions = data.storage_conditions
      if (!c.physical_state && data.physical_state) update.physical_state = data.physical_state
      if (c.carbon_count == null && data.carbon_count != null) update.carbon_count = data.carbon_count
      if (Object.keys(update).length > 0) {
        await supabase.from('chemicals').update(update).eq('id', c.id)
        filled++
      }
    } catch { /* continue */ }
    await new Promise(r => setTimeout(r, 220))
  }

  return NextResponse.json({ filled, total: missing.length })
}
