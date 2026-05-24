'use client'

import { useState, useEffect } from 'react'
import type { Chemical, ChemicalInsert } from '@/types/chemical'
import {
  CONTAINER_SIZES, PHYSICAL_STATES, COMMON_DISTRIBUTORS,
  STORAGE_CONDITIONS, HAZARD_OPTIONS, normalizeDistributor, containerSizesForState,
  reconcileContainerSize,
} from '@/types/chemical'
import { HazardDiamond } from '@/components/HazardPictogram'

interface Props {
  chemical?: Chemical | null
  onClose: () => void
  onSave: (data: Partial<ChemicalInsert>) => Promise<void>
  existingLocations?: string[]
  existingDistributors?: string[]
}

const EMPTY: Partial<ChemicalInsert> = {
  name: '', cas_number: '', distributor: '', container_size: '',
  physical_state: '', location: '', carbon_count: undefined,
  bottle_count: 1, storage_conditions: '', hazards: '', sds_url: '', notes: '',
  added_by: '',
}

export default function AddEditModal({ chemical, onClose, onSave, existingLocations = [], existingDistributors = [] }: Props) {
  const [form, setForm] = useState<Partial<ChemicalInsert>>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupInfo, setLookupInfo] = useState<{ formula?: string; pubchem_url?: string; filledFields?: string[] } | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [customSize, setCustomSize] = useState(false)
  const [customDistributor, setCustomDistributor] = useState(false)
  const [selectedHazards, setSelectedHazards] = useState<string[]>([])

  useEffect(() => {
    if (chemical) {
      const h = chemical.hazards ? chemical.hazards.split(', ') : []
      setSelectedHazards(h)
      setForm({
        name: chemical.name,
        cas_number: chemical.cas_number ?? '',
        distributor: chemical.distributor ?? '',
        container_size: chemical.container_size ?? '',
        physical_state: chemical.physical_state ?? '',
        location: chemical.location ?? '',
        carbon_count: chemical.carbon_count ?? undefined,
        bottle_count: chemical.bottle_count ?? undefined,
        storage_conditions: chemical.storage_conditions ?? '',
        hazards: chemical.hazards ?? '',
        sds_url: chemical.sds_url ?? '',
        notes: chemical.notes ?? '',
        added_by: chemical.added_by ?? '',
      })
      setCustomSize(!CONTAINER_SIZES.includes(chemical.container_size ?? ''))
      const knownDistributors = [...COMMON_DISTRIBUTORS, ...existingDistributors]
      setCustomDistributor(!!chemical.distributor && !knownDistributors.includes(chemical.distributor))
    } else {
      const savedBy = typeof window !== 'undefined' ? (localStorage.getItem('lab_added_by') ?? '') : ''
      setForm({ ...EMPTY, added_by: savedBy })
      setSelectedHazards([])
      setCustomSize(false)
      setCustomDistributor(false)
    }
  }, [chemical])

  function set(field: keyof ChemicalInsert, value: string | number | null) {
    setForm(f => {
      const next = { ...f, [field]: value }
      // Clear container size only on a clear unit-type mismatch (e.g. grams for Liquid)
      if (field === 'physical_state' && f.container_size) {
        const cs    = f.container_size.toLowerCase()
        const isVol = /\d\s*(ml|l)\b/.test(cs)
        const isMas = /\d\s*(mg|g|kg)\b/.test(cs)
        const sv    = (value as string).toLowerCase()
        const wVol  = sv === 'liquid' || sv === 'viscous liquid' || sv === 'gas'
        const wMas  = sv === 'solid' || sv === 'powder' || sv === 'gel'
        if ((wVol && isMas) || (wMas && isVol)) next.container_size = ''
      }
      return next
    })
    if (field === 'added_by' && typeof value === 'string') {
      localStorage.setItem('lab_added_by', value)
    }
  }

  function toggleHazard(h: string) {
    setSelectedHazards(prev => {
      const next = prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]
      set('hazards', next.join(', '))
      return next
    })
  }

  async function lookupByName() {
    const name = form.name?.trim()
    if (!name) return
    setLookupLoading(true)
    setLookupError('')
    setLookupInfo(null)
    try {
      const res = await fetch(`/api/lookup-chemical?q=${encodeURIComponent(name)}`)
      if (!res.ok) {
        const j = await res.json()
        setLookupError(j.error ?? 'Not found')
        return
      }
      const data = await res.json()
      const filled: string[] = []

      // Standardize the name spelling/capitalization to PubChem's canonical title
      if (data.title && form.name && data.title !== form.name.trim()) {
        set('name', data.title)
        filled.push('name')
      }
      if (!form.cas_number && data.cas_number) { set('cas_number', data.cas_number); filled.push('CAS') }
      if (!form.sds_url && data.sds_url) { set('sds_url', data.sds_url); filled.push('SDS') }
      if (!form.hazards && data.hazards) {
        const h = (data.hazards as string).split(', ').filter(Boolean)
        setSelectedHazards(h)
        set('hazards', data.hazards)
        filled.push('hazards')
      }
      if (!form.storage_conditions && data.storage_conditions) {
        set('storage_conditions', data.storage_conditions)
        filled.push('storage')
      }
      if (!form.physical_state && data.physical_state) {
        set('physical_state', data.physical_state)
        filled.push('physical state')
      }
      if (form.carbon_count == null && data.carbon_count != null) {
        set('carbon_count', data.carbon_count)
        filled.push('carbons')
      }
      // Give a bare-number container size a unit based on the resolved state
      const resolvedState = (form.physical_state || data.physical_state) as string | undefined
      if (form.container_size && resolvedState) {
        const reconciled = reconcileContainerSize(form.container_size, resolvedState)
        if (reconciled === null) set('container_size', '')
        else if (reconciled !== form.container_size) set('container_size', reconciled)
      }

      setLookupInfo({
        formula: data.molecular_formula,
        pubchem_url: data.pubchem_url,
        filledFields: filled,
      })
    } catch {
      setLookupError('Network error')
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form }
    if (payload.distributor) {
      payload.distributor = normalizeDistributor(payload.distributor) ?? undefined
    }
    for (const k of Object.keys(payload) as (keyof ChemicalInsert)[]) {
      if (payload[k] === '') (payload as Record<string, unknown>)[k] = null
    }
    await onSave(payload)
    setSaving(false)
  }

  const isEdit = !!chemical

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? 'Edit Chemical' : 'Add Chemical'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg -mr-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Chemical Name */}
          <div>
            <label className="label">Chemical Name *</label>
            <div className="flex gap-2">
              <input
                className="input"
                value={form.name ?? ''}
                onChange={e => { set('name', e.target.value); setLookupInfo(null); setLookupError('') }}
                required
                placeholder="e.g. (3-Aminopropyl)triethoxysilane"
              />
              <button
                type="button"
                onClick={lookupByName}
                disabled={lookupLoading || !form.name?.trim()}
                className="btn-secondary px-4"
              >
                {lookupLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : 'Look up'}
              </button>
            </div>
            {lookupInfo && (
              <div className="mt-2 flex items-center gap-3 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>
                  Found on PubChem{lookupInfo.formula ? ` — ${lookupInfo.formula}` : ''}.
                  {lookupInfo.filledFields && lookupInfo.filledFields.length > 0
                    ? ` Auto-filled: ${lookupInfo.filledFields.join(', ')}.`
                    : ' All fields already filled.'}
                </span>
                <a href={lookupInfo.pubchem_url} target="_blank" rel="noopener noreferrer"
                  className="ml-auto font-medium hover:underline">View →</a>
              </div>
            )}
            {lookupError && (
              <p className="mt-1.5 text-xs text-red-500">{lookupError} — fill in manually below.</p>
            )}
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">CAS #</label>
              <input className="input font-mono" value={form.cas_number ?? ''}
                onChange={e => set('cas_number', e.target.value)} placeholder="e.g. 919-30-2" />
            </div>
            <div>
              <label className="label">Distributor</label>
              {customDistributor ? (
                <div className="flex gap-2">
                  <input className="input" value={form.distributor ?? ''}
                    onChange={e => set('distributor', e.target.value)} placeholder="Enter distributor name" />
                  <button type="button" onClick={() => { setCustomDistributor(false); set('distributor', '') }}
                    className="btn-ghost px-2 text-xs">List</button>
                </div>
              ) : (
                <select className="input" value={form.distributor ?? ''}
                  onChange={e => {
                    if (e.target.value === '__other__') { setCustomDistributor(true); set('distributor', '') }
                    else set('distributor', e.target.value)
                  }}>
                  <option value="">— Select —</option>
                  {[...new Set([...COMMON_DISTRIBUTORS, ...existingDistributors])].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  <option value="__other__">Other…</option>
                </select>
              )}
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Container Size</label>
              {customSize ? (
                <div className="flex gap-2">
                  <input className="input" value={form.container_size ?? ''}
                    onChange={e => set('container_size', e.target.value)} placeholder="e.g. 2.5 kg" />
                  <button type="button" onClick={() => { setCustomSize(false); set('container_size', '') }}
                    className="btn-ghost px-2 text-xs">List</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select className="input" value={form.container_size ?? ''}
                    onChange={e => set('container_size', e.target.value)}>
                    <option value="">— Select —</option>
                    {containerSizesForState(form.physical_state).map(s => <option key={s}>{s}</option>)}
                  </select>
                  <button type="button" onClick={() => { setCustomSize(true); set('container_size', '') }}
                    className="btn-ghost px-2 text-xs">Custom</button>
                </div>
              )}
            </div>
            <div>
              <label className="label">Physical State</label>
              <select className="input" value={form.physical_state ?? ''}
                onChange={e => set('physical_state', e.target.value)}>
                <option value="">— Select —</option>
                {PHYSICAL_STATES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Location</label>
              <input className="input" list="locations-list" value={form.location ?? ''}
                onChange={e => set('location', e.target.value)} placeholder="e.g. PN Hood" />
              <datalist id="locations-list">
                {existingLocations.map(l => <option key={l} value={l} />)}
              </datalist>
            </div>
            <div>
              <label className="label"># of Carbons</label>
              <input className="input" type="number" min={0} value={form.carbon_count ?? ''}
                onChange={e => set('carbon_count', e.target.value ? parseInt(e.target.value) : null)} />
            </div>
            <div>
              <label className="label"># of Bottles</label>
              <div className="flex rounded-lg border border-slate-200 shadow-sm overflow-hidden bg-white">
                <button type="button"
                  className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-r border-slate-200 text-lg leading-none"
                  onClick={() => set('bottle_count', Math.max(0, (form.bottle_count ?? 0) - 1))}>−</button>
                <input type="number" min={0}
                  className="flex-1 text-center text-sm py-2 outline-none bg-transparent"
                  value={form.bottle_count ?? ''}
                  onChange={e => set('bottle_count', e.target.value ? parseInt(e.target.value) : null)} />
                <button type="button"
                  className="px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 border-l border-slate-200 text-lg leading-none"
                  onClick={() => set('bottle_count', (form.bottle_count ?? 0) + 1)}>+</button>
              </div>
            </div>
          </div>

          {/* Row 4 */}
          <div>
            <label className="label">Storage Conditions</label>
            <select className="input" value={form.storage_conditions ?? ''}
              onChange={e => set('storage_conditions', e.target.value)}>
              <option value="">— Select —</option>
              {STORAGE_CONDITIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* Hazards */}
          <div>
            <label className="label">Hazards</label>
            <div className="flex flex-wrap gap-2">
              {HAZARD_OPTIONS.map(h => {
                const active = selectedHazards.includes(h)
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHazard(h)}
                    title={h}
                    aria-pressed={active}
                    className={`flex flex-col items-center gap-1 w-[72px] rounded-lg border px-1.5 py-2 transition-colors ${
                      active
                        ? 'border-red-300 bg-red-50 ring-1 ring-red-200'
                        : 'border-slate-200 bg-white hover:border-red-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <HazardDiamond label={h} size="md" />
                    <span className="text-[10px] leading-tight text-center text-slate-600">{h}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* SDS */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">SDS Link</label>
              {form.sds_url && (
                <a href={form.sds_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-teal-600 hover:underline">Test link →</a>
              )}
            </div>
            <input className="input" value={form.sds_url ?? ''}
              onChange={e => set('sds_url', e.target.value)}
              placeholder="Paste SDS URL or use Look up above" />
          </div>

          {/* Added By + Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Added By</label>
              <input className="input" value={form.added_by ?? ''}
                onChange={e => set('added_by', e.target.value)}
                placeholder="Your name" />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name?.trim()}
            className="btn-primary"
          >
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Chemical'}
          </button>
        </div>
      </div>
    </div>
  )
}
