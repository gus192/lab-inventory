'use client'

import { useState, useMemo } from 'react'
import type { Chemical } from '@/types/chemical'

interface Props {
  chemicals: Chemical[]
  onEdit: (c: Chemical) => void
  onDelete: (id: string) => void
}

type SortKey = keyof Chemical
type SortDir = 'asc' | 'desc'

function isExpired(date: string | null): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false
  const d = new Date(date)
  const soon = new Date()
  soon.setDate(soon.getDate() + 90)
  return d >= new Date() && d <= soon
}

export default function ChemicalTable({ chemicals, onEdit, onDelete }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('location')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  const [locationFilter, setLocationFilter] = useState('All')
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

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
          (c.supplier ?? '').toLowerCase().includes(q) ||
          (c.catalog_number ?? '').toLowerCase().includes(q) ||
          (c.location ?? '').toLowerCase().includes(q) ||
          (c.notes ?? '').toLowerCase().includes(q)
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
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-teal-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const Th = ({ col, label }: { col: SortKey; label: string }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer whitespace-nowrap hover:text-teal-700 select-none"
      onClick={() => toggleSort(col)}
    >
      {label}<SortIcon col={col} />
    </th>
  )

  return (
    <div className="space-y-3">
      {/* Search + location filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs"
          placeholder="Search chemicals…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-1 flex-wrap">
          {locations.map(loc => (
            <button
              key={loc}
              onClick={() => setLocationFilter(loc)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                locationFilter === loc
                  ? 'bg-teal-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
        <span className="text-sm text-gray-400 ml-auto">{filtered.length} chemical{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded-xl border shadow-sm">
        <table className="w-full text-sm bg-white">
          <thead className="bg-gray-50 border-b">
            <tr>
              <Th col="name" label="Name" />
              <Th col="cas_number" label="CAS #" />
              <Th col="location" label="Location" />
              <Th col="quantity" label="Qty" />
              <Th col="supplier" label="Supplier" />
              <Th col="catalog_number" label="Catalog #" />
              <Th col="expiration_date" label="Expiration" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Links</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  {chemicals.length === 0 ? 'No chemicals yet — add one or import a file.' : 'No results for this filter.'}
                </td>
              </tr>
            )}
            {filtered.map(c => {
              const expired = isExpired(c.expiration_date)
              const expiring = isExpiringSoon(c.expiration_date)
              return (
                <tr key={c.id} className="border-t hover:bg-gray-50 group">
                  <td className="px-3 py-2.5 font-medium max-w-xs">
                    <div className="truncate" title={c.name}>{c.name}</div>
                    {c.notes && <div className="text-xs text-gray-400 truncate">{c.notes}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 font-mono text-xs">{c.cas_number ?? '—'}</td>
                  <td className="px-3 py-2.5">
                    {c.location ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {c.location}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {c.quantity != null ? `${c.quantity} ${c.unit ?? ''}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{c.supplier ?? '—'}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs font-mono">{c.catalog_number ?? '—'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {c.expiration_date ? (
                      <span className={`font-medium ${expired ? 'text-red-600' : expiring ? 'text-amber-600' : 'text-gray-600'}`}>
                        {expired ? '⚠ ' : expiring ? '⏳ ' : ''}{c.expiration_date}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-2">
                      {c.sds_url && (
                        <a href={c.sds_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline">SDS</a>
                      )}
                      {c.purchase_url && (
                        <a href={c.purchase_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-teal-600 hover:underline">Buy</a>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {confirmDelete === c.id ? (
                      <span className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-red-600">Delete?</span>
                        <button onClick={() => onDelete(c.id)} className="text-xs text-red-600 font-medium hover:underline">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">No</button>
                      </span>
                    ) : (
                      <span className="opacity-0 group-hover:opacity-100 flex gap-2 justify-end transition-opacity">
                        <button onClick={() => onEdit(c)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">Edit</button>
                        <button onClick={() => setConfirmDelete(c.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Del</button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
