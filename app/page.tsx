'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Chemical, ChemicalInsert } from '@/types/chemical'
import ChemicalTable from '@/components/ChemicalTable'
import AddEditModal from '@/components/AddEditModal'
import ImportModal from '@/components/ImportModal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Modal = 'add' | 'edit' | 'import' | null

const CONFETTI_COLORS = [
  '#f97316','#fb923c','#fdba74',
  '#1d4ed8','#2563eb','#3b82f6','#60a5fa',
  '#f97316','#2563eb','#fb923c',
]

interface ConfettiPiece {
  id: number; color: string; startX: number
  dx: number; dy: number; dr: number
  w: number; h: number; duration: number; delay: number; circle: boolean
}

export default function HomePage() {
  const router = useRouter()
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [editing, setEditing] = useState<Chemical | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [userName, setUserName] = useState('')
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([])
  const [filling, setFilling] = useState(false)

  useEffect(() => {
    setUserName(localStorage.getItem('lab_added_by') ?? '')
  }, [])

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadChemicals = useCallback(async () => {
    try {
      const res = await fetch('/api/chemicals')
      if (res.status === 401 || res.redirected) { router.push('/login'); return }
      if (!res.ok) throw new Error('Failed to load')
      setChemicals(await res.json())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadChemicals() }, [loadChemicals])

  async function handleSave(data: Partial<ChemicalInsert>) {
    if (editing) {
      const res = await fetch(`/api/chemicals/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { showToast('Failed to save', 'error'); return }
      showToast('Chemical updated')
    } else {
      const res = await fetch('/api/chemicals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { showToast('Failed to add', 'error'); return }
      showToast('Chemical added')
    }
    setModal(null)
    setEditing(null)
    loadChemicals()
  }

  async function handleImport(rows: Partial<ChemicalInsert>[]) {
    const res = await fetch('/api/chemicals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rows),
    })
    if (!res.ok) { showToast('Import failed', 'error'); return }
    const inserted = await res.json()
    showToast(`Imported ${inserted.length} chemicals`)
    const pieces: ConfettiPiece[] = Array.from({ length: 90 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      startX: Math.random() * 100,
      dx: (Math.random() - 0.5) * 350,
      dy: 450 + Math.random() * 400,
      dr: (Math.random() - 0.5) * 1080,
      w: 6 + Math.random() * 10,
      h: 3 + Math.random() * 8,
      duration: 1600 + Math.random() * 1400,
      delay: Math.random() * 800,
      circle: Math.random() > 0.6,
    }))
    setConfetti(pieces)
    setTimeout(() => setConfetti([]), 4500)
    setModal(null)
    loadChemicals()
  }

  async function handleDelete(c: Chemical) {
    if ((c.bottle_count ?? 0) > 1) {
      const res = await fetch(`/api/chemicals/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bottle_count: c.bottle_count! - 1 }),
      })
      if (!res.ok) { showToast('Failed to update', 'error'); return }
      showToast(`Bottle removed — ${c.bottle_count! - 1} remaining`)
      setChemicals(prev => prev.map(ch => ch.id === c.id ? { ...ch, bottle_count: c.bottle_count! - 1 } : ch))
    } else {
      const res = await fetch(`/api/chemicals/${c.id}`, { method: 'DELETE' })
      if (!res.ok) { showToast('Delete failed', 'error'); return }
      showToast('Moved to deleted')
      setChemicals(prev => prev.filter(ch => ch.id !== c.id))
    }
  }

  async function handleBulkDelete(ids: string[]) {
    const res = await fetch('/api/chemicals', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
    if (!res.ok) { showToast('Delete failed', 'error'); return }
    showToast(`Deleted ${ids.length} chemicals`)
    setChemicals(prev => prev.filter(c => !ids.includes(c.id)))
  }

  async function handleFillMissing() {
    setFilling(true)
    try {
      const res = await fetch('/api/fill-missing', { method: 'POST' })
      if (!res.ok) { showToast('Fill failed', 'error'); return }
      const { filled, total } = await res.json()
      if (total === 0) showToast('All chemicals already have SDS data')
      else showToast(`Filled data for ${filled} of ${total} chemicals`)
      if (filled > 0) loadChemicals()
    } catch {
      showToast('Network error', 'error')
    } finally {
      setFilling(false)
    }
  }

  function handleExportSelected(ids: string[]) {
    window.location.href = `/api/export?format=xlsx&ids=${ids.join(',')}`
  }

  function handleEdit(c: Chemical) { setEditing(c); setModal('edit') }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    localStorage.removeItem('lab_added_by')
    router.push('/login')
  }

  const totalBottles = chemicals.reduce((sum, c) => sum + (c.bottle_count ?? 0), 0)
  const locationCount = new Set(chemicals.map(c => c.location).filter(Boolean)).size
  const outOfStock = chemicals.filter(c => c.bottle_count === 0).length

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
            </svg>
            <span className="text-white font-semibold text-sm tracking-tight">Chemical Inventory</span>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setModal('add')}
              className="btn-primary text-xs py-1.5 px-3 gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Chemical
            </button>

            <button onClick={() => setModal('import')}
              className="btn text-xs py-1.5 px-3 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              Import
            </button>

            <div className="relative">
              <button
                onClick={() => setExportOpen(o => !o)}
                className="btn text-xs py-1.5 px-3 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full mt-1 card py-1 z-20 w-40" onClick={() => setExportOpen(false)}>
                  <button onClick={() => window.location.href = '/api/export?format=csv'}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Download CSV</button>
                  <button onClick={() => window.location.href = '/api/export?format=xlsx'}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Download Excel</button>
                </div>
              )}
            </div>

            <button
              onClick={handleFillMissing}
              disabled={filling}
              className="btn text-xs py-1.5 px-3 bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 disabled:opacity-50">
              {filling ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
              {filling ? 'Filling…' : 'Fill Missing'}
            </button>

            {userName && (
              <span className="text-xs text-slate-400 hidden sm:block">
                {userName}
              </span>
            )}

            <div className="w-px h-5 bg-slate-700 mx-1" />

            <Link href="/deleted"
              className="btn text-xs py-1.5 px-3 text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              Deleted
            </Link>

            <Link href="/backup"
              className="btn text-xs py-1.5 px-3 text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              Backups
            </Link>

            <div className="w-px h-5 bg-slate-700 mx-1" />

            <button onClick={handleLogout}
              className="btn text-xs py-1.5 px-3 text-slate-500 hover:text-slate-300 hover:bg-slate-800">
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      {!loading && chemicals.length > 0 && (
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-screen-2xl mx-auto px-6 py-2.5 flex items-center gap-6 text-sm">
            <span className="text-slate-500"><strong className="text-slate-800">{chemicals.length}</strong> chemicals</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500"><strong className="text-slate-800">{locationCount}</strong> locations</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500"><strong className="text-slate-800">{totalBottles}</strong> bottles total</span>
            {outOfStock > 0 && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-red-600 font-medium">{outOfStock} out of stock</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading inventory…
          </div>
        )}
        {error && (
          <div className="card p-4 border-red-200 bg-red-50 text-red-700 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <ChemicalTable
            chemicals={chemicals}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            onExportSelected={handleExportSelected}
          />
        )}
      </main>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <AddEditModal
          chemical={modal === 'edit' ? editing : null}
          onClose={() => { setModal(null); setEditing(null) }}
          onSave={handleSave}
          existingLocations={[...new Set(chemicals.map(c => c.location).filter(Boolean) as string[])].sort()}
          existingDistributors={[...new Set(chemicals.map(c => c.distributor).filter(Boolean) as string[])].sort()}
        />
      )}
      {modal === 'import' && (
        <ImportModal onClose={() => setModal(null)} onImport={handleImport} />
      )}

      {/* Toast */}
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

      {/* Click outside export dropdown */}
      {exportOpen && <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />}

      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-[60] overflow-hidden">
          {confetti.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.startX}%`,
                top: '-14px',
                width: p.w,
                height: p.circle ? p.w : p.h,
                background: p.color,
                borderRadius: p.circle ? '50%' : '2px',
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
                '--dr': `${p.dr}deg`,
                animation: `confettiFall ${p.duration}ms ${p.delay}ms ease-in forwards`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  )
}
