'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  PresentationBarChart01Icon, Add01Icon, Loading01Icon,
  Cancel01Icon, AlertCircleIcon, ArrowRight01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiProgram { id: number; title: string }
interface ApiCohort {
  id: number; title: string; status?: string
  start_date?: string; end_date?: string
  max_students?: number; enrolled_count?: number
  program?: ApiProgram; program_id?: number
}
interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages?: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const COHORT_STATUS_STYLE: Record<string, string> = {
  OPEN:     'bg-[#ecfdf3] text-[#027a48]',
  UPCOMING: 'bg-[#eff6ff] text-[#1d4ed8]',
  CLOSED:   'bg-[#f3f4f6] text-[#4b5563]',
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Create cohort modal ───────────────────────────────────────────────────────
function CreateCohortModal({
  programs, onClose, onCreated,
}: { programs: ApiProgram[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    program_id: programs[0]?.id ? String(programs[0].id) : '',
    title: '', start_date: '', end_date: '',
    status: 'UPCOMING', max_students: '30',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.program_id) { setError('Select a programme.'); return }
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.start_date || !form.end_date) { setError('Start and end dates required.'); return }
    setSaving(true)
    try {
      await apiClient.post(`/admin/programs/${form.program_id}/cohorts`, {
        title: form.title.trim(),
        start_date: form.start_date,
        end_date: form.end_date,
        status: form.status,
        max_students: parseInt(form.max_students) || 30,
      })
      onCreated()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const inputCls = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">New Cohort</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Programme</label>
            <select value={form.program_id} onChange={e => set('program_id', e.target.value)}
              className={`${inputCls} bg-white`}>
              <option value="">Select programme…</option>
              {programs.map(p => <option key={p.id} value={String(p.id)}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Cohort Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="Software Engineering — Cohort 3" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">End Date</label>
              <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={`${inputCls} bg-white`}>
                {['UPCOMING', 'OPEN', 'CLOSED'].map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Max Students</label>
              <input type="number" value={form.max_students} onChange={e => set('max_students', e.target.value)}
                placeholder="30" className={inputCls} />
            </div>
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />} Create Cohort
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminCohortsPage() {
  const router = useRouter()
  const [programs, setPrograms]       = useState<ApiProgram[]>([])
  const [cohorts, setCohorts]         = useState<ApiCohort[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  const [activeProgram, setActiveProgram] = useState<number | null>(null)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)

  // Fetch programs for tab filter
  useEffect(() => {
    apiClient.get('/admin/programs?size=100').then(res => {
      const data = unwrap<{ programs?: ApiProgram[] }>(res.data)
      const list = Array.isArray(data?.programs) ? data.programs : []
      setPrograms(list)
    }).catch(() => {})
  }, [])

  const fetchCohorts = useCallback(async () => {
    setLoading(true)
    try {
      const programId = activeProgram ?? programs[0]?.id
      if (!programId) { setLoading(false); return }
      const res  = await apiClient.get(`/admin/programs/${programId}/cohorts?page=${page}&size=20`)
      const data = unwrap<{ cohorts?: ApiCohort[]; pagination?: Pagination }>(res.data)
      setCohorts(Array.isArray(data?.cohorts) ? data.cohorts : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setCohorts([]) } finally { setLoading(false) }
  }, [activeProgram, programs, page])

  useEffect(() => { if (programs.length > 0) fetchCohorts() }, [programs, activeProgram, page]) // eslint-disable-line react-hooks/exhaustive-deps

  const activeProgramId = activeProgram ?? programs[0]?.id ?? null

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div />
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={15} strokeWidth={2} /> New Cohort
        </button>
      </div>

      {/* Programme filter dropdown */}
      {programs.length > 0 && (
        <div className="mb-6">
          <select
            value={activeProgramId ?? ''}
            onChange={e => { setActiveProgram(Number(e.target.value)); setPage(1) }}
            className="h-10 px-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 min-w-[240px]"
          >
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Cohort', 'Status', 'Start Date', 'End Date', 'Students', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: j === 0 ? 200 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : cohorts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <PresentationBarChart01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#111827] font-display">No cohorts yet</p>
                    <p className="text-[13px] text-[#4b5563] font-body mt-1">Create the first cohort for this programme</p>
                  </td>
                </tr>
              ) : (
                cohorts.map(c => (
                  <tr key={c.id}
                    onClick={() => router.push(`/admin/cohorts/${c.id}`)}
                    className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors cursor-pointer">
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{c.title}</p>
                    </td>
                    <td className="px-4 py-4">
                      {c.status
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${COHORT_STATUS_STYLE[c.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                            {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                          </span>
                        : '—'
                      }
                    </td>
                    <td className="px-4 py-4"><span className="text-[13px] text-[#4b5563] font-body">{formatDate(c.start_date)}</span></td>
                    <td className="px-4 py-4"><span className="text-[13px] text-[#4b5563] font-body">{formatDate(c.end_date)}</span></td>
                    <td className="px-4 py-4">
                      <span className="text-[13px] font-medium text-[#111827] font-body">
                        {c.enrolled_count ?? 0} / {c.max_students ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ArrowRight01Icon size={16} color="#4b5563" strokeWidth={1.5} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">Page {page} of {pagination.totalPages ?? pagination.total_pages ?? 1}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateCohortModal programs={programs} onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchCohorts() }} />
      )}
    </div>
  )
}
