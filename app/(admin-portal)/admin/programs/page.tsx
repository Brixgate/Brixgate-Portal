'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen01Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, PencilEdit01Icon, Delete01Icon,
  ArrowUp01Icon, ArrowDown01Icon,
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
  ARCHIVED:  'bg-[#f3f4f6] text-[#4b5563]',
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
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 px-4 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Edit Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
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

// ── Publish programme modal ───────────────────────────────────────────────────
interface PublishCohort {
  id: number; title: string; status?: string
  start_date?: string; startDate?: string
  end_date?: string;   endDate?: string
}

function PublishProgramModal({
  program, onClose, onPublished,
}: { program: ApiProgram; onClose: () => void; onPublished: (updated: ApiProgram) => void }) {
  const [cohorts, setCohorts]     = useState<PublishCohort[]>([])
  const [selectedId, setSelected] = useState<number | null>(null)
  const [fetching, setFetching]   = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res  = await apiClient.get(`/admin/programs/${program.id}/cohorts?size=50`)
        const data = unwrap<{ cohorts?: PublishCohort[] } | PublishCohort[]>(res.data)
        const list: PublishCohort[] = Array.isArray(data) ? data : (data as { cohorts?: PublishCohort[] })?.cohorts ?? []
        setCohorts(list)
        // Pre-select the first non-CLOSED cohort
        const pick = list.find(c => c.status !== 'CLOSED') ?? list[0] ?? null
        if (pick) setSelected(pick.id)
      } catch { setError('Could not load cohorts.') }
      finally  { setFetching(false) }
    }
    load()
  }, [program.id])

  const openCohort     = cohorts.find(c => c.status === 'OPEN')
  const willCloseOther = openCohort && openCohort.id !== selectedId

  function fmtDate(d?: string) {
    if (!d) return ''
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function handlePublish() {
    if (!selectedId) { setError('Select a cohort to open.'); return }
    setPublishing(true); setError('')
    try {
      // Close the currently-open cohort if it's different from the selection
      if (willCloseOther) {
        await apiClient.patch(`/admin/cohorts/${openCohort!.id}`, { status: 'CLOSED' })
      }
      // Open the selected cohort
      await apiClient.patch(`/admin/cohorts/${selectedId}`, { status: 'OPEN' })
      // Publish the programme
      await apiClient.patch(`/admin/programs/${program.id}`, { status: 'PUBLISHED' })
      onPublished({ ...program, status: 'PUBLISHED' })
    } catch (err) { setError(getApiError(err)) }
    finally       { setPublishing(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <div>
            <h2 className="text-[15px] font-bold text-[#111827] font-display">Publish Programme</h2>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5 truncate max-w-[340px]">{program.title}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#374151] font-body leading-[1.6]">
            Choose which cohort to open for registration. The programme will go live on the website once published.
          </p>

          {willCloseOther && (
            <div className="bg-[#fffaeb] border border-[#fed7aa] rounded-[8px] px-4 py-3">
              <p className="text-[12px] text-[#b45309] font-body">
                <span className="font-semibold">"{openCohort!.title}"</span> is currently open — it will be set to Closed automatically.
              </p>
            </div>
          )}

          {fetching ? (
            <div className="flex items-center gap-2 py-6 justify-center text-[#4b5563]">
              <Loading01Icon size={16} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[13px] font-body">Loading cohorts…</span>
            </div>
          ) : cohorts.length === 0 ? (
            <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[8px] px-4 py-4">
              <p className="text-[13px] font-semibold text-[#d51520] font-display mb-0.5">No cohorts found</p>
              <p className="text-[12px] text-[#4b5563] font-body">Add at least one cohort to this programme before publishing.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
              {cohorts.map(c => {
                const isSelected = selectedId === c.id
                const start = c.start_date ?? c.startDate
                const end   = c.end_date   ?? c.endDate
                const statusStyle =
                  c.status === 'OPEN'   ? 'bg-[#ecfdf3] text-[#027a48]' :
                  c.status === 'CLOSED' ? 'bg-[#f3f4f6] text-[#4b5563]' :
                                          'bg-[#eff6ff] text-[#1d4ed8]'
                return (
                  <label key={c.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[8px] border cursor-pointer transition-colors ${
                      isSelected ? 'border-[#d51520] bg-[#fef2f2]' : 'border-[#e5e7eb] hover:bg-[#f9fafb]'
                    }`}>
                    <input type="radio" name="publish-cohort" checked={isSelected}
                      onChange={() => setSelected(c.id)} className="accent-[#d51520] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{c.title}</p>
                      {(start || end) && (
                        <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
                          {fmtDate(start)}{start && end ? ' → ' : ''}{fmtDate(end)}
                        </p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display flex-shrink-0 ${statusStyle}`}>
                      {((c.status ?? 'UPCOMING').charAt(0) + (c.status ?? 'UPCOMING').slice(1).toLowerCase())}
                    </span>
                  </label>
                )
              })}
            </div>
          )}

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button onClick={handlePublish}
              disabled={publishing || fetching || cohorts.length === 0 || !selectedId}
              className="flex-1 h-10 rounded-[8px] bg-[#027a48] text-[13px] font-semibold text-white font-display hover:bg-[#065f46] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {publishing
                ? <><Loading01Icon size={13} className="animate-spin" strokeWidth={2} /> Publishing…</>
                : <><ArrowUp01Icon size={13} strokeWidth={2} /> Publish Programme</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Take offline confirm modal ─────────────────────────────────────────────────
function TakeOfflineModal({
  program, onClose, onTakenOffline,
}: { program: ApiProgram; onClose: () => void; onTakenOffline: (updated: ApiProgram) => void }) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  async function handleConfirm() {
    setSaving(true); setError('')
    try {
      await apiClient.patch(`/admin/programs/${program.id}`, { status: 'DRAFT' })
      onTakenOffline({ ...program, status: 'DRAFT' })
    } catch (err) { setError(getApiError(err)) }
    finally       { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-[#fffaeb] flex items-center justify-center mb-4">
          <ArrowDown01Icon size={18} color="#b45309" strokeWidth={2} />
        </div>
        <h2 className="text-[15px] font-bold text-[#111827] font-display mb-1">Take Programme Offline?</h2>
        <p className="text-[13px] text-[#4b5563] font-body mb-1">
          <span className="font-semibold text-[#374151]">{program.title}</span> will be set back to Draft and hidden from the website.
        </p>
        <p className="text-[12px] text-[#98a2b3] font-body mb-5">Cohort statuses are not changed — manage them separately.</p>
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
          <button onClick={handleConfirm} disabled={saving}
            className="flex-1 h-10 rounded-[8px] bg-[#b45309] text-[13px] font-semibold text-white font-display hover:bg-[#92400e] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Take Offline
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
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 px-4 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">New Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
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
  const [showCreate, setShowCreate]         = useState(false)
  const [editProgram, setEditProgram]       = useState<ApiProgram | null>(null)
  const [deleteProgram, setDeleteProgram]   = useState<ApiProgram | null>(null)
  const [publishProgram, setPublishProgram] = useState<ApiProgram | null>(null)
  const [offlineProgram, setOfflineProgram] = useState<ApiProgram | null>(null)

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

  function handlePublished(updated: ApiProgram) {
    setPrograms(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setPublishProgram(null)
  }

  function handleTakenOffline(updated: ApiProgram) {
    setPrograms(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setOfflineProgram(null)
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
          <p className="text-[14px] text-[#4b5563] font-body mt-0.5">
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
                    <p className="text-[14px] font-semibold text-[#111827] font-display">No programmes yet</p>
                    <p className="text-[13px] text-[#4b5563] font-body mt-1">Create your first programme to get started</p>
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
                        {/* Publish / Take Offline */}
                        {p.status === 'DRAFT' || p.status === 'ARCHIVED' ? (
                          <button
                            onClick={() => setPublishProgram(p)}
                            title="Publish programme"
                            className="h-7 px-2.5 flex items-center gap-1 rounded-[6px] bg-[#ecfdf3] hover:bg-[#d1fae5] text-[#027a48] text-[11px] font-semibold font-display transition-colors">
                            <ArrowUp01Icon size={11} strokeWidth={2} /> Publish
                          </button>
                        ) : p.status === 'PUBLISHED' ? (
                          <button
                            onClick={() => setOfflineProgram(p)}
                            title="Take programme offline"
                            className="h-7 px-2.5 flex items-center gap-1 rounded-[6px] bg-[#fffaeb] hover:bg-[#fef3c7] text-[#b45309] text-[11px] font-semibold font-display transition-colors">
                            <ArrowDown01Icon size={11} strokeWidth={2} /> Offline
                          </button>
                        ) : null}
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
      {publishProgram && (
        <PublishProgramModal program={publishProgram} onClose={() => setPublishProgram(null)} onPublished={handlePublished} />
      )}
      {offlineProgram && (
        <TakeOfflineModal program={offlineProgram} onClose={() => setOfflineProgram(null)} onTakenOffline={handleTakenOffline} />
      )}
    </div>
  )
}
