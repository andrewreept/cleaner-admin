import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      console.error('Supabase env vars missing in this build', {
        urlPresent: !!url, keyPresent: !!key
      })
      return null
    }
    console.log('Creating Supabase client…', { url: url.slice(0, 30) + '…' })
    client = createClient(url, key)
  }
  return client
}