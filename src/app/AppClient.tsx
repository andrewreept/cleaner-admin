'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseBrowser } from '../lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import {
  addJob,
  addExpense,
  listJobs,
  listExpenses,
  uploadReceipt,
  type Job,
  type Expense,
  monthKey,
  yearKey,
  toCSV,
} from '../lib/data'

/* ---------------- Root Client Component ---------------- */

export default function AppClient() {
  // show a clear message on live if env vars are missing
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return (
      <Center>
        <div style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Missing environment variables</h2>
          <div>
            Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in
            Vercel → Project → Settings → Environment Variables, then redeploy.
          </div>
        </div>
      </Center>
    )
  }

  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [session, setSession] = useState<any>(null)

  // init Supabase in the browser only
  useEffect(() => {
    const sb = getSupabaseBrowser()
    if (!sb) return
    setSupabase(sb)
    sb.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub?.subscription?.unsubscribe()
  }, [])

  if (!supabase) return <Center><div>Starting…</div></Center>

  if (!session) {
    return (
      <Center>
        <div style={{ width: 380, maxWidth: '100%' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Sign in to Cleaner Admin</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </Center>
    )
  }

  return <Home supabase={supabase} />
}

/* ---------------- Home Shell ---------------- */

function Home({ supabase }: { supabase: SupabaseClient }) {
  const [tab, setTab] = useState<'jobs' | 'expenses'>('jobs')

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Cleaner Admin</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab('jobs')} style={tabBtn(tab === 'jobs')}>Jobs</button>
        <button onClick={() => setTab('expenses')} style={tabBtn(tab === 'expenses')}>Expenses</button>
        <div style={{ flex: 1 }} />
        <button onClick={() => supabase.auth.signOut()} style={btn}>Sign out</button>
      </div>

      <Dashboard />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={async () => {
            const [jobs, expenses] = await Promise.all([listJobs(), listExpenses()])
            const jobsCsv = toCSV(jobs)
            const expCsv  = toCSV(expenses)
            download(`jobs-${new Date().toISOString().slice(0,10)}.csv`, jobsCsv)
            download(`expenses-${new Date().toISOString().slice(0,10)}.csv`, expCsv)
          }}
          style={btn}
        >
          Export CSV
        </button>
      </div>

      {tab === 'jobs' ? <JobsTab /> : <ExpensesTab />}
    </div>
  )
}

/* ---------------- Dashboard (totals) ---------------- */

function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  useEffect(() => { listJobs().then(setJobs).catch(e=>alert(e.message)) }, [])

  const today = new Date().toISOString().slice(0,10)
  const mkey = monthKey(today)
  const ykey = yearKey(today)

  const monthIncome = jobs.filter(j => monthKey(j.date) === mkey).reduce((a,b)=>a+Number(b.amount),0)
  const yearIncome  = jobs.filter(j => yearKey(j.date) === ykey).reduce((a,b)=>a+Number(b.amount),0)

  const MONTH_LIMIT = 1000   // tweak later or add Settings
  const YEAR_LIMIT  = 12000

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>At a glance</div>
      <div>Income this month: <b>£{monthIncome.toFixed(2)}</b>{MONTH_LIMIT ? ` / £${MONTH_LIMIT}` : ''}</div>
      <div>Income this year:  <b>£{yearIncome.toFixed(2)}</b>{YEAR_LIMIT ? ` / £${YEAR_LIMIT}` : ''}</div>
      {(MONTH_LIMIT && monthIncome >= MONTH_LIMIT*0.8) && (
        <div style={{ color: '#b45309', marginTop: 6 }}>Heads up: you’re over 80% of your monthly threshold.</div>
      )}
      {(YEAR_LIMIT && yearIncome >= YEAR_LIMIT*0.8) && (
        <div style={{ color: '#b45309', marginTop: 4 }}>Heads up: you’re over 80% of your annual threshold.</div>
      )}
    </div>
  )
}

/* ---------------- Jobs ---------------- */

