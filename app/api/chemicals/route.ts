import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const deleted = searchParams.get('deleted') === 'true'

  let query = supabase
    .from('chemicals')
    .select('*')
    .order('location', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  query = deleted
    ? query.not('deleted_at', 'is', null)
    : query.is('deleted_at', null)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const rows = Array.isArray(body) ? body : [body]
  const { data, error } = await supabase.from('chemicals').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// Bulk soft-delete: DELETE /api/chemicals  body: { ids: string[] }
export async function DELETE(req: Request) {
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const { error } = await supabase
    .from('chemicals')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: ids.length })
}
