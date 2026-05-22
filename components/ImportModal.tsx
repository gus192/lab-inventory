'use client'

import { useState, useRef } from 'react'
import type { ChemicalInsert } from '@/types/chemical'

interface Props {
  onClose: () => void
  onImport: (rows: Partial<ChemicalInsert>[]) => Promise<void>
}

export default function ImportModal({ onClose, onImport }: Props) {
  const [rows, setRows] = useState<Partial<ChemicalInsert>[] | null>(null)
  const [unmapped, setUnmapped] = useState<string[]>([])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError('')
    setRows(null)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      if (!res.ok) {
        setError('Failed to parse file')
        return
      }
      const data = await res.json()
      setRows(data.rows)
      setUnmapped(data.unmappedHeaders)
    } catch {
      setError('Network error')
    } finally {
      setParsing(false)
    }
  }

  async function handleImport() {
    if (!rows) return
    setImporting(true)
    await onImport(rows)
    setImporting(false)
  }

  const preview = rows?.slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">Import from CSV / Excel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-teal-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <div className="text-4xl mb-2">📂</div>
            <p className="font-medium text-gray-700">Click to select a CSV or Excel file</p>
            <p className="text-sm text-gray-400 mt-1">Columns are auto-matched — Name, CAS, Location, Quantity, Supplier, etc.</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          {parsing && <p className="text-center text-teal-600">Parsing file…</p>}
          {error && <p className="text-center text-red-600">{error}</p>}

          {rows !== null && (
            <>
              {unmapped.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <strong>Unrecognized columns (ignored):</strong>{' '}
                  {unmapped.join(', ')}
                </div>
              )}

              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
                Found <strong>{rows.length}</strong> chemical{rows.length !== 1 ? 's' : ''} ready to import.
              </div>

              {preview && preview.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Name', 'CAS', 'Location', 'Qty', 'Unit', 'Supplier', 'Catalog #'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 font-medium">{r.name ?? ''}</td>
                          <td className="px-3 py-1.5 text-gray-500">{r.cas_number ?? ''}</td>
                          <td className="px-3 py-1.5">{r.location ?? ''}</td>
                          <td className="px-3 py-1.5">{r.quantity ?? ''}</td>
                          <td className="px-3 py-1.5">{r.unit ?? ''}</td>
                          <td className="px-3 py-1.5">{r.supplier ?? ''}</td>
                          <td className="px-3 py-1.5">{r.catalog_number ?? ''}</td>
                        </tr>
                      ))}
                      {rows.length > 5 && (
                        <tr className="border-t">
                          <td colSpan={7} className="px-3 py-1.5 text-gray-400 italic">
                            …and {rows.length - 5} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={handleImport}
              disabled={!rows || rows.length === 0 || importing}
              className="btn-primary"
            >
              {importing ? 'Importing…' : `Import ${rows?.length ?? 0} Chemicals`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
