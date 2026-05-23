import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('backups')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const chemicals = (data.data as any[]) ?? []
  const rows = chemicals.map(c => ({
    'Chemical Name': c.name,
    'CAS #': c.cas_number ?? '',
    'Distributor': c.distributor ?? '',
    'Container Size': c.container_size ?? '',
    'Physical State': c.physical_state ?? '',
    'Location': c.location ?? '',
    '# of Carbons': c.carbon_count ?? '',
    '# of Bottles': c.bottle_count ?? '',
    'Storage Conditions': c.storage_conditions ?? '',
    'Hazards': c.hazards ?? '',
    'SDS Link': c.sds_url ?? '',
    'Added By': c.added_by ?? '',
    'Date Added': c.added_at ?? '',
    'Notes': c.notes ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Chemicals')
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const date = new Date(data.created_at).toISOString().split('T')[0]
  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="backup_${date}.xlsx"`,
    },
  })
}
