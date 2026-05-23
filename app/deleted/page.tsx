'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Chemical } from '@/types/chemical'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DeletedPage() {
  const router = useRouter()
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    const res = await fetch('/api/chemicals?deleted=true')
    if (res.status === 401 || res.redirected) { router.push('/login'); return }
    if (res.ok) setChemicals(await res.json())
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  async function restore(id: string) {
    const res = await fetch(`/api/chemicals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _restore: true }),
    })
    if (!res.ok) { showToast('Restore failed', 'error'); return }
    showToast('Chemical restored to inventory')
    setChemicals(prev => prev.filter(c => c.id !== id))
  }

  async function permanentDelete(id: string) {
    const res = await fetch(`/api/chemicals/${id}?permanent=true`, { method: 'DELETE' })
    if (!res.ok) { showToast('Delete failed', 'error'); return }
    showToast('Permanently deleted')
    setChemicals(prev => prev.filter(c => c.id !== id))
    setConfirmId(null)
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
          <span className="text-slate-400 text-sm">Deleted Chemicals</span>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Deleted Chemicals</h1>
            <p className="text-sm text-slate-500 mt-0.5">Restore chemicals to inventory or permanently remove them.</p>
          </div>
          <Link href="/" className="btn-secondary text-sm">← Back to inventory</Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading…
          </div>
        )}

        {!loading && chemicals.length === 0 && (
          <div className="card p-12 text-center text-slate-400 text-sm">
            No deleted chemicals.
          </div>
        )}

        {!loading && chemicals.length > 0 && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Chemical Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">CAS #</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Added By</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Deleted</th>
                    <th className="px-4 py-3 w-40" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chemicals.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.cas_number ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{c.location ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{c.added_by ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {c.deleted_at ? new Date(c.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {confirmId === c.id ? (
                          <span className="flex items-center gap-2 justify-end text-xs">
                            <span className="text-red-500">Delete permanently?</span>
                            <button onClick={() => permanentDelete(c.id)} className="text-red-500 hover:text-red-700 font-medium">Yes</button>
                            <button onClick={() => setConfirmId(null)} className="text-slate-400 hover:text-slate-600">Cancel</button>
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => restore(c.id)}
                              className="btn-secondary text-xs py-1 px-3"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => setConfirmId(c.id)}
                              className="text-xs py-1 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                            >
                              Delete
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