function JobsTab() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    client: '',
    description: '',
    amount: '0.00',
    paid: true,
    method: 'cash'
  })

  async function refresh() {
    try { setJobs(await listJobs()) } catch (e: any) { alert(e.message) }
  }
  useEffect(() => { refresh() }, [])

  async function save() {
    try {
      await addJob({
        date: form.date,
        client: form.client,
        description: form.description || null,
        amount: Number(form.amount),
        paid: form.paid,
        method: form.method
      })
      setForm({ ...form, client: '', description: '', amount: '0.00' })
      await refresh()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div>
      <Panel title="Add job">
        <Row><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Row>
        <Row><label>Client</label><input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} placeholder="Sarah J" /></Row>
        <Row><label>Amount (£)</label><input type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></Row>
        <Row><label>Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Row>
        <Row><label>Paid</label><input type="checkbox" checked={form.paid} onChange={e => setForm({ ...form, paid: e.target.checked })} /></Row>
        <Row>
          <label>Method</label>
          <select value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
            <option value="card">Card</option>
            <option value="other">Other</option>
          </select>
        </Row>
        <button onClick={save} style={btn}>Save job</button>
        <button onClick={refresh} style={{ ...btn, marginLeft: 8 }}>Refresh list</button>
      </Panel>

      <Panel title="Jobs list">
        {jobs.length === 0 && <div>No jobs yet</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {jobs.map(j => (
            <li key={j.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <b>{j.date}</b> — {j.client} — £{Number(j.amount).toFixed(2)} — Paid: {j.paid ? 'Yes' : 'No'}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

/* ---------------- Expenses (with OCR + business tick) ---------------- */

type ExpenseLine = { id: string; label: string; total: number; business: boolean }

function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [items, setItems] = useState<ExpenseLine[]>([])
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    merchant: '',
    category: 'Supplies',
    total: '0.00',
    business_portion: '0.00',
    note: '',
    file: null as File | null,
    previewUrl: '' as string
  })
  const [processing, setProcessing] = useState(false)

  function recomputeBusinessPortion(lines: ExpenseLine[]) {
    const sum = lines.filter(l=>l.business).reduce((a,b)=>a + (Number(b.total)||0), 0)
    setForm(f => ({ ...f, business_portion: String(sum.toFixed(2)) }))
  }

  function addManualItem() {
    const next = [...items, { id: crypto.randomUUID(), label: 'Item', total: 0, business: true }]
    setItems(next)
    recomputeBusinessPortion(next)
  }

  function updateItem(id: string, patch: Partial<ExpenseLine>) {
    const next = items.map(i => i.id === id ? { ...i, ...patch, total: patch.total !== undefined ? Number(patch.total) : i.total } : i)
    setItems(next)
    recomputeBusinessPortion(next)
  }

  async function handleFile(file: File) {
    setProcessing(true)
    try {
      // preview
      const purl = URL.createObjectURL(file)
      setForm(f => ({ ...f, file, previewUrl: purl }))

      // load tesseract only when user picks a file
      const Tesseract = (await import('tesseract.js')).default
      const { data } = await Tesseract.recognize(file, 'eng', { logger: () => {} })

      const lines = (data.text || '')
        .split(/\n+/)
        .map(s => s.trim())
        .filter(Boolean)

      // simple heuristic: "label  12.34" at end of line
      const parsed: ExpenseLine[] = []
      for (const line of lines) {
        const m = line.match(/(.+?)\s+(\d+[.,]\d{2})$/)
        if (m) {
          const label = m[1].replace(/[^a-zA-Z0-9 .,\-]/g, '').slice(0, 60)
          const price = Number(m[2].replace(',', ''))
          if (!Number.isNaN(price) && price < 1000) {
            parsed.push({ id: crypto.randomUUID(), label, total: price, business: false })
          }
        }
      }
      setItems(parsed)
      const totalGuess = parsed.reduce((a,b)=>a + (b.total||0), 0)
      setForm(f => ({ ...f, total: String(totalGuess.toFixed(2)), business_portion: '0.00' }))
    } catch (e) {
      console.error(e)
      alert('Could not read that receipt. You can still add items manually.')
    } finally {
      setProcessing(false)
    }
  }

  async function refresh() {
    try { setExpenses(await listExpenses()) } catch (e: any) { alert(e.message) }
  }
  useEffect(() => { refresh() }, [])

  async function save() {
    try {
      // upload receipt (optional)
      let receipt_url: string | null = null
      if (form.file) {
        receipt_url = await uploadReceipt(form.file)
      }
      const business_portion = Number(form.business_portion || 0) || items.filter(i=>i.business).reduce((a,b)=>a+b.total,0)
      const total = Number(form.total || 0) || items.reduce((a,b)=>a+b.total,0)

      await addExpense({
        date: form.date,
        merchant: form.merchant,
        category: form.category,
        total,
        business_portion,
        note: form.note || null,
        receipt_url
      })

      // reset UI
      setItems([])
      setForm({
        date: new Date().toISOString().slice(0, 10),
        merchant: '',
        category: 'Supplies',
        total: '0.00',
        business_portion: '0.00',
        note: '',
        file: null,
        previewUrl: ''
      })
      await refresh()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div>
      <Panel title="Add expense (with receipt OCR)">
        <Row>
          <label>Date</label>
          <input type="date" value={form.date} onChange={e=>setForm({ ...form, date: e.target.value })} />
        </Row>
        <Row>
          <label>Merchant</label>
          <input value={form.merchant} onChange={e=>setForm({ ...form, merchant: e.target.value })} placeholder="Tesco" />
        </Row>
        <Row>
          <label>Category</label>
          <input value={form.category} onChange={e=>setForm({ ...form, category: e.target.value })} placeholder="Supplies" />
        </Row>
        <Row>
          <label>Receipt</label>
          <input type="file" accept="image/*" onChange={e => e.target.files && handleFile(e.target.files[0])} />
        </Row>
        {processing && <div style={{ color:'#555', margin:'6px 0' }}>Reading receipt… you can also add items manually below.</div>}
        {form.previewUrl && <img src={form.previewUrl} alt="receipt" style={{ width: 200, height: 200, objectFit:'cover', border:'1px solid #ddd', borderRadius:6, margin:'6px 0' }} />}

        <div style={{ fontWeight: 600, margin: '10px 0 6px' }}>Items (tick what is for business)</div>
        <div style={{ display:'grid', gap:6, marginBottom:8 }}>
          {items.length === 0 && <div style={{ color:'#777' }}>No items yet — add manually or upload a receipt.</div>}
          {items.map(it => (
            <div key={it.id} style={{ display:'grid', gridTemplateColumns:'1fr 120px 90px', alignItems:'center', gap:8 }}>
              <input value={it.label} onChange={e=>updateItem(it.id, { label: e.target.value })} />
              <input type="number" step="0.01" value={it.total} onChange={e=>updateItem(it.id, { total: Number(e.target.value) })} />
              <label style={{ display:'flex', alignItems:'center', gap:6 }}>
                <input type="checkbox" checked={it.business} onChange={e=>updateItem(it.id, { business: e.target.checked })} /> Business
              </label>
            </div>
          ))}
        </div>
        <button onClick={addManualItem} style={{ ...btn, marginBottom: 12 }}>+ Add item</button>

        <Row>
          <label>Receipt total (£)</label>
          <input type="number" step="0.01" value={form.total} onChange={e=>setForm({ ...form, total: e.target.value })} />
        </Row>
        <Row>
          <label>Business portion (£)</label>
          <input type="number" step="0.01" value={form.business_portion} onChange={e=>setForm({ ...form, business_portion: e.target.value })} />
        </Row>
        <Row>
          <label>Note</label>
          <input value={form.note} onChange={e=>setForm({ ...form, note: e.target.value })} />
        </Row>

        <button onClick={save} style={btn}>Save expense</button>
        <button onClick={refresh} style={{ ...btn, marginLeft: 8 }}>Refresh list</button>
      </Panel>

      <Panel title="Expenses list">
        {expenses.length === 0 && <div>No expenses yet</div>}
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {expenses.map(e => (
            <li key={e.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 8, display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <b>{e.date}</b> — {e.merchant} — £{Number(e.total).toFixed(2)} (business £{Number(e.business_portion).toFixed(2)})
                {e.note && <div style={{ color: '#555' }}>{e.note}</div>}
              </div>
              {e.receipt_url && <img src={e.receipt_url} alt="receipt" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

/* ---------------- Shared UI bits ---------------- */

function Center({ children }: any) {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>{children}</div>
}
function Panel({ title, children }: any) {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}
function Row({ children }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      {children}
    </div>
  )
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

const btn: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer' }
const tabBtn = (active: boolean): React.CSSProperties => ({ ...btn, background: active ? '#eef5ff' : '#fff' })