import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('backups')
    .select('id, created_at, created_by, chemical_count')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const created_by = body.created_by ?? null

  const { data: chemicals, error: fetchErr } = await supabase
    .from('chemicals')
    .select('*')
    .is('deleted_at', null)
    .order('location', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const { data, error } = await supabase
    .from('backups')
    .insert({
      created_by,
      chemical_count: chemicals?.length ?? 0,
      data: chemicals,
    })
    .select('id, created_at, created_by, chemical_count')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: Request) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await supabase.from('backups').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
