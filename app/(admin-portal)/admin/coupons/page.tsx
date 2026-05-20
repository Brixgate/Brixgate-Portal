'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DiscountTag01Icon, Add01Icon, Loading01Icon, Cancel01Icon, AlertCircleIcon, PencilEdit01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

interface Coupon {
  id: number; code: string; type?: string; value?: number; currency?: string
  status?: string; usage_limit?: number; usageLimit?: number
  usage_count?: number; usageCount?: number
  valid_from?: string; validFrom?: string
  valid_to?: string; validTo?: string
  description?: string
}
interface Pagination { totalElements: number; totalPages: number; hasNext?: boolean }

const inputCls = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'

function CouponModal({
  coupon, onClose, onSaved,
}: { coupon?: Coupon; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: coupon?.code ?? '', type: coupon?.type ?? 'PERCENT',
    value: coupon?.value ? String(coupon.value) : '',
    currency: coupon?.currency ?? 'NGN',
    status: coupon?.status ?? 'ACTIVE',
    valid_from: coupon?.validFrom ?? coupon?.valid_from ?? '',
    valid_to:   coupon?.validTo   ?? coupon?.valid_to   ?? '',
    usage_limit: coupon?.usageLimit ?? coupon?.usage_limit ? String(coupon?.usageLimit ?? coupon?.usage_limit) : '',
    description: coupon?.description ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.code.trim()) { setError('Code is required.'); return }
    if (!form.value)       { setError('Value is required.'); return }
    if (!form.valid_from || !form.valid_to) { setError('Valid from/to dates required.'); return }
    setSaving(true)
    try {
      const payload = {
        code: form.code.trim().toUpperCase(), type: form.type,
        value: parseFloat(form.value), currency: form.currency,
        status: form.status, valid_from: form.valid_from, valid_to: form.valid_to,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : undefined,
        description: form.description.trim() || undefined,
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={`${inputCls} bg-white`}>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Currency</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={`${inputCls} bg-white`}>
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>
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
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">{pagination ? `${pagination.totalElements} coupons` : 'Discount codes'}</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119]">
          <Add01Icon size={15} strokeWidth={2} /> New Coupon
        </button>
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
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">Page {page} of {pagination.totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
      {modal.open && <CouponModal coupon={modal.coupon} onClose={() => setModal({ open: false })} onSaved={() => { setModal({ open: false }); fetch() }} />}
    </div>
  )
}
