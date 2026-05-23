import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()

  if (body._restore) {
    const { data, error } = await supabase
      .from('chemicals')
      .update({ deleted_at: null })
      .eq('id', params.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { _restore: _, ...update } = body
  const { data, error } = await supabase
    .from('chemicals')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url)
  const permanent = url.searchParams.get('permanent') === 'true'

  if (permanent) {
    const { error } = await supabase.from('chemicals').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('chemicals')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
