'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Backup {
  id: string
  created_at: string
  created_by: string | null
  chemical_count: number
}

export default function BackupPage() {
  const router = useRouter()
  const [backups, setBackups] = useState<Backup[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createdBy, setCreatedBy] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/backup')
    if (res.status === 401 || res.redirected) { router.push('/login'); return }
    if (res.ok) setBackups(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function createBackup() {
    setCreating(true)
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ created_by: createdBy.trim() || null }),
    })
    if (!res.ok) { showToast('Backup failed', 'error'); setCreating(false); return }
    const b = await res.json()
    setBackups(prev => [b, ...prev])
    showToast(`Backup created — ${b.chemical_count} chemicals saved`)
    setCreating(false)
  }

  async function deleteBackup(id: string) {
    const res = await fetch('/api/backup', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { showToast('Delete failed', 'error'); return }
    setBackups(prev => prev.filter(b => b.id !== id))
    setConfirmId(null)
    showToast('Backup deleted')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            <span className="text-white font-semibold text-sm tracking-tight group-hover:text-slate-300 transition-colors">Chemical Inventory</span>
          </Link>
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-400 text-sm">Backups</span>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Cloud Backups</h1>
            <p className="text-sm text-slate-500 mt-0.5">Snapshots of your inventory stored in the database. Download any backup as Excel.</p>
          </div>
          <Link href="/" className="btn-secondary text-sm">← Back to inventory</Link>
        </div>

        {/* Create backup */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Create New Backup</h2>
          <div className="flex items-center gap-3">
            <input
              className="input py-1.5 text-sm w-56"
              placeholder="Your name (optional)"
              value={createdBy}
              onChange={e => setCreatedBy(e.target.value)}
            />
            <button
              onClick={createBackup}
              disabled={creating}
              className="btn-primary flex items-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  Back Up Now
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Saves a full snapshot of all current chemicals to the database.</p>
        </div>

        {/* Backup list */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading backups…
          </div>
        )}

        {!loading && backups.length === 0 && (
          <div className="card p-10 text-center text-slate-400 text-sm">
            No backups yet. Create your first backup above.
          </div>
        )}

        {!loading && backups.length > 0 && (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Created By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Chemicals</th>
                  <th className="px-4 py-3 w-40" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(b.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{b.created_by ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-teal-50 text-teal-700 border border-teal-100">{b.chemical_count} chemicals</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {confirmId === b.id ? (
                        <span className="flex items-center gap-2 justify-end text-xs">
                          <span className="text-red-500">Delete backup?</span>
                          <button onClick={() => deleteBackup(b.id)} className="text-red-500 hover:text-red-700 font-medium">Yes</button>
                          <button onClick={() => setConfirmId(null)} className="text-slate-400 hover:text-slate-600">Cancel</button>
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 justify-end">
                          <a
                            href={`/api/backup/${b.id}`}
                            className="btn-secondary text-xs py-1 px-3 flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Download
                          </a>
                          <button
                            onClick={() => setConfirmId(b.id)}
                            className="text-xs py-1 px-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-5 right-5 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium z-50 ${
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}
