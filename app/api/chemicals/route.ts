import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('chemicals')
    .select('*')
    .order('location', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

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

// Bulk delete: DELETE /api/chemicals  body: { ids: string[] }
export async function DELETE(req: Request) {
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0)
    return NextResponse.json({ error: 'ids required' }, { status: 400 })

  const { error } = await supabase.from('chemicals').delete().in('id', ids)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: ids.length })
}
