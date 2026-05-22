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
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
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
      if (!res.ok) { showToast('Error saving'); return }
      showToast('Chemical updated')
    } else {
      const res = await fetch('/api/chemicals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) { showToast('Error adding'); return }
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
    if (!res.ok) { showToast('Import failed'); return }
    const inserted = await res.json()
    showToast(`Imported ${inserted.length} chemicals`)
    setModal(null)
    loadChemicals()
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/chemicals/${id}`, { method: 'DELETE' })
    if (!res.ok) { showToast('Delete failed'); return }
    showToast('Chemical deleted')
    setChemicals(prev => prev.filter(c => c.id !== id))
  }

  function handleEdit(c: Chemical) {
    setEditing(c)
    setModal('edit')
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/login')
  }

  function exportFile(format: 'csv' | 'xlsx') {
    window.location.href = `/api/export?format=${format}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a5f] text-white shadow-lg">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧪</span>
            <h1 className="text-xl font-bold tracking-tight">Lab Chemical Inventory</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setModal('add')} className="btn bg-teal-500 text-white hover:bg-teal-400">
              + Add Chemical
            </button>
            <button onClick={() => setModal('import')} className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20">
              Import CSV/Excel
            </button>
            <div className="relative group">
              <button className="btn bg-white/10 text-white hover:bg-white/20 border border-white/20">
                Export ▾
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-10 hidden group-hover:block min-w-[140px]">
                <button onClick={() => exportFile('csv')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Download CSV
                </button>
                <button onClick={() => exportFile('xlsx')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Download Excel
                </button>
              </div>
            </div>
            <button onClick={handleLogout} className="btn text-white/60 hover:text-white text-xs">
              Log out
            </button>
          </div>
        </div>
      </header>

      {/* Stats bar */}
      {!loading && chemicals.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-screen-xl mx-auto px-4 py-2 flex gap-6 text-sm text-gray-600 flex-wrap">
            <span><strong>{chemicals.length}</strong> chemicals</span>
            <span><strong>{[...new Set(chemicals.map(c => c.location).filter(Boolean))].length}</strong> locations</span>
            <span><strong>{[...new Set(chemicals.map(c => c.supplier).filter(Boolean))].length}</strong> suppliers</span>
            {chemicals.filter(c => c.expiration_date && new Date(c.expiration_date) < new Date()).length > 0 && (
              <span className="text-red-600 font-medium">
                ⚠ {chemicals.filter(c => c.expiration_date && new Date(c.expiration_date) < new Date()).length} expired
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-16 text-gray-400">Loading inventory…</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">{error}</div>
        )}
        {!loading && !error && (
          <ChemicalTable chemicals={chemicals} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </main>

      {/* Modals */}
      {(modal === 'add' || modal === 'edit') && (
        <AddEditModal
          chemical={modal === 'edit' ? editing : null}
          onClose={() => { setModal(null); setEditing(null) }}
          onSave={handleSave}
        />
      )}
      {modal === 'import' && (
        <ImportModal onClose={() => setModal(null)} onImport={handleImport} />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-gray-800 text-white px-4 py-2.5 rounded-lg shadow-lg text-sm z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
