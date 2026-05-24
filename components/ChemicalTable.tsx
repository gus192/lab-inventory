'use client'

import { useState, useMemo } from 'react'
import type { Chemical } from '@/types/chemical'
import HazardPictograms from '@/components/HazardPictogram'

interface Props {
  chemicals: Chemical[]
  onEdit: (c: Chemical) => void
  onDelete: (c: Chemical) => void
  onBulkDelete: (ids: string[]) => void
  onExportSelected: (ids: string[]) => void
}

type SortKey = keyof Chemical
type SortDir = 'asc' | 'desc'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ChemicalTable({ chemicals, onEdit, onDelete, onBulkDelete, onExportSelected }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('location')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('All')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false)

  const locations = useMemo(() => {
    const locs = [...new Set(chemicals.map(c => c.location).filter(Boolean))] as string[]
    return ['All', ...locs.sort()]
  }, [chemicals])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return chemicals
      .filter(c => {
        if (locationFilter !== 'All' && c.location !== locationFilter) return false
        if (!q) return true
        return (
          c.name.toLowerCase().includes(q) ||
          (c.cas_number ?? '').toLowerCase().includes(q) ||
          (c.distributor ?? '').toLowerCase().includes(q) ||
          (c.location ?? '').toLowerCase().includes(q) ||
          (c.hazards ?? '').toLowerCase().includes(q) ||
          (c.physical_state ?? '').toLowerCase().includes(q) ||
          (c.added_by ?? '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? ''
        const bv = b[sortKey] ?? ''
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [chemicals, search, locationFilter, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(c => selected.has(c.id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allFilteredSelected) {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.delete(c.id)); return n })
    } else {
      setSelected(prev => { const n = new Set(prev); filtered.forEach(c => n.add(c.id)); return n })
    }
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function clearSelection() { setSelected(new Set()) }

  function handleBulkDelete() {
    onBulkDelete([...selected])
    setSelected(new Set())
    setConfirmBulkDelete(false)
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="opacity-0 group-hover:opacity-40 ml-1 text-xs">↕</span>
    return <span className="text-teal-600 ml-1 text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const Th = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-3 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer group hover:text-slate-800 select-none whitespace-nowrap ${className}`}
      onClick={() => toggleSort(col)}
    >
      {label}<SortIcon col={col} />
    </th>
  )

  const selectedCount = selected.size

  return (
    <div className="space-y-3">
      {/* Search + location filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-9 w-56"
            placeholder="Search chemicals…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setLocationFilter(loc)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                locationFilter === loc
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} of {chemicals.length} chemicals
        </span>
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 text-white rounded-xl text-sm">
          <span className="font-medium">{selectedCount} selected</span>
          <div className="h-4 w-px bg-slate-600" />
          <button
            onClick={() => onExportSelected([...selected])}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export selected
          </button>
          <div className="h-4 w-px bg-slate-600" />
          {confirmBulkDelete ? (
            <span className="flex items-center gap-2">
              <span className="text-red-300">Delete {selectedCount} chemicals?</span>
              <button onClick={handleBulkDelete} className="text-red-300 hover:text-red-200 font-medium">Yes, delete</button>
              <button onClick={() => setConfirmBulkDelete(false)} className="text-slate-400 hover:text-white">Cancel</button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1.5 text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete selected
            </button>
          )}
          <button onClick={clearSelection} className="ml-auto text-slate-400 hover:text-white">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 accent-teal-600 cursor-pointer"
                  />
                </th>
                <Th col="name" label="Chemical Name" className="min-w-[200px]" />
                <Th col="cas_number" label="CAS #" />
                <Th col="container_size" label="Container Size" />
                <Th col="location" label="Location" />
                <Th col="bottle_count" label="# of Bottles" />
                <Th col="storage_conditions" label="Storage Conditions" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">Hazards</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">SDS</th>
                <th className="px-3 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">
                    {chemicals.length === 0
                      ? 'No chemicals yet — add one or import a spreadsheet.'
                      : 'No results match your search.'}
                  </td>
                </tr>
              )}
              {filtered.map(c => (
                <tr key={c.id}
                  className={`group hover:bg-slate-50/60 transition-colors ${selected.has(c.id) ? 'bg-teal-50/40' : ''}`}
                >
                  <td className="pl-4 pr-2 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 accent-teal-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-800 leading-snug">{c.name}</div>
                    {c.notes && <div className="text-xs text-slate-400 truncate max-w-[200px]">{c.notes}</div>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                    {c.cas_number ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {c.container_size ? (
                      <span className="badge bg-slate-100 text-slate-700 border border-slate-200">{c.container_size}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.location ? (
                      <span className="badge bg-indigo-50 text-indigo-700 border border-indigo-100">{c.location}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {c.bottle_count != null ? (
                      <span className={`badge border ${c.bottle_count === 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                        {c.bottle_count}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    {c.storage_conditions ?? '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.hazards ? <HazardPictograms hazards={c.hazards} /> : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {c.sds_url ? (
                      <a href={c.sds_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-800 font-medium hover:underline">
                        SDS
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 justify-end transition-opacity">
                      <button onClick={() => onEdit(c)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(c)}
                        title={c.bottle_count != null && c.bottle_count > 1 ? `Remove 1 bottle (${c.bottle_count - 1} remaining)` : 'Move to deleted'}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
