import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function supabaseBrowser(): SupabaseClient {
  // Don’t create a client on the server/build – only in the browser.
  if (typeof window === 'undefined') {
    throw new Error('supabaseBrowser() must be called in the browser')
  }
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
    client = createClient(url, key)
  }
  return client
}