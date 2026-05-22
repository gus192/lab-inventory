'use client'

import { useState, useEffect } from 'react'
import type { Chemical, ChemicalInsert } from '@/types/chemical'
import { UNITS } from '@/types/chemical'

interface Props {
  chemical?: Chemical | null
  onClose: () => void
  onSave: (data: Partial<ChemicalInsert>) => Promise<void>
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
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')

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

  async function fillFromUrl() {
    const url = form.purchase_url?.trim()
    if (!url) return
    setUrlLoading(true)
    setUrlError('')
    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const j = await res.json()
        setUrlError(j.error ?? 'Failed to fetch URL')
        return
      }
      const data = await res.json()
      setForm(f => ({
        ...f,
        name: data.name || f.name,
        cas_number: data.cas_number || f.cas_number,
        supplier: data.supplier || f.supplier,
        catalog_number: data.catalog_number || f.catalog_number,
      }))
    } catch {
      setUrlError('Network error fetching URL')
    } finally {
      setUrlLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload: Partial<ChemicalInsert> = { ...form }
    // Clean empty strings to null
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
          {/* Purchase URL with auto-fill */}
          <div>
            <label className="label">Purchase URL (paste supplier link to auto-fill)</label>
            <div className="flex gap-2">
              <input
                className="input"
                type="url"
                value={form.purchase_url ?? ''}
                onChange={e => set('purchase_url', e.target.value)}
                placeholder="https://www.sigmaaldrich.com/..."
              />
              <button
                type="button"
                onClick={fillFromUrl}
                disabled={urlLoading || !form.purchase_url}
                className="btn-secondary whitespace-nowrap"
              >
                {urlLoading ? 'Fetching…' : 'Auto-fill'}
              </button>
            </div>
            {urlError && <p className="text-red-500 text-xs mt-1">{urlError}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Chemical Name *</label>
              <input className="input" value={form.name ?? ''} onChange={e => set('name', e.target.value)} required />
            </div>

            <div>
              <label className="label">CAS Number</label>
              <input className="input" value={form.cas_number ?? ''} onChange={e => set('cas_number', e.target.value)} placeholder="e.g. 7732-18-5" />
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
              <label className="label">SDS URL</label>
              <input className="input" type="url" value={form.sds_url ?? ''} onChange={e => set('sds_url', e.target.value)} placeholder="Link to Safety Data Sheet" />
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
