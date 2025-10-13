import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient | null {
  // return null on the server; we'll init in the browser
  if (typeof window === 'undefined') return null
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return null
    client = createClient(url, key)
  }
  return client
}