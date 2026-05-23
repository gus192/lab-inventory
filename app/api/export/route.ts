import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'csv'
  const ids = searchParams.get('ids')?.split(',').filter(Boolean)

  let query = supabase
    .from('chemicals')
    .select('*')
    .is('deleted_at', null)
    .order('location', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (ids && ids.length > 0) query = query.in('id', ids)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map(c => ({
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
    'Notes': c.notes ?? '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Chemicals')

  if (format === 'xlsx') {
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new Response(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="chemical_inventory.xlsx"',
      },
    })
  }

  const csv = XLSX.utils.sheet_to_csv(ws)
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="chemical_inventory.csv"',
    },
  })
}
