import { NextResponse } from 'next/server'
import { deletePrototypeShare, getPrototypeShare } from '@/lib/prototypes/store'

export const runtime = 'nodejs'

type Params = { params: Promise<{ token: string }> }

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const record = await getPrototypeShare(token)
  if (!record) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    token: record.token,
    name: record.name,
    html: record.html,
    updatedAt: record.updatedAt,
  })
}

export async function DELETE(_request: Request, { params }: Params) {
  const { token } = await params
  if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  await deletePrototypeShare(token)
  return NextResponse.json({ ok: true })
}
