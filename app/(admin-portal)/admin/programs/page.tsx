'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen01Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, MoreVerticalIcon, PencilEdit01Icon,
  ArrowRight01Icon, Delete01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiProgram {
  id: number
  title: string
  slug?: string
  type?: string
  level?: string
  format?: string
  status?: string
  description?: string
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
  ARCHIVED:  'bg-[#f3f4f6] text-[#6b7280]',
}

// ── 3-dot action menu ─────────────────────────────────────────────────────────
function ActionMenu({
  program, onEdit, onOpen, onDelete,
}: {
  program: ApiProgram
  onEdit:   (p: ApiProgram) => void
  onOpen:   (p: ApiProgram) => void
  onDelete: (p: ApiProgram) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function handle(fn: () => void) {
    setOpen(false)
    fn()
  }

  return (
    <div ref={ref} className="relative flex justify-end" onClick={e => e.stopPropagation()}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
      >
        <MoreVerticalIcon size={15} color="#6b7280" strokeWidth={1.5} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-[#e5e7eb] rounded-[8px] shadow-[0_4px_16px_rgba(0,0,0,.1)] py-1 w-[148px]">
          <button
            onClick={() => handle(() => onEdit(program))}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-body text-[#374151] hover:bg-[#f9fafb] text-left"
          >
            <PencilEdit01Icon size={14} color="#6b7280" strokeWidth={1.5} />
            Edit
          </button>
          <button
            onClick={() => handle(() => onOpen(program))}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-body text-[#374151] hover:bg-[#f9fafb] text-left"
          >
            <ArrowRight01Icon size={14} color="#6b7280" strokeWidth={1.5} />
            Open
          </button>
          <div className="h-px bg-[#f3f4f6] mx-2 my-1" />
          <button
            onClick={() => handle(() => onDelete(program))}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-body text-[#d51520] hover:bg-[#fef2f2] text-left"
          >
            <Delete01Icon size={14} color="#d51520" strokeWidth={1.5} />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Edit programme modal ───────────────────────────────────────────────────────
function EditProgramModal({
  program, onClose, onSaved,
}: { program: ApiProgram; onClose: () => void; onSaved: (updated: ApiProgram) => void }) {
  const [form, setForm] = useState({
    title:       program.title ?? '',
    description: program.description ?? '',
    level:       program.level ?? 'BEGINNER',
    type:        program.type ?? 'BOOTCAMP',
    status:      program.status ?? 'DRAFT',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    try {
      await apiClient.patch(`/admin/programs/${program.id}`, {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        level:       form.level,
        type:        form.type,
        status:      form.status,
      })
      onSaved({ ...program, ...form })
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Edit Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Programme Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="AI in Software Engineering"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Brief description of the programme…"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Level</label>
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Format</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
          <Delete01Icon size={18} color="#d51520" strokeWidth={1.5} />
        </div>
        <h2 className="text-[15px] font-bold text-[#111827] font-display mb-1">Delete Programme?</h2>
        <p className="text-[13px] text-[#6b7280] font-body mb-5">
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

// ── Create programme modal ────────────────────────────────────────────────────
function CreateProgramModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', type: 'BOOTCAMP', level: 'BEGINNER',
    main_price: '', final_price: '', status: 'DRAFT', description: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.main_price)   { setError('Main price is required.'); return }
    if (!form.final_price)  { setError('Final price is required.'); return }
    setSaving(true)
    try {
      await apiClient.post('/admin/programs', {
        title: form.title.trim(),
        type: form.type,
        level: form.level,
        main_price: parseFloat(form.main_price),
        final_price: parseFloat(form.final_price),
        status: form.status,
        description: form.description.trim() || undefined,
      })
      onCreated()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">New Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Programme Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="AI in Software Engineering"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Brief description of the programme…"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Level</label>
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Format</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Main Price (₦)</label>
              <input type="number" value={form.main_price} onChange={e => set('main_price', e.target.value)}
                placeholder="250000"
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Final Price (₦)</label>
              <input type="number" value={form.final_price} onChange={e => set('final_price', e.target.value)}
                placeholder="200000"
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
          </div>
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
  const [showCreate, setShowCreate]   = useState(false)
  const [editProgram, setEditProgram] = useState<ApiProgram | null>(null)
  const [deleteProgram, setDeleteProgram] = useState<ApiProgram | null>(null)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiClient.get(`/admin/programs?page=${page}&size=20`)
      const data = unwrap<{ programs?: ApiProgram[]; pagination?: Pagination }>(res.data)
      setPrograms(Array.isArray(data?.programs) ? data.programs : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setPrograms([]) } finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

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
          <h1 className="text-[24px] font-bold text-[#111827] font-display">Programmes</h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
            {pagination ? `${(pagination.totalElements ?? pagination.total_elements ?? pagination.total ?? 0)} programmes` : 'Master curriculum bank'}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={15} strokeWidth={2} /> New Programme
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Programme', 'Level', 'Format', 'Final Price', 'Status', 'Actions'].map(h => (
                  <th key={h} className={`text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display ${h === 'Actions' ? 'text-right' : ''}`}>
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
                    <p className="text-[14px] font-semibold text-[#111827] font-display">No programmes yet</p>
                    <p className="text-[13px] text-[#6b7280] font-body mt-1">Create your first programme to get started</p>
                  </td>
                </tr>
              ) : (
                programs.map(p => (
                  <tr key={p.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{p.title}</p>
                      {p.description && (
                        <p className="text-[12px] text-[#6b7280] font-body mt-0.5 line-clamp-1 max-w-[320px]">{p.description}</p>
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
                      <span className="text-[12px] text-[#6b7280] font-body">{p.type ? p.type.charAt(0) + p.type.slice(1).toLowerCase() : '—'}</span>
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
                    <td className="px-4 py-4">
                      <ActionMenu
                        program={p}
                        onEdit={setEditProgram}
                        onOpen={prog => router.push(`/admin/programs/${prog.id}`)}
                        onDelete={setDeleteProgram}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#6b7280] font-body">
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
