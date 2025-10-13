'use client'

const supabase = supabaseBrowser()

import { useEffect, useState } from 'react'
mport { supabaseBrowser } from '../lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { addJob, addExpense, listJobs, listExpenses, uploadReceipt, type Job, type Expense } from '../lib/data'

export default function AppClient() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

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

  return <Home />
}

function Home() {
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
      {tab === 'jobs' ? <JobsTab /> : <ExpensesTab />}
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

/* --------------- Expenses --------------- */

function ExpensesTab() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    merchant: '',
    category: 'Supplies',
    total: '0.00',
    business_portion: '0.00',
    note: '',
    file: null as File | null
  })

  async function refresh() {
    try { setExpenses(await listExpenses()) } catch (e: any) { alert(e.message) }
  }
  useEffect(() => { refresh() }, [])

  async function save() {
    try {
      let receipt_url: string | null = null
      if (form.file) {
        receipt_url = await uploadReceipt(form.file)
      }
      await addExpense({
        date: form.date,
        merchant: form.merchant,
        category: form.category,
        total: Number(form.total),
        business_portion: Number(form.business_portion || form.total),
        note: form.note || null,
        receipt_url
      })
      setForm({ ...form, merchant: '', total: '0.00', business_portion: '0.00', note: '', file: null })
      await refresh()
    } catch (e: any) { alert(e.message) }
  }

  return (
    <div>
      <Panel title="Add expense">
        <Row><label>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Row>
        <Row><label>Merchant</label><input value={form.merchant} onChange={e => setForm({ ...form, merchant: e.target.value })} placeholder="Tesco" /></Row>
        <Row><label>Total (£)</label><input type="number" step="0.01" value={form.total} onChange={e => setForm({ ...form, total: e.target.value })} /></Row>
        <Row><label>Business portion (£)</label><input type="number" step="0.01" value={form.business_portion} onChange={e => setForm({ ...form, business_portion: e.target.value })} /></Row>
        <Row><label>Note</label><input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></Row>
        <Row><label>Receipt photo</label><input type="file" accept="image/*" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} /></Row>
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

/* --------------- Shared UI bits --------------- */

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

const btn: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer' }
const tabBtn = (active: boolean): React.CSSProperties => ({ ...btn, background: active ? '#eef5ff' : '#fff' })