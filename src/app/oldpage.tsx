'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../src/lib/supabase'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

type Job = {
  id: string; user_id: string; date: string; client: string; description: string | null;
  amount: number; paid: boolean; method: string | null;
}

export default function Page() {
  const [session, setSession] = useState<any>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadJobs() {
    setLoading(true)
    const { data, error } = await supabase.from('jobs').select('*').order('date', { ascending: false })
    if (error) alert(error.message)
    else setJobs(data as Job[])
    setLoading(false)
  }

  async function insertTestJob() {
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      user_id: user!.id,
      date: new Date().toISOString().slice(0,10),
      client: 'Test Client',
      description: 'First test job',
      amount: 60.00,
      paid: true,
      method: 'cash'
    }
    const { error } = await supabase.from('jobs').insert(payload)
    if (error) alert(error.message)
    else {
      alert('Inserted a test job!')
      await loadJobs()
    }
  }

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ width: 360, maxWidth: '100%' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Sign in to Cleaner Admin</h1>
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={[]} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>You’re signed in 🎉</h1>
      <p style={{ marginBottom: 16 }}>Email: {session.user?.email}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={insertTestJob} style={btn}>Insert test job</button>
        <button onClick={loadJobs} style={btn}>{loading ? 'Loading…' : 'Refresh jobs'}</button>
        <button onClick={() => supabase.auth.signOut()} style={btn}>Sign out</button>
      </div>

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {jobs.map(j => (
          <li key={j.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div><b>{j.date}</b> — {j.client}</div>
            <div>Amount: £{Number(j.amount).toFixed(2)} — Paid: {j.paid ? 'Yes' : 'No'}</div>
          </li>
        ))}
        {jobs.length === 0 && <li>No jobs yet</li>}
      </ul>
    </div>
  )
}

const btn: React.CSSProperties = { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 8, background: '#fff', cursor: 'pointer' }