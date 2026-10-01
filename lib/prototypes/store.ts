import { promises as fs } from 'fs'
import path from 'path'

export type PrototypeShareRecord = {
  token: string
  name: string
  html: string
  projectId?: string
  updatedAt: number
}

const DIR = path.join(process.cwd(), 'data', 'prototypes')
const MAX_HTML_BYTES = 5 * 1024 * 1024

function fileFor(token: string) {
  const safe = token.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!safe || safe !== token) throw new Error('invalid_token')
  return path.join(DIR, `${safe}.json`)
}

async function ensureDir() {
  await fs.mkdir(DIR, { recursive: true })
}

export function assertHtmlSize(html: string) {
  const bytes = Buffer.byteLength(html || '', 'utf8')
  if (bytes > MAX_HTML_BYTES) {
    throw new Error('too_large')
  }
  return bytes
}

export async function savePrototypeShare(record: PrototypeShareRecord) {
  assertHtmlSize(record.html)
  await ensureDir()
  await fs.writeFile(fileFor(record.token), JSON.stringify(record), 'utf8')
  return record
}

export async function getPrototypeShare(token: string): Promise<PrototypeShareRecord | null> {
  try {
    const raw = await fs.readFile(fileFor(token), 'utf8')
    const parsed = JSON.parse(raw) as PrototypeShareRecord
    if (!parsed?.html || parsed.token !== token) return null
    return parsed
  } catch {
    return null
  }
}

export async function deletePrototypeShare(token: string) {
  try {
    await fs.unlink(fileFor(token))
    return true
  } catch {
    return false
  }
}
