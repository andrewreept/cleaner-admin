import { getSupabaseBrowser } from '../lib/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'  

// helper to get client only when available in the browser
function sb(): SupabaseClient {
  const c = getSupabaseBrowser()
  if (!c) {
    // This can happen if called during SSR or before the client initialises
    throw new Error('Supabase client not initialised in browser')
  }
  return c
}

export type Job = {
  id: string
  user_id: string
  date: string
  client: string
  description: string | null
  amount: number
  paid: boolean
  method: string | null
  monthly_income_limit: number
  annual_income_limit: number
  warn_at_percent: number
  currency: string
}

export type Expense = {
  id: string
  user_id: string
  date: string
  merchant: string
  category: string
  total: number
  business_portion: number
  note: string | null
  receipt_url: string | null
}

export async function currentUserId() {
  const { data } = await sb().auth.getUser()
  if (!data.user) throw new Error('Not signed in')
  return data.user.id
}

/* -------- JOBS -------- */
export async function listJobs(): Promise<Job[]> {
  const { data, error } = await sb().from('jobs').select('*').order('date', { ascending: false })
  if (error) throw error
  return data as Job[]
}

export async function addJob(payload: Omit<Job, 'id' | 'user_id'>) {
  const user_id = await currentUserId()
  const { error } = await sb().from('jobs').insert({ user_id, ...payload })
  if (error) throw error
}

/* -------- EXPENSES -------- */
export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await sb().from('expenses').select('*').order('date', { ascending: false })
  if (error) throw error
  return data as Expense[]
}

export async function addExpense(payload: Omit<Expense, 'id' | 'user_id'>) {
  const user_id = await currentUserId()
  const { error } = await sb().from('expenses').insert({ user_id, ...payload })
  if (error) throw error
}

/* -------- RECEIPT UPLOAD -------- */
export async function uploadReceipt(file: File) {
  const user_id = await currentUserId()
  const path = `${user_id}/${Date.now()}-${file.name}`
  const { error } = await sb().storage.from('receipts').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = sb().storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}

/* -------- Helpers for dashboard -------- */
export function monthKey(d: string) {
  const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`
}
export function yearKey(d: string) {
  return `${new Date(d).getFullYear()}`
}
export function toCSV<T extends Record<string, any>>(rows: T[]) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(',')),
  ]
  return lines.join('\n')
}

/*--------DATA HELPERS:LOAD & SAVE SETTINGS-------*/
export async function getSettings(): Promise<Settings> {
  const uid = await currentUserId()

  // Try to read first
  const { data, error } = await sb()
    .from('settings')
    .select('*')
    .eq('user_id', uid)
    .single()

  // If found, return it
  if (!error && data) return data as Settings

  // If not found, create (but be safe if another call does it in parallel)
  const defaults: Settings = {
    user_id: uid,
    monthly_income_limit: 0,
    annual_income_limit: 0,
    warn_at_percent: 80,
    currency: 'GBP',
  }

  // UPSERT prevents "duplicate key" when row already exists
  const { data: upserted, error: upErr } = await sb()
    .from('settings')
    .upsert(defaults, { onConflict: 'user_id' })
    .select()
    .single()

  if (upErr) throw upErr
  return upserted as Settings
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const uid = await currentUserId()
  const payload = { user_id: uid, ...patch, updated_at: new Date().toISOString() }

  const { error } = await sb()
    .from('settings')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) throw error
}
