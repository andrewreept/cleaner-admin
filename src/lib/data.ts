import { supabase } from '../lib/supabase'

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
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Not signed in')
  return data.user.id
}

/* -------- JOBS -------- */
export async function listJobs(): Promise<Job[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data as Job[]
}

export async function addJob(payload: Omit<Job, 'id' | 'user_id'>) {
  const user_id = await currentUserId()
  const { error } = await supabase.from('jobs').insert({ user_id, ...payload })
  if (error) throw error
}

/* -------- EXPENSES -------- */
export async function listExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
  if (error) throw error
  return data as Expense[]
}

export async function addExpense(payload: Omit<Expense, 'id' | 'user_id'>) {
  const user_id = await currentUserId()
  const { error } = await supabase.from('expenses').insert({ user_id, ...payload })
  if (error) throw error
}

/* -------- RECEIPT UPLOAD -------- */
export async function uploadReceipt(file: File) {
  const user_id = await currentUserId()
  const path = `${user_id}/${Date.now()}-${file.name}`   // backticks matter
  const { error } = await supabase.storage.from('receipts').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('receipts').getPublicUrl(path)
  return data.publicUrl
}