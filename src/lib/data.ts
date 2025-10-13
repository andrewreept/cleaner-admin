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