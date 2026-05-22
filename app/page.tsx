'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Chemical, ChemicalInsert } from '@/types/chemical'
import ChemicalTable from '@/components/ChemicalTable'
import AddEditModal from '@/components/AddEditModal'
import ImportModal from '@/components/ImportModal'
import { useRouter } from 'next/navigation'

type Modal = 'add' | 'edit' | 'import' | null

export default function HomePage() {
  const router = useRouter()
  const [chemicals, setChemicals] = useState<Chemical[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<Modal>(null)
  const [editing, setEditing] = useState<Chemical | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)

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
    setModal(null)
    loadChemicals()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/chemicals/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Delete failed', 'error'); return }
    showToast('Deleted')
    setChemicals(prev => prev.filter(c => c.id !== id))
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

  function handleExportSelected(ids: string[]) {
    window.location.href = `/api/export?format=xlsx&ids=${ids.join(',')}`
  }

  function handleEdit(c: Chemical) { setEditing(c); setModal('edit') }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
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
    </div>
  )
}
