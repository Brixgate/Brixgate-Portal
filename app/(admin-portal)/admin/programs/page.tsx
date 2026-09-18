'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen01Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, PencilEdit01Icon, Delete01Icon, CheckmarkCircle01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import PriceInput from '@/components/admin/PriceInput'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiProgram {
  id: number
  title: string
  slug?: string
  type?: string
  level?: string
  format?: string
  status?: string
  subtitle?: string
  description?: string
  duration?: string
  skills?: string
  outcomes?: string
  audience?: string
  main_price?: number; mainPrice?: number
  final_price?: number; finalPrice?: number
  modules_count?: number
  deleted_at?: string
}

interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const LEVELS   = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
const TYPES    = ['BOOTCAMP', 'WORKSHOP', 'COURSE']
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

const LEVEL_STYLE: Record<string, string> = {
  BEGINNER:     'bg-[#ecfdf3] text-[#027a48]',
  INTERMEDIATE: 'bg-[#eff6ff] text-[#1d4ed8]',
  ADVANCED:     'bg-[#fef2f2] text-[#d51520]',
}
const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-[#ecfdf3] text-[#027a48]',
  DRAFT:     'bg-[#fffbeb] text-[#b45309]',
  ARCHIVED:  'bg-[#f3f4f6] text-[#4b5563]',
}

// ── Shared field/textarea helpers ─────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium text-[#374151] font-body">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#9ca3af] font-body">{hint}</p>}
    </div>
  )
}

const CLS_I = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white placeholder:text-[#9ca3af]'
const CLS_T = 'w-full px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none bg-white placeholder:text-[#9ca3af]'
const CLS_S = `${CLS_I}`

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9ca3af] font-display pt-1">{children}</p>
}

