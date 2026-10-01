import { NextResponse } from 'next/server'
import { savePrototypeShare } from '@/lib/prototypes/store'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = String(body?.token || '').trim()
    const name = String(body?.name || 'Prototype').trim() || 'Prototype'
    const html = String(body?.html || '')
    const projectId = body?.projectId ? String(body.projectId) : undefined

    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(token)) {
      return NextResponse.json({ error: 'Invalid share token' }, { status: 400 })
    }
    if (!html.trim()) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 })
    }

    const record = await savePrototypeShare({
      token,
      name,
      html,
      projectId,
      updatedAt: Date.now(),
    })

    return NextResponse.json({
      ok: true,
      token: record.token,
      name: record.name,
      updatedAt: record.updatedAt,
      sharePath: `/share-prototype.html?t=${encodeURIComponent(record.token)}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'save_failed'
    if (message === 'too_large') {
      return NextResponse.json({ error: 'HTML file is too large (max 5MB)' }, { status: 413 })
    }
    if (message === 'invalid_token') {
      return NextResponse.json({ error: 'Invalid share token' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to publish prototype' }, { status: 500 })
  }
}
