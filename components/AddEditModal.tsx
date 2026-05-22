'use client'

import { useState, useEffect } from 'react'
import type { Chemical, ChemicalInsert } from '@/types/chemical'
import { UNITS } from '@/types/chemical'

interface Props {
  chemical?: Chemical | null
  onClose: () => void
  onSave: (data: Partial<ChemicalInsert>) => Promise<void>
}

interface SdsLink { label: string; url: string }

interface LookupResult {
  name: string
  cas_number: string | null
  molecular_formula: string | null
  sds_url: string
  sds_links: SdsLink[]
  pubchem_url: string
}

const EMPTY: Partial<ChemicalInsert> = {
  name: '',
  cas_number: '',
  location: '',
  quantity: undefined,
  unit: 'g',
  supplier: '',
  catalog_number: '',
  lot_number: '',
  date_received: '',
  expiration_date: '',
  sds_url: '',
  purchase_url: '',
  notes: '',
}

export default function AddEditModal({ chemical, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<ChemicalInsert>>(EMPTY)
  const [saving, setSaving] = useState(false)

  // Name lookup state
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null)
  const [lookupError, setLookupError] = useState('')

  // SDS options from lookup
  const [sdsOptions, setSdsOptions] = useState<SdsLink[]>([])

  useEffect(() => {
    if (chemical) {
      setForm({
        name: chemical.name,
        cas_number: chemical.cas_number ?? '',
        location: chemical.location ?? '',
        quantity: chemical.quantity ?? undefined,
        unit: chemical.unit ?? 'g',
        supplier: chemical.supplier ?? '',
        catalog_number: chemical.catalog_number ?? '',
        lot_number: chemical.lot_number ?? '',
        date_received: chemical.date_received ?? '',
        expiration_date: chemical.expiration_date ?? '',
        sds_url: chemical.sds_url ?? '',
        purchase_url: chemical.purchase_url ?? '',
        notes: chemical.notes ?? '',
      })
    } else {
      setForm(EMPTY)
    }
  }, [chemical])

  function set(field: keyof ChemicalInsert, value: string | number | null) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function lookupByName() {
    const name = form.name?.trim()
    if (!name) return
    setLookupLoading(true)
    setLookupError('')
    setLookupResult(null)

    try {
      const res = await fetch(`/api/lookup-chemical?q=${encodeURIComponent(name)}`)
      if (!res.ok) {
        const j = await res.json()
        setLookupError(j.error ?? 'Not found on PubChem')
        return
      }
      const data: LookupResult = await res.json()
      setLookupResult(data)
      setSdsOptions(data.sds_links)

      // Auto-fill CAS if empty
      if (!form.cas_number && data.cas_number) set('cas_number', data.cas_number)
      // Auto-fill SDS URL
      if (!form.sds_url && data.sds_url) set('sds_url', data.sds_url)
    } catch {
      setLookupError('Network error')
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Partial<ChemicalInsert> = { ...form }
    for (const k of Object.keys(payload) as (keyof ChemicalInsert)[]) {
      if (payload[k] === '') (payload as Record<string, unknown>)[k] = null
    }
    await onSave(payload)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">
            {chemical ? 'Edit Chemical' : 'Add Chemical'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Chemical Name + PubChem lookup */}
          <div>
            <label className="label">Chemical Name *</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={form.name ?? ''}
                onChange={e => { set('name', e.target.value); setLookupResult(null); setLookupError('') }}
                required
                placeholder="e.g. (3-Aminopropyl)triethoxysilane"
              />
              <button
                type="button"
                onClick={lookupByName}
                disabled={lookupLoading || !form.name?.trim()}
                className="btn-secondary whitespace-nowrap"
                title="Search PubChem for CAS number and SDS links"
              >
                {lookupLoading ? 'Searching…' : 'Look up'}
              </button>
            </div>

            {/* Lookup result banner */}
            {lookupResult && (
              <div className="mt-2 bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-teal-700 font-medium">Found on PubChem</span>
                  <a href={lookupResult.pubchem_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline">View →</a>
                </div>
                {lookupResult.molecular_formula && (
                  <p className="text-gray-600 text-xs">Formula: <strong>{lookupResult.molecular_formula}</strong></p>
                )}
                {lookupResult.cas_number && (
                  <p className="text-gray-600 text-xs">CAS: <strong>{lookupResult.cas_number}</strong> (auto-filled below)</p>
                )}
                {sdsOptions.length > 0 && (
                  <div className="pt-1">
                    <p className="text-xs text-gray-600 mb-1">Choose SDS source:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {sdsOptions.map(opt => (
                        <button
                          key={opt.url}
                          type="button"
                          onClick={() => set('sds_url', opt.url)}
                          className={`text-xs px-2 py-1 rounded border transition-colors ${
                            form.sds_url === opt.url
                              ? 'bg-teal-600 text-white border-teal-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {lookupError && (
              <p className="mt-1 text-xs text-red-500">{lookupError} — try a different name or fill in manually.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CAS Number</label>
              <input className="input" value={form.cas_number ?? ''} onChange={e => set('cas_number', e.target.value)} placeholder="e.g. 919-30-2" />
            </div>

            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location ?? ''} onChange={e => set('location', e.target.value)} placeholder="e.g. PN Hood, Fridge 1" />
            </div>

            <div>
              <label className="label">Quantity</label>
              <input
                className="input"
                type="number"
                step="any"
                value={form.quantity ?? ''}
                onChange={e => set('quantity', e.target.value ? parseFloat(e.target.value) : null)}
              />
            </div>

            <div>
              <label className="label">Unit</label>
              <select className="input" value={form.unit ?? 'g'} onChange={e => set('unit', e.target.value)}>
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Supplier</label>
              <input className="input" value={form.supplier ?? ''} onChange={e => set('supplier', e.target.value)} />
            </div>

            <div>
              <label className="label">Catalog #</label>
              <input className="input" value={form.catalog_number ?? ''} onChange={e => set('catalog_number', e.target.value)} />
            </div>

            <div>
              <label className="label">Lot #</label>
              <input className="input" value={form.lot_number ?? ''} onChange={e => set('lot_number', e.target.value)} />
            </div>

            <div>
              <label className="label">Date Received</label>
              <input className="input" type="date" value={form.date_received ?? ''} onChange={e => set('date_received', e.target.value)} />
            </div>

            <div>
              <label className="label">Expiration Date</label>
              <input className="input" type="date" value={form.expiration_date ?? ''} onChange={e => set('expiration_date', e.target.value)} />
            </div>

            <div className="col-span-2">
              <label className="label">
                SDS URL
                {form.sds_url && (
                  <a href={form.sds_url} target="_blank" rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline font-normal">Test link →</a>
                )}
              </label>
              <input className="input" value={form.sds_url ?? ''} onChange={e => set('sds_url', e.target.value)} placeholder="Paste link or use Look up above" />
            </div>

            <div className="col-span-2">
              <label className="label">Purchase URL</label>
              <input className="input" type="url" value={form.purchase_url ?? ''} onChange={e => set('purchase_url', e.target.value)} placeholder="Link to supplier product page" />
            </div>

            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : chemical ? 'Save Changes' : 'Add Chemical'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