// ── Edit programme modal ───────────────────────────────────────────────────────
function EditProgramModal({
  program, onClose, onSaved,
}: { program: ApiProgram; onClose: () => void; onSaved: (updated: ApiProgram) => void }) {
  const [form, setForm] = useState({
    title:       program.title ?? '',
    subtitle:    program.subtitle ?? '',
    description: program.description ?? '',
    duration:    program.duration ?? '',
    level:       program.level ?? 'BEGINNER',
    type:        program.type ?? 'BOOTCAMP',
    status:      program.status ?? 'DRAFT',
    main_price:  program.mainPrice ?? program.main_price ?? ('' as number | string),
    final_price: program.finalPrice ?? program.final_price ?? ('' as number | string),
    skills:      program.skills ?? '',
    outcomes:    program.outcomes ?? '',
    audience:    program.audience ?? '',
  })
  const [saving, setSaving]           = useState(false)
  const [error,  setError]            = useState('')
  const [confirming, setConfirming]   = useState<'publish' | 'offline' | null>(null)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    const statusChanged = form.status !== (program.status ?? 'DRAFT')
    if (statusChanged && form.status === 'PUBLISHED') { setConfirming('publish'); return }
    if (statusChanged && form.status === 'DRAFT' && program.status === 'PUBLISHED') { setConfirming('offline'); return }
    doSave()
  }

  async function doSave() {
    setSaving(true); setConfirming(null); setError('')
    try {
      const mp = String(form.main_price).trim()
      const fp = String(form.final_price).trim()
      await apiClient.patch(`/admin/programs/${program.id}`, {
        title:       form.title.trim(),
        subtitle:    form.subtitle.trim()    || undefined,
        description: form.description.trim() || undefined,
        duration:    form.duration.trim()    || undefined,
        level:       form.level,
        type:        form.type,
        status:      form.status,
        main_price:  mp  ? parseFloat(mp)  : undefined,
        final_price: fp  ? parseFloat(fp)  : undefined,
        skills:      form.skills.trim()   || undefined,
        outcomes:    form.outcomes.trim() || undefined,
        audience:    form.audience.trim() || undefined,
      })
      onSaved({
        ...program,
        title:       form.title.trim(),
        subtitle:    form.subtitle.trim()    || undefined,
        description: form.description.trim() || undefined,
        duration:    form.duration.trim()    || undefined,
        level:       form.level,
        type:        form.type,
        status:      form.status,
        mainPrice:   mp ? parseFloat(mp) : undefined,
        finalPrice:  fp ? parseFloat(fp) : undefined,
        skills:      form.skills.trim()   || undefined,
        outcomes:    form.outcomes.trim() || undefined,
        audience:    form.audience.trim() || undefined,
      })
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 px-4 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[580px] my-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Edit Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* Confirmation step */}
        {confirming && (
          <div className="px-6 py-6 flex flex-col gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirming === 'publish' ? 'bg-[#ecfdf3]' : 'bg-[#fffaeb]'}`}>
              {confirming === 'publish'
                ? <CheckmarkCircle01Icon size={20} color="#027a48" strokeWidth={1.5} />
                : <AlertCircleIcon size={20} color="#b45309" strokeWidth={1.5} />}
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#111827] font-display mb-1">
                {confirming === 'publish' ? 'Publish this programme?' : 'Take programme offline?'}
              </h3>
              <p className="text-[13px] text-[#4b5563] font-body leading-[1.6]">
                {confirming === 'publish'
                  ? <><span className="font-semibold text-[#374151]">{form.title}</span> will go live and students will be able to enrol.</>
                  : <><span className="font-semibold text-[#374151]">{form.title}</span> will be set back to Draft. Existing enrolments are not affected.</>}
              </p>
            </div>
            {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setConfirming(null)}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
                Go Back
              </button>
              <button type="button" onClick={doSave} disabled={saving}
                className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold text-white font-display disabled:opacity-60 flex items-center justify-center gap-2 transition-colors ${
                  confirming === 'publish' ? 'bg-[#027a48] hover:bg-[#065f46]' : 'bg-[#b45309] hover:bg-[#92400e]'
                }`}>
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                {confirming === 'publish' ? 'Yes, Publish' : 'Yes, Take Offline'}
              </button>
            </div>
          </div>
        )}

        {/* Main form */}
        {!confirming && (
          <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

            <SectionLabel>Basics</SectionLabel>
            <Field label="Programme Title">
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="AI in Software Engineering" className={CLS_I} />
            </Field>
            <Field label="Subtitle" hint="Short tagline shown on the programme card">
              <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
                placeholder="Master production-ready AI skills in 12 weeks" className={CLS_I} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Level">
                <select value={form.level} onChange={e => set('level', e.target.value)} className={CLS_S}>
                  {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Format">
                <select value={form.type} onChange={e => set('type', e.target.value)} className={CLS_S}>
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Duration">
                <input value={form.duration} onChange={e => set('duration', e.target.value)}
                  placeholder="12 weeks" className={CLS_I} />
              </Field>
            </div>
            <Field label="Status">
              <select value={form.status} onChange={e => set('status', e.target.value)} className={CLS_S}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
              {form.status !== (program.status ?? 'DRAFT') && (
                <p className="text-[11px] text-[#b45309] font-body flex items-center gap-1 mt-1">
                  <AlertCircleIcon size={11} color="#b45309" strokeWidth={1.5} />
                  Status changes from {(program.status ?? 'DRAFT').toLowerCase()} to {form.status.toLowerCase()} — you&apos;ll confirm below.
                </p>
              )}
            </Field>

            <SectionLabel>Pricing</SectionLabel>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Original Price">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#4b5563] pointer-events-none">₦</span>
                  <PriceInput value={String(form.main_price)} onChange={v => set('main_price', v)}
                    placeholder="150000" className={`${CLS_I} pl-7`} />
                </div>
              </Field>
              <Field label="Final Price" hint="What students actually pay">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#4b5563] pointer-events-none">₦</span>
                  <PriceInput value={String(form.final_price)} onChange={v => set('final_price', v)}
                    placeholder="120000" className={`${CLS_I} pl-7`} />
                </div>
              </Field>
            </div>

            <SectionLabel>Content</SectionLabel>
            <Field label="Description">
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} placeholder="What is this programme about?" className={CLS_T} />
            </Field>
            <Field label="Skills Covered" hint="Comma-separated or plain text list of skills students will gain">
              <textarea value={form.skills} onChange={e => set('skills', e.target.value)}
                rows={2} placeholder="Python, Machine Learning, LLMs, Prompt Engineering…" className={CLS_T} />
            </Field>
            <Field label="Learning Outcomes" hint="What students will be able to do on completion">
              <textarea value={form.outcomes} onChange={e => set('outcomes', e.target.value)}
                rows={3} placeholder="By the end of this programme, students will be able to…" className={CLS_T} />
            </Field>
            <Field label="Target Audience" hint="Who is this programme designed for?">
              <textarea value={form.audience} onChange={e => set('audience', e.target.value)}
                rows={2} placeholder="Early-career professionals, final-year students, career switchers…" className={CLS_T} />
            </Field>

            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({
  program, onClose, onDeleted,
}: { program: ApiProgram; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState('')

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await apiClient.delete(`/admin/programs/${program.id}`)
      onDeleted(program.id)
    } catch (err) { setError(getApiError(err)) } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
          <Delete01Icon size={18} color="#d51520" strokeWidth={1.5} />
        </div>
        <h2 className="text-[15px] font-bold text-[#111827] font-display mb-1">Delete Programme?</h2>
        <p className="text-[13px] text-[#4b5563] font-body mb-5">
          <span className="font-semibold text-[#374151]">{program.title}</span> will be permanently deleted. This cannot be undone.
        </p>
        {error && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body mb-3">
            <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}


function CreateProgramModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', subtitle: '', type: 'BOOTCAMP', level: 'BEGINNER', status: 'DRAFT',
    description: '', duration: '', main_price: '', final_price: '',
    skills: '', outcomes: '', audience: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    try {
      await apiClient.post('/admin/programs', {
        title:       form.title.trim(),
        subtitle:    form.subtitle.trim()    || undefined,
        type:        form.type,
        level:       form.level,
        status:      form.status,
        description: form.description.trim() || undefined,
        duration:    form.duration.trim()    || undefined,
        main_price:  form.main_price  ? parseFloat(form.main_price)  : undefined,
        final_price: form.final_price ? parseFloat(form.final_price) : undefined,
        skills:      form.skills.trim()   || undefined,
        outcomes:    form.outcomes.trim() || undefined,
        audience:    form.audience.trim() || undefined,
      })
      onCreated()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 px-4 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[580px] my-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">New Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          <SectionLabel>Basics</SectionLabel>
          <Field label="Programme Title">
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="AI in Software Engineering" className={CLS_I} />
          </Field>
          <Field label="Subtitle" hint="Short tagline shown on the programme card">
            <input value={form.subtitle} onChange={e => set('subtitle', e.target.value)}
              placeholder="Master production-ready AI skills in 12 weeks" className={CLS_I} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Level">
              <select value={form.level} onChange={e => set('level', e.target.value)} className={CLS_S}>
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
              </select>
            </Field>
            <Field label="Format">
              <select value={form.type} onChange={e => set('type', e.target.value)} className={CLS_S}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Duration">
              <input value={form.duration} onChange={e => set('duration', e.target.value)}
                placeholder="12 weeks" className={CLS_I} />
            </Field>
          </div>
          <Field label="Status">
            <select value={form.status} onChange={e => set('status', e.target.value)} className={CLS_S}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </Field>

          <SectionLabel>Pricing</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Original Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#4b5563] pointer-events-none">₦</span>
                <PriceInput value={form.main_price} onChange={v => set('main_price', v)}
                  placeholder="150000" className={`${CLS_I} pl-7`} />
              </div>
            </Field>
            <Field label="Final Price" hint="What students actually pay">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#4b5563] pointer-events-none">₦</span>
                <PriceInput value={form.final_price} onChange={v => set('final_price', v)}
                  placeholder="120000" className={`${CLS_I} pl-7`} />
              </div>
            </Field>
          </div>

          <SectionLabel>Content</SectionLabel>
          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="What is this programme about?" className={CLS_T} />
          </Field>
          <Field label="Skills Covered" hint="Comma-separated or plain text list of skills students will gain">
            <textarea value={form.skills} onChange={e => set('skills', e.target.value)}
              rows={2} placeholder="Python, Machine Learning, LLMs, Prompt Engineering…" className={CLS_T} />
          </Field>
          <Field label="Learning Outcomes" hint="What students will be able to do on completion">
            <textarea value={form.outcomes} onChange={e => set('outcomes', e.target.value)}
              rows={3} placeholder="By the end of this programme, students will be able to…" className={CLS_T} />
          </Field>
          <Field label="Target Audience" hint="Who is this programme designed for?">
            <textarea value={form.audience} onChange={e => set('audience', e.target.value)}
              rows={2} placeholder="Early-career professionals, final-year students, career switchers…" className={CLS_T} />
          </Field>

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              Create Programme
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms]       = useState<ApiProgram[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate]       = useState(false)
  const [editProgram, setEditProgram]     = useState<ApiProgram | null>(null)
  const [deleteProgram, setDeleteProgram] = useState<ApiProgram | null>(null)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), size: '20' })
      if (statusFilter) params.set('status', statusFilter)
      const res  = await apiClient.get(`/admin/programs?${params.toString()}`)
      const data = unwrap<{ programs?: ApiProgram[]; pagination?: Pagination }>(res.data)
      setPrograms(Array.isArray(data?.programs) ? data.programs : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setPrograms([]) } finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  function handleStatusFilter(v: string) {
    setStatusFilter(v)
    setPage(1)
  }

  function handleEdited(updated: ApiProgram) {
    setPrograms(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setEditProgram(null)
  }

  function handleDeleted(id: number) {
    setPrograms(prev => prev.filter(p => p.id !== id))
    setDeleteProgram(null)
  }

  function formatPrice(p?: number) {
    if (!p) return '—'
    return `₦${p.toLocaleString('en-NG')}`
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] font-display">Programmes</h1>
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">Manage your training programmes</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={15} strokeWidth={2} /> New Programme
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        {/* Filter bar */}
        <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={e => handleStatusFilter(e.target.value)}
            className="h-8 pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[12px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 cursor-pointer"
          >
            <option value="">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          {statusFilter && (
            <button
              onClick={() => handleStatusFilter('')}
              className="text-[12px] text-[#d51520] font-body hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Programme', 'Level', 'Format', 'Final Price', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: j === 0 ? 200 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <BookOpen01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#111827] font-display">
                      {statusFilter ? `No ${statusFilter.toLowerCase()} programmes` : 'No programmes yet'}
                    </p>
                    <p className="text-[13px] text-[#4b5563] font-body mt-1">
                      {statusFilter ? 'Try a different status filter' : 'Create your first programme to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                programs.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/admin/programs/${p.id}`)}
                    className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{p.title}</p>
                      {p.description && (
                        <p className="text-[12px] text-[#4b5563] font-body mt-0.5 line-clamp-1 max-w-[320px]">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {p.level
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${LEVEL_STYLE[p.level] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                            {p.level.charAt(0) + p.level.slice(1).toLowerCase()}
                          </span>
                        : <span className="text-[#d1d5db]">—</span>
                      }
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[12px] text-[#4b5563] font-body">{p.type ? p.type.charAt(0) + p.type.slice(1).toLowerCase() : '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[13px] font-medium text-[#111827] font-body">
                        {formatPrice(p.finalPrice ?? p.final_price)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {p.status
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[p.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                            {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                          </span>
                        : <span className="text-[#d1d5db]">—</span>
                      }
                    </td>
                    {/* Inline actions — stop propagation so row click doesn't fire */}
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditProgram(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
                          title="Edit programme">
                          <PencilEdit01Icon size={14} color="#4b5563" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setDeleteProgram(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#fef2f2] transition-colors"
                          title="Delete programme">
                          <Delete01Icon size={14} color="#d51520" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">
              Page {page} of {pagination.totalPages ?? pagination.total_pages ?? 1}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb]">
                Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb]">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProgramModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchPrograms() }} />
      )}
      {editProgram && (
        <EditProgramModal program={editProgram} onClose={() => setEditProgram(null)} onSaved={handleEdited} />
      )}
      {deleteProgram && (
        <DeleteConfirmModal program={deleteProgram} onClose={() => setDeleteProgram(null)} onDeleted={handleDeleted} />
      )}
    </div>
  )
}
