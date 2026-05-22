import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get('format') ?? 'csv'

  const { data, error } = await supabase
    .from('chemicals')
    .select('*')
    .order('location', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []).map(c => ({
    Name: c.name,
    'CAS Number': c.cas_number ?? '',
    Location: c.location ?? '',
    Quantity: c.quantity ?? '',
    Unit: c.unit ?? '',
    Supplier: c.supplier ?? '',
    'Catalog #': c.catalog_number ?? '',
    'Lot #': c.lot_number ?? '',
    'Date Received': c.date_received ?? '',
    Expiration: c.expiration_date ?? '',
    'SDS URL': c.sds_url ?? '',
    'Purchase URL': c.purchase_url ?? '',
    Notes: c.notes ?? '',
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
