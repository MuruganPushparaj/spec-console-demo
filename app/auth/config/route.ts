import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  return NextResponse.json({ supabase })
}
