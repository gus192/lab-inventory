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

  // Support bulk insert (array) or single insert
  const rows = Array.isArray(body) ? body : [body]

  const { data, error } = await supabase.from('chemicals').insert(rows).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
