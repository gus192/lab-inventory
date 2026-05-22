import { NextResponse } from 'next/server'
import { parseFileRaw } from '@/lib/parseFile'

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = await file.arrayBuffer()
  const result = parseFileRaw(buffer)

  return NextResponse.json(result)
}
