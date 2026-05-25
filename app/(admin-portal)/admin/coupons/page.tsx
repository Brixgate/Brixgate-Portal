'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DiscountTag01Icon, Add01Icon, Loading01Icon, Cancel01Icon, AlertCircleIcon, PencilEdit01Icon, Refresh01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

interface Coupon {
  id: number; code: string; type?: string; value?: number; currency?: string
  status?: string; usage_limit?: number; usageLimit?: number
  usage_count?: number; usageCount?: number
  valid_from?: string; validFrom?: string
  valid_to?: string; validTo?: string
  description?: string
  program_id?: number; programId?: number
  cohort_id?: number; cohortId?: number
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }
interface Programme { id: number; title: string }
interface Cohort    { id: number; name: string }

const inputCls = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'

function CouponModal({
  coupon, onClose, onSaved,
}: { coupon?: Coupon; onClose: () => void; onSaved: () => void }) {
  const existingProgramId = coupon?.programId ?? coupon?.program_id
  const existingCohortId  = coupon?.cohortId  ?? coupon?.cohort_id

  const [form, setForm] = useState({
    code:        coupon?.code ?? '',
    type:        coupon?.type ?? 'PERCENT',
    value:       coupon?.value ? String(coupon.value) : '',
    currency:    coupon?.currency ?? 'NGN',
    valid_from:  coupon?.validFrom ?? coupon?.valid_from ?? '',
    valid_to:    coupon?.validTo   ?? coupon?.valid_to   ?? '',
    usage_limit: (coupon?.usageLimit ?? coupon?.usage_limit) ? String(coupon?.usageLimit ?? coupon?.usage_limit) : '',
    description: coupon?.description ?? '',
  })
  const [scope, setScope]           = useState<'general' | 'programme'>(existingProgramId ? 'programme' : 'general')
  const [selectedProgramId, setSelectedProgramId] = useState<string>(existingProgramId ? String(existingProgramId) : '')
  const [selectedCohortId,  setSelectedCohortId]  = useState<string>(existingCohortId  ? String(existingCohortId)  : '')

  const [programmes,    setProgammes]    = useState<Programme[]>([])
  const [cohorts,       setCohorts]      = useState<Cohort[]>([])
  const [loadingProgs,  setLoadingProgs] = useState(false)
  const [loadingCohorts,setLoadingCohorts] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  // Fetch programmes when scope switches to 'programme'
  useEffect(() => {
    if (scope !== 'programme') return
    setLoadingProgs(true)
    apiClient.get('/admin/programs?size=100')
      .then(res => {
        const data = unwrap<{ programs?: Programme[] }>(res.data)
        setProgammes(Array.isArray(data?.programs) ? data.programs : [])
      })
      .catch(() => setProgammes([]))
      .finally(() => setLoadingProgs(false))
  }, [scope])

  // Fetch cohorts when a programme is selected
  useEffect(() => {
    if (!selectedProgramId) { setCohorts([]); setSelectedCohortId(''); return }
    setLoadingCohorts(true)
    apiClient.get(`/admin/programs/${selectedProgramId}/cohorts?size=100`)
      .then(res => {
        const data = unwrap<{ cohorts?: Cohort[] }>(res.data)
        const list = Array.isArray(data?.cohorts) ? data.cohorts : []
        setCohorts(list)
        // Auto-select if only one cohort
        if (list.length === 1) setSelectedCohortId(String(list[0].id))
        else if (!existingCohortId) setSelectedCohortId('')
      })
      .catch(() => { setCohorts([]); setSelectedCohortId('') })
      .finally(() => setLoadingCohorts(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgramId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.code.trim()) { setError('Code is required.'); return }
    if (!form.value)       { setError('Value is required.'); return }
    if (!form.valid_from || !form.valid_to) { setError('Valid from/to dates required.'); return }
    if (scope === 'programme' && !selectedProgramId) { setError('Select a programme.'); return }
    setSaving(true)
    try {
      const payload: Record<string, unknown> = {
        code:        form.code.trim().toUpperCase(),
        type:        form.type,
        value:       parseFloat(form.value),
        currency:    form.currency,
        valid_from:  form.valid_from,
        valid_to:    form.valid_to,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
        description: form.description.trim() || undefined,
      }
      if (scope === 'programme') {
        payload.program_id = parseInt(selectedProgramId)
        if (selectedCohortId) payload.cohort_id = parseInt(selectedCohortId)
      }
      if (coupon) {
        await apiClient.patch(`/admin/coupons/${coupon.id}`, payload)
      } else {
        await apiClient.post('/admin/coupons', payload)
      }
      onSaved()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{coupon ? 'Edit Coupon' : 'New Coupon'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">

          {/* Code + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Code</label>
              <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="BRIXGATE20" className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={`${inputCls} bg-white`}>
                <option value="PERCENT">Percentage</option>
                <option value="AMOUNT">Fixed Amount</option>
              </select>
            </div>
          </div>

          {/* Value + Usage Limit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">
                Value {form.type === 'PERCENT' ? '(%)' : '(₦)'}
              </label>
              <input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="20" className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Usage Limit</label>
              <input type="number" value={form.usage_limit} onChange={e => set('usage_limit', e.target.value)} placeholder="100" className={inputCls} />
            </div>
          </div>

          {/* Valid From / To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Valid From</label>
              <input type="date" value={form.valid_from} onChange={e => set('valid_from', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Valid To</label>
              <input type="date" value={form.valid_to} onChange={e => set('valid_to', e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Currency</label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)} className={`${inputCls} bg-white`}>
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          {/* Scope toggle */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-2">Applies To</label>
            <div className="flex gap-2">
              {(['general', 'programme'] as const).map(s => (
                <button
                  key={s} type="button"
                  onClick={() => { setScope(s); if (s === 'general') { setSelectedProgramId(''); setSelectedCohortId('') } }}
                  className={`flex-1 h-9 rounded-[8px] border text-[13px] font-medium font-body transition-colors ${
                    scope === s
                      ? 'bg-[#d51520] border-[#d51520] text-white'
                      : 'bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                  }`}
                >
                  {s === 'general' ? 'General (all)' : 'Specific Programme'}
                </button>
              ))}
            </div>
          </div>

          {/* Programme + Cohort selectors (only when scoped) */}
          {scope === 'programme' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Programme</label>
                <select
                  value={selectedProgramId}
                  onChange={e => { setSelectedProgramId(e.target.value); setSelectedCohortId('') }}
                  disabled={loadingProgs}
                  className={`${inputCls} bg-white disabled:bg-[#f9fafb] disabled:text-[#9ca3af]`}
                >
                  <option value="">{loadingProgs ? 'Loading…' : 'Select a programme'}</option>
                  {programmes.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>

              {selectedProgramId && (
                <div>
                  <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Cohort</label>
                  <select
                    value={selectedCohortId}
                    onChange={e => setSelectedCohortId(e.target.value)}
                    disabled={loadingCohorts}
                    className={`${inputCls} bg-white disabled:bg-[#f9fafb] disabled:text-[#9ca3af]`}
                  >
                    {loadingCohorts
                      ? <option value="">Loading…</option>
                      : <>
                          <option value="">All cohorts</option>
                          {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </>
                    }
                  </select>
                  {!loadingCohorts && cohorts.length === 1 && (
                    <p className="text-[11px] text-[#6b7280] font-body mt-1">Only one cohort — auto-selected.</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Description */}
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional description" className={inputCls} />
          </div>

          {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />} {coupon ? 'Save Changes' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons]       = useState<Coupon[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [status, setStatus]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [modal, setModal]           = useState<{ open: boolean; coupon?: Coupon }>({ open: false })

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (status) p.set('status', status)
      const res  = await apiClient.get(`/admin/coupons?${p}`)
      const data = unwrap<{ coupons?: Coupon[]; pagination?: Pagination }>(res.data)
      setCoupons(Array.isArray(data?.coupons) ? data.coupons : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setCoupons([]) } finally { setLoading(false) }
  }, [page, status])

  useEffect(() => { fetch() }, [fetch])

  function formatDate(d?: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Coupons</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">{pagination ? `${(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0)} coupons` : 'Discount codes'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => fetch()}
            className="flex items-center gap-1.5 h-10 px-3 border border-[#e5e7eb] text-[#374151] rounded-[8px] text-[13px] font-body hover:bg-[#f9fafb]"
            title="Refresh usage counts">
            <Refresh01Icon size={14} strokeWidth={1.5} /> Refresh
          </button>
          <button onClick={() => setModal({ open: true })}
            className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119]">
            <Add01Icon size={15} strokeWidth={2} /> New Coupon
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 mb-6">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Code', 'Type', 'Value', 'Usage', 'Valid From', 'Valid To', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[100, 80, 80, 80, 100, 100, 80, 40].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : coupons.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <DiscountTag01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No coupons yet</p>
                </td></tr>
              ) : coupons.map(c => {
                const usageLimit = c.usageLimit ?? c.usage_limit
                const usageCount = c.usageCount ?? c.usage_count ?? 0
                return (
                  <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                    <td className="px-4 py-3.5"><span className="font-mono text-[13px] font-bold text-[#111827]">{c.code}</span></td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-[#6b7280] font-body">{c.type}</span></td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-semibold text-[#111827] font-display">
                        {c.type === 'PERCENT' ? `${c.value}%` : `₦${c.value?.toLocaleString()}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] text-[#374151] font-body">
                        {usageCount}{usageLimit ? ` / ${usageLimit}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-[#6b7280] font-body">{formatDate(c.validFrom ?? c.valid_from)}</span></td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-[#6b7280] font-body">{formatDate(c.validTo ?? c.valid_to)}</span></td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${c.status === 'ACTIVE' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setModal({ open: true, coupon: c })}
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6]">
                        <PencilEdit01Icon size={13} color="#6b7280" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">Page {page} of {pagination.totalPages ?? pagination.total_pages ?? 1}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
      {modal.open && <CouponModal coupon={modal.coupon} onClose={() => setModal({ open: false })} onSaved={() => { setModal({ open: false }); fetch() }} />}
    </div>
  )
}
