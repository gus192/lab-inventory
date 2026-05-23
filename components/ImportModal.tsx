'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChemicalInsert } from '@/types/chemical'
import { COLUMN_LABELS } from '@/types/chemical'
import { applyMappings } from '@/lib/mapRows'

interface Props {
  onClose: () => void
  onImport: (rows: Partial<ChemicalInsert>[]) => Promise<void>
}

type Step = 'upload' | 'map' | 'preview'
type EnrichStatus = 'idle' | 'loading' | 'done'

const FIELD_OPTIONS: Array<{ value: keyof ChemicalInsert | ''; label: string }> = [
  { value: '', label: '— Skip —' },
  ...Object.entries(COLUMN_LABELS).map(([value, label]) => ({
    value: value as keyof ChemicalInsert,
    label,
  })),
]

export default function ImportModal({ onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<(string | number | null)[][]>([])
  const [mappings, setMappings] = useState<Record<string, keyof ChemicalInsert | null>>({})
  const [previewRows, setPreviewRows] = useState<Partial<ChemicalInsert>[]>([])
  const [addedBy, setAddedBy] = useState('')

  useEffect(() => {
    setAddedBy(localStorage.getItem('lab_added_by') ?? '')
  }, [])
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [enrichStatus, setEnrichStatus] = useState<EnrichStatus>('idle')
  const [enrichCount, setEnrichCount] = useState(0)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setError('')

    const fd = new FormData()
    fd.append('file', file)

    try {
      const res = await fetch('/api/import', { method: 'POST', body: fd })
      if (!res.ok) { setError('Failed to parse file'); return }
      const data = await res.json()

      if (!data.headers?.length) { setError('No columns found in file'); return }

      setHeaders(data.headers)
      setRawRows(data.rawRows)
      setMappings(data.suggestedMappings)
      setStep('map')
    } catch {
      setError('Network error')
    } finally {
      setParsing(false)
    }
  }

  function setMapping(header: string, field: keyof ChemicalInsert | null) {
    setMappings(prev => ({ ...prev, [header]: field }))
  }

  function buildPreview() {
    const rows = applyMappings(headers, rawRows, mappings)
    setPreviewRows(rows)
    setEnrichStatus('idle')
    setEnrichCount(0)
    setStep('preview')
  }

  async function autoEnrich() {
    const toEnrich = previewRows.filter(r =>
      (r.cas_number || r.name) &&
      (!r.sds_url || !r.hazards || !r.storage_conditions || r.carbon_count == null)
    )
    if (toEnrich.length === 0) return

    setEnrichStatus('loading')
    try {
      const res = await fetch('/api/enrich-chemicals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chemicals: toEnrich.map(r => ({ cas_number: r.cas_number, name: r.name })),
        }),
      })
      if (!res.ok) { setEnrichStatus('idle'); return }

      const { enriched } = await res.json() as { enriched: Array<{
        sds_url?: string
        hazards?: string
        storage_conditions?: string | null
        carbon_count?: number | null
      } | null> }

      let filled = 0
      let enrichIdx = 0

      setPreviewRows(rows => rows.map(r => {
        const needsEnrich = (r.cas_number || r.name) &&
          (!r.sds_url || !r.hazards || !r.storage_conditions || r.carbon_count == null)
        if (!needsEnrich) return r

        const data = enriched[enrichIdx++]
        if (!data) return r

        const updated = { ...r }
        let changed = false
        if (!updated.sds_url && data.sds_url) { updated.sds_url = data.sds_url; changed = true }
        if (!updated.hazards && data.hazards) { updated.hazards = data.hazards; changed = true }
        if (!updated.storage_conditions && data.storage_conditions) { updated.storage_conditions = data.storage_conditions; changed = true }
        if (updated.carbon_count == null && data.carbon_count != null) { updated.carbon_count = data.carbon_count; changed = true }
        if (changed) filled++
        return updated
      }))

      setEnrichCount(filled)
      setEnrichStatus('done')
    } catch {
      setEnrichStatus('idle')
    }
  }

  async function handleImport() {
    setImporting(true)
    const rows = addedBy.trim()
      ? previewRows.map(r => ({ ...r, added_by: addedBy.trim() }))
      : previewRows
    await onImport(rows)
    setImporting(false)
  }

  const mappedCount = Object.values(mappings).filter(Boolean).length
  const hasName = Object.values(mappings).includes('name')

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">Import from CSV / Excel</h2>
            <div className="flex gap-4 mt-1">
              {(['upload', 'map', 'preview'] as Step[]).map((s, i) => (
                <span
                  key={s}
                  className={`text-xs font-medium ${step === s ? 'text-teal-600' : 'text-gray-300'}`}
                >
                  {i + 1}. {s === 'upload' ? 'Upload' : s === 'map' ? 'Map Columns' : 'Preview'}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-teal-400 hover:bg-teal-50/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <div className="flex justify-center mb-3">
                  <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="font-medium text-slate-700">Click to select a CSV or Excel file</p>
                <p className="text-sm text-slate-400 mt-1">You can manually assign any unrecognized columns in the next step</p>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
              </div>
              {parsing && <p className="text-center text-teal-600">Reading file…</p>}
              {error && <p className="text-center text-red-600">{error}</p>}
            </>
          )}

          {/* Step 2: Map columns */}
          {step === 'map' && (
            <>
              <p className="text-sm text-gray-600">
                Found <strong>{headers.length}</strong> columns and <strong>{rawRows.length}</strong> rows.
                Columns marked <strong>Auto</strong> were recognized automatically. Assign any others using the dropdowns, or leave as "Skip".
              </p>

              {!hasName && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-3 py-2">
                  You must map at least one column to <strong>Name</strong> to import.
                </div>
              )}

              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 w-1/2">Column in your file</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600 w-1/2">Maps to field</th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header, i) => {
                      const mapped = mappings[header]
                      const isAuto = !!mapped
                      return (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2.5">
                            <span className="font-medium">{header || <em className="text-gray-400">(empty)</em>}</span>
                            {isAuto && <span className="ml-2 text-teal-600 text-xs font-medium bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded">Auto</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              className="input py-1"
                              value={mapped ?? ''}
                              onChange={e =>
                                setMapping(header, (e.target.value as keyof ChemicalInsert) || null)
                              }
                            >
                              {FIELD_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-400">{mappedCount} column{mappedCount !== 1 ? 's' : ''} mapped</p>
            </>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && (
            <>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
                Found <strong>{previewRows.length}</strong> chemical{previewRows.length !== 1 ? 's' : ''} ready to import.
              </div>

              {/* Added by */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-600 whitespace-nowrap">Added by</label>
                <input
                  className="input py-1.5 text-sm"
                  placeholder="Your name (optional)"
                  value={addedBy}
                  onChange={e => setAddedBy(e.target.value)}
                />
              </div>

              {/* Auto-enrich from PubChem */}
              {(() => {
                const missingCount = previewRows.filter(r =>
                  (r.cas_number || r.name) &&
                  (!r.sds_url || !r.hazards || !r.storage_conditions || r.carbon_count == null)
                ).length

                if (enrichStatus === 'done') {
                  return (
                    <div className="flex items-center gap-2 text-sm text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      PubChem data filled for {enrichCount} chemical{enrichCount !== 1 ? 's' : ''} (SDS, hazards, storage, carbons).
                    </div>
                  )
                }
                if (missingCount > 0) {
                  return (
                    <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm">
                      <span className="text-amber-800">
                        <strong>{missingCount}</strong> chemical{missingCount !== 1 ? 's are' : ' is'} missing PubChem data (SDS, hazards, storage, carbons).
                      </span>
                      <button
                        onClick={autoEnrich}
                        disabled={enrichStatus === 'loading'}
                        className="btn-secondary text-xs py-1 px-3 whitespace-nowrap flex items-center gap-1.5"
                      >
                        {enrichStatus === 'loading' ? (
                          <>
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                            </svg>
                            Looking up…
                          </>
                        ) : 'Auto-fill from PubChem'}
                      </button>
                    </div>
                  )
                }
                return null
              })()}

              {previewRows.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="text-xs w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Chemical Name', 'CAS #', 'Hazards', 'Storage', 'SDS', 'Location', '# Bottles'].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-slate-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(0, 6).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-1.5 font-medium">{r.name ?? ''}</td>
                          <td className="px-3 py-1.5 text-slate-500 font-mono">{r.cas_number ?? ''}</td>
                          <td className="px-3 py-1.5 text-slate-500 max-w-[120px] truncate">{r.hazards ?? '—'}</td>
                          <td className="px-3 py-1.5 text-slate-500 max-w-[100px] truncate">{r.storage_conditions ?? '—'}</td>
                          <td className="px-3 py-1.5">{r.sds_url ? <span className="text-teal-600">✓</span> : '—'}</td>
                          <td className="px-3 py-1.5">{r.location ?? ''}</td>
                          <td className="px-3 py-1.5">{r.bottle_count ?? ''}</td>
                        </tr>
                      ))}
                      {previewRows.length > 6 && (
                        <tr className="border-t">
                          <td colSpan={7} className="px-3 py-1.5 text-slate-400 italic">
                            …and {previewRows.length - 6} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between gap-2 p-5 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={() => {
              if (step === 'map') setStep('upload')
              else if (step === 'preview') setStep('map')
              else onClose()
            }}
            className="btn-secondary"
          >
            {step === 'upload' ? 'Cancel' : '← Back'}
          </button>

          {step === 'map' && (
            <button onClick={buildPreview} disabled={!hasName} className="btn-primary">
              Preview →
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleImport}
              disabled={previewRows.length === 0 || importing}
              className="btn-primary"
            >
              {importing ? 'Importing…' : `Import ${previewRows.length} Chemicals`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
