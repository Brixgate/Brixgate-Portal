'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Cancel01Icon, Copy01Icon, Delete02Icon, PencilEdit01Icon,
  Notification01Icon, Add01Icon, Loading01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Announcement {
  id: number
  program_id?: number
  cohort_id?: number
  title: string
  content: string
  created_by: number
  visibility: 'PLATFORM' | 'PROGRAM' | 'COHORT'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  created_at: string
  updated_at: string
}

interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: string
  reference_type?: string
  reference_id?: number
  is_read: boolean
  read_at?: string
  created_at: string
}

interface Program { id: number; title: string }
interface CohortOption { id: number; title?: string; name?: string }
interface Pagination {
  total_elements: number; total_pages: number
  has_next: boolean; has_previous: boolean; page: number; size: number
}

// ── Constants ─────────────────────────────────────────────────────────────────
const VISIBILITY_OPTIONS = ['PLATFORM', 'PROGRAM', 'COHORT'] as const
const STATUS_OPTIONS      = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
const NOTIF_TYPES = ['PAYMENT','COURSE','COHORT','ASSIGNMENT','CERTIFICATE','INVITE','SYSTEM','ANNOUNCEMENT','QUIZ','SCHEDULE']

const VISIBILITY_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  PLATFORM: { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]', dot: '#1d4ed8', label: 'Platform' },
  PROGRAM:  { bg: 'bg-[#f5f3ff]', text: 'text-[#6d28d9]', dot: '#6d28d9', label: 'Programme' },
  COHORT:   { bg: 'bg-[#f0fdfa]', text: 'text-[#0d9488]', dot: '#0d9488', label: 'Cohort' },
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string }> = {
  DRAFT:     { bg: 'bg-[#f3f4f6]', text: 'text-[#374151]', dot: '#9ca3af' },
  PUBLISHED: { bg: 'bg-[#ecfdf3]', text: 'text-[#027a48]', dot: '#027a48' },
  ARCHIVED:  { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]', dot: '#b45309' },
}

const NOTIF_TYPE_CONFIG: Record<string, { bg: string; text: string }> = {
  PAYMENT:      { bg: 'bg-[#ecfdf3]', text: 'text-[#027a48]' },
  COURSE:       { bg: 'bg-[#eff6ff]', text: 'text-[#1d4ed8]' },
  COHORT:       { bg: 'bg-[#f0fdfa]', text: 'text-[#0d9488]' },
  ASSIGNMENT:   { bg: 'bg-[#fff7ed]', text: 'text-[#c2410c]' },
  CERTIFICATE:  { bg: 'bg-[#fdf4ff]', text: 'text-[#7e22ce]' },
  INVITE:       { bg: 'bg-[#f5f3ff]', text: 'text-[#6d28d9]' },
  SYSTEM:       { bg: 'bg-[#f3f4f6]', text: 'text-[#374151]' },
  ANNOUNCEMENT: { bg: 'bg-[#fef2f2]', text: 'text-[#d51520]' },
  QUIZ:         { bg: 'bg-[#fffbeb]', text: 'text-[#b45309]' },
  SCHEDULE:     { bg: 'bg-[#f0f9ff]', text: 'text-[#0369a1]' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
}

// ── Shared sub-components ─────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-4">
      <p className="text-[12px] text-[#4b5563] font-body flex-shrink-0">{label}</p>
      <p className="text-[13px] font-medium text-[#111827] font-body text-right">{value}</p>
    </div>
  )
}

function VisibilityBadge({ visibility }: { visibility: string }) {
  const cfg = VISIBILITY_CONFIG[visibility] ?? VISIBILITY_CONFIG.PLATFORM
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${cfg.bg} ${cfg.text}`}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {status}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const cfg = NOTIF_TYPE_CONFIG[type] ?? { bg: 'bg-[#f3f4f6]', text: 'text-[#374151]' }
  return (
    <span className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-bold font-display ${cfg.bg} ${cfg.text}`}>
      {type}
    </span>
  )
}

function SelectField({ label, value, onChange, options, disabled, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]; disabled?: boolean; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] font-body mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-10 pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] font-body mb-1.5">
        {label}{required && <span className="text-[#d51520] ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white"
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, required, rows = 4 }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; required?: boolean; rows?: number
}) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] font-body mb-1.5">
        {label}{required && <span className="text-[#d51520] ml-0.5">*</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white resize-none"
      />
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#111827] font-body mb-1.5">{label}</label>
      <input
        type="datetime-local"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white"
      />
    </div>
  )
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────
function DeleteDialog({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onCancel} />
      <div className="fixed z-[70] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[12px] shadow-xl p-6 w-[380px]">
        <h3 className="text-[16px] font-bold text-[#111827] font-display mb-2">Delete Announcement</h3>
        <p className="text-[13px] text-[#4b5563] font-body mb-6">This action cannot be undone. The announcement will be permanently removed.</p>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onCancel} className="h-9 px-4 border border-[#e5e7eb] rounded-[8px] text-[13px] font-medium font-body text-[#374151] hover:bg-[#f9fafb]">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-medium font-body hover:bg-[#b91c1c] disabled:opacity-60 flex items-center gap-2">
            {loading && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

// ── Announcement form modal ───────────────────────────────────────────────────
interface AnnouncementFormProps {
  mode: 'create' | 'edit'
  initial?: Announcement
  programs: Program[]
  onClose: () => void
  onSaved: (a: Announcement) => void
}

function AnnouncementForm({ mode, initial, programs, onClose, onSaved }: AnnouncementFormProps) {
  const [title, setTitle]         = useState(initial?.title ?? '')
  const [content, setContent]     = useState(initial?.content ?? '')
  const [visibility, setVisibility] = useState<string>(initial?.visibility ?? 'PLATFORM')
  const [programId, setProgramId] = useState(initial?.program_id ? String(initial.program_id) : '')
  const [cohortId, setCohortId]   = useState(initial?.cohort_id ? String(initial.cohort_id) : '')
  const [publishAt, setPublishAt] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [status, setStatus]       = useState<string>(initial?.status ?? 'DRAFT')
  const [cohorts, setCohorts]     = useState<CohortOption[]>([])
  const [cohortsLoading, setCohortsLoading] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    if (!programId) { setCohorts([]); setCohortId(''); return }
    setCohortsLoading(true)
    apiClient.get(`/admin/programs/${programId}/cohorts?size=100`)
      .then(res => {
        const data = unwrap<{ cohorts?: CohortOption[] }>(res.data)
        setCohorts(data?.cohorts ?? (Array.isArray(data) ? data as CohortOption[] : []))
      })
      .catch(() => setCohorts([]))
      .finally(() => setCohortsLoading(false))
    setCohortId('')
  }, [programId])

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return }
    if (!content.trim()) { setError('Content is required.'); return }
    if ((visibility === 'PROGRAM' || visibility === 'COHORT') && !programId) {
      setError('Please select a programme.'); return
    }
    if (visibility === 'COHORT' && !cohortId) {
      setError('Please select a cohort.'); return
    }
    setError(''); setSaving(true)
    try {
      const body: Record<string, unknown> = { title, content, visibility, status }
      if (programId) body.program_id = Number(programId)
      if (cohortId)  body.cohort_id  = Number(cohortId)
      if (publishAt) body.publish_at = new Date(publishAt).toISOString()
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString()

      let res
      if (mode === 'create') {
        res = await apiClient.post('/admin/announcements', body)
        const data = unwrap<{ announcement: Announcement }>(res.data)
        onSaved(data.announcement)
      } else {
        res = await apiClient.patch(`/admin/announcements/${initial!.id}`, body)
        const data = unwrap<{ announcement: Announcement }>(res.data)
        onSaved(data.announcement)
      }
    } catch (err) {
      setError(getApiError(err))
    } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-[12px] shadow-xl w-[540px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] flex-shrink-0">
          <h2 className="text-[16px] font-bold text-[#111827] font-display">
            {mode === 'create' ? 'New Announcement' : 'Edit Announcement'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <TextField label="Title" value={title} onChange={setTitle} placeholder="e.g. Important Update for Cohort 3" required />
          <TextareaField label="Content" value={content} onChange={setContent} placeholder="Write your announcement here…" required rows={5} />

          <SelectField
            label="Visibility"
            value={visibility}
            onChange={v => { setVisibility(v); setProgramId(''); setCohortId('') }}
            options={VISIBILITY_OPTIONS.map(v => ({ value: v, label: v === 'PLATFORM' ? 'Platform-wide' : v === 'PROGRAM' ? 'Specific Programme' : 'Specific Cohort' }))}
          />

          {(visibility === 'PROGRAM' || visibility === 'COHORT') && (
            <SelectField
              label="Programme"
              value={programId}
              onChange={setProgramId}
              options={programs.map(p => ({ value: String(p.id), label: p.title }))}
              placeholder="Select a programme"
            />
          )}

          {visibility === 'COHORT' && (
            <SelectField
              label="Cohort"
              value={cohortId}
              onChange={setCohortId}
              options={cohorts.map(c => ({ value: String(c.id), label: c.title ?? c.name ?? `Cohort ${c.id}` }))}
              placeholder={cohortsLoading ? 'Loading cohorts…' : 'Select a cohort'}
              disabled={!programId || cohortsLoading}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <DateField label="Publish At (optional)" value={publishAt} onChange={setPublishAt} />
            <DateField label="Expires At (optional)" value={expiresAt} onChange={setExpiresAt} />
          </div>

          <SelectField
            label="Status"
            value={status}
            onChange={setStatus}
            options={STATUS_OPTIONS.map(s => ({ value: s, label: s }))}
          />

          {error && <p className="text-[12px] text-[#d51520] font-body">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#f3f4f6] flex-shrink-0">
          <button onClick={onClose} className="h-9 px-4 border border-[#e5e7eb] rounded-[8px] text-[13px] font-medium font-body text-[#374151] hover:bg-[#f9fafb]">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-9 px-5 bg-[#d51520] text-white rounded-[8px] text-[13px] font-medium font-body hover:bg-[#b91c1c] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            {mode === 'create' ? 'Create' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Announcement detail panel ─────────────────────────────────────────────────
function AnnouncementPanel({ announcement, programs, onClose, onEdit, onDeleted }: {
  announcement: Announcement
  programs: Program[]
  onClose: () => void
  onEdit: () => void
  onDeleted: (id: number) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const progName = programs.find(p => p.id === announcement.program_id)?.title

  async function handleDelete() {
    setDeleting(true)
    try {
      await apiClient.delete(`/admin/announcements/${announcement.id}`)
      onDeleted(announcement.id)
    } catch { /* keep panel open */ } finally { setDeleting(false); setConfirmDelete(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[420px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] font-display">Announcement</h2>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">#{announcement.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="h-8 px-3 border border-[#e5e7eb] rounded-[8px] text-[12px] font-medium font-body text-[#374151] hover:bg-[#f9fafb] flex items-center gap-1.5">
              <PencilEdit01Icon size={13} strokeWidth={1.5} /> Edit
            </button>
            <button onClick={() => setConfirmDelete(true)} className="w-8 h-8 flex items-center justify-center rounded-[8px] border border-[#fee2e2] text-[#d51520] hover:bg-[#fef2f2]">
              <Delete02Icon size={14} strokeWidth={1.5} />
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
              <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <VisibilityBadge visibility={announcement.visibility} />
            <StatusBadge status={announcement.status} />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-2">Title</p>
            <p className="text-[15px] font-semibold text-[#111827] font-display">{announcement.title}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-2">Content</p>
            <p className="text-[13px] text-[#374151] font-body leading-[20px] whitespace-pre-wrap">{announcement.content}</p>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Target</p>
            <div className="space-y-2">
              <Row label="Visibility" value={announcement.visibility} />
              {progName && <Row label="Programme" value={progName} />}
              {announcement.cohort_id && <Row label="Cohort ID" value={String(announcement.cohort_id)} />}
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Timeline</p>
            <div className="space-y-2">
              <Row label="Created"      value={formatDateTime(announcement.created_at)} />
              <Row label="Last Updated" value={formatDateTime(announcement.updated_at)} />
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <DeleteDialog onConfirm={handleDelete} onCancel={() => setConfirmDelete(false)} loading={deleting} />
      )}
    </>
  )
}

// ── Announcements tab ─────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [pagination, setPagination]       = useState<Pagination | null>(null)
  const [page, setPage]                   = useState(1)
  const [filterVisibility, setFilterVisibility] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [loading, setLoading]             = useState(true)
  const [programs, setPrograms]           = useState<Program[]>([])
  const [showForm, setShowForm]           = useState(false)
  const [editTarget, setEditTarget]       = useState<Announcement | null>(null)
  const [selected, setSelected]           = useState<Announcement | null>(null)

  useEffect(() => {
    apiClient.get('/admin/programs?size=100')
      .then(res => {
        const data = unwrap<{ programs?: Program[] }>(res.data)
        setPrograms(data?.programs ?? (Array.isArray(data) ? data as Program[] : []))
      })
      .catch(() => setPrograms([]))
  }, [])

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (filterVisibility) p.set('visibility', filterVisibility)
      if (filterStatus)     p.set('status', filterStatus)
      const res  = await apiClient.get(`/admin/announcements?${p}`)
      const data = unwrap<{ announcements?: Announcement[]; pagination?: Pagination }>(res.data)
      setAnnouncements(data?.announcements ?? [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setAnnouncements([]) } finally { setLoading(false) }
  }, [page, filterVisibility, filterStatus])

  useEffect(() => { fetchAnnouncements() }, [fetchAnnouncements])

  function handleSaved(a: Announcement) {
    if (editTarget) {
      setAnnouncements(prev => prev.map(x => x.id === a.id ? a : x))
      if (selected?.id === a.id) setSelected(a)
      setEditTarget(null)
    } else {
      setAnnouncements(prev => [a, ...prev])
      if (pagination) setPagination({ ...pagination, total_elements: pagination.total_elements + 1 })
    }
    setShowForm(false)
  }

  function handleDeleted(id: number) {
    setAnnouncements(prev => prev.filter(x => x.id !== id))
    setSelected(null)
  }

  function openEdit(a: Announcement) {
    setEditTarget(a)
    setSelected(null)
    setShowForm(true)
  }

  return (
    <>
      {showForm && (
        <AnnouncementForm
          mode={editTarget ? 'edit' : 'create'}
          initial={editTarget ?? undefined}
          programs={programs}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={handleSaved}
        />
      )}
      {selected && !showForm && (
        <AnnouncementPanel
          announcement={selected}
          programs={programs}
          onClose={() => setSelected(null)}
          onEdit={() => openEdit(selected)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <select value={filterVisibility} onChange={e => { setFilterVisibility(e.target.value); setPage(1) }}
            className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
            <option value="">All Visibility</option>
            {VISIBILITY_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
            className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={() => { setEditTarget(null); setShowForm(true) }}
          className="h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-medium font-body hover:bg-[#b91c1c] flex items-center gap-2">
          <Add01Icon size={15} strokeWidth={2} />
          New Announcement
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Title', 'Visibility', 'Target', 'Status', 'Created'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[200, 90, 140, 80, 100].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : announcements.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <div className="w-16 h-16 bg-[#f3f4f6] rounded-[12px] flex items-center justify-center mx-auto mb-4">
                    <Notification01Icon size={28} color="#9ca3af" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No announcements yet</p>
                  <p className="text-[13px] text-[#4b5563] font-body mt-1">Create your first announcement to notify students</p>
                </td></tr>
              ) : announcements.map(a => {
                const prog = programs.find(p => p.id === a.program_id)
                const target = a.visibility === 'PLATFORM'
                  ? 'All users'
                  : a.visibility === 'PROGRAM'
                  ? prog?.title ?? `Programme #${a.program_id}`
                  : prog ? `${prog.title} / Cohort #${a.cohort_id}` : `Cohort #${a.cohort_id}`
                return (
                  <tr key={a.id} onClick={() => setSelected(a)}
                    className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-medium text-[#111827] font-body max-w-[240px] truncate">{a.title}</p>
                      <p className="text-[11px] text-[#4b5563] font-body mt-0.5 max-w-[240px] truncate">{a.content}</p>
                    </td>
                    <td className="px-4 py-3.5"><VisibilityBadge visibility={a.visibility} /></td>
                    <td className="px-4 py-3.5"><span className="text-[12px] text-[#4b5563] font-body">{target}</span></td>
                    <td className="px-4 py-3.5"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(a.created_at)}</p></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.total_pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total_elements)} of {pagination.total_elements.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.has_previous} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.has_next} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Notification detail panel ─────────────────────────────────────────────────
function NotificationPanel({ notification, onClose }: { notification: Notification; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy(val: string) {
    navigator.clipboard.writeText(val).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="fixed right-0 top-0 h-screen w-[420px] z-50 bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#111827] font-display">Notification</h2>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">#{notification.id}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="bg-[#f9fafb] rounded-[10px] p-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-1">Type</p>
              <TypeBadge type={notification.type} />
            </div>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold font-display ${notification.is_read ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#374151]'}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: notification.is_read ? '#027a48' : '#9ca3af' }} />
              {notification.is_read ? 'Read' : 'Unread'}
            </span>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-2">Title</p>
            <p className="text-[14px] font-semibold text-[#111827] font-display">{notification.title}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-2">Message</p>
            <p className="text-[13px] text-[#374151] font-body leading-[20px] whitespace-pre-wrap">{notification.message}</p>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Details</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between py-1.5">
                <p className="text-[12px] text-[#4b5563] font-body">User ID</p>
                <div className="flex items-center gap-2">
                  <p className="text-[13px] font-medium text-[#111827] font-body">{notification.user_id}</p>
                  <button onClick={() => copy(String(notification.user_id))} className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f6]">
                    <Copy01Icon size={12} color={copied ? '#027a48' : '#9ca3af'} strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              {notification.reference_type && <Row label="Reference Type" value={notification.reference_type} />}
              {notification.reference_id    && <Row label="Reference ID"   value={String(notification.reference_id)} />}
            </div>
          </div>

          <div className="h-px bg-[#f3f4f6]" />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">Timeline</p>
            <div className="space-y-2">
              <Row label="Sent"    value={formatDateTime(notification.created_at)} />
              {notification.read_at && <Row label="Read At" value={formatDateTime(notification.read_at)} />}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Notifications tab (read-only audit log) ───────────────────────────────────
function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pagination, setPagination]       = useState<Pagination | null>(null)
  const [page, setPage]                   = useState(1)
  const [filterType, setFilterType]       = useState('')
  const [filterRead, setFilterRead]       = useState('')
  const [loading, setLoading]             = useState(true)
  const [selected, setSelected]           = useState<Notification | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (filterType) p.set('type', filterType)
      if (filterRead) p.set('isRead', filterRead)
      const res  = await apiClient.get(`/admin/notifications?${p}`)
      const data = unwrap<{ notifications?: Notification[]; pagination?: Pagination }>(res.data)
      setNotifications(data?.notifications ?? [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setNotifications([]) } finally { setLoading(false) }
  }, [page, filterType, filterRead])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  return (
    <>
      {selected && <NotificationPanel notification={selected} onClose={() => setSelected(null)} />}

      {/* Toolbar — filters only, no create button */}
      <div className="flex items-center gap-3 mb-6">
        <select value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1) }}
          className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
          <option value="">All Types</option>
          {NOTIF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterRead} onChange={e => { setFilterRead(e.target.value); setPage(1) }}
          className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
          <option value="">All</option>
          <option value="true">Read</option>
          <option value="false">Unread</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['User ID', 'Title', 'Type', 'Read', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[60, 200, 100, 60, 100].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : notifications.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <div className="w-16 h-16 bg-[#f3f4f6] rounded-[12px] flex items-center justify-center mx-auto mb-4">
                    <Notification01Icon size={28} color="#9ca3af" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No notifications yet</p>
                  <p className="text-[13px] text-[#4b5563] font-body mt-1">Notifications are triggered automatically by system events</p>
                </td></tr>
              ) : notifications.map(n => (
                <tr key={n.id} onClick={() => setSelected(n)}
                  className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors">
                  <td className="px-4 py-3.5"><span className="text-[13px] font-mono text-[#4b5563] font-body">#{n.user_id}</span></td>
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-medium text-[#111827] font-body max-w-[220px] truncate">{n.title}</p>
                    <p className="text-[11px] text-[#4b5563] font-body mt-0.5 max-w-[220px] truncate">{n.message}</p>
                  </td>
                  <td className="px-4 py-3.5"><TypeBadge type={n.type} /></td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold font-display ${n.is_read ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#f3f4f6] text-[#6b7280]'}`}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: n.is_read ? '#027a48' : '#9ca3af' }} />
                      {n.is_read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(n.created_at)}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.total_pages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">
              Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, pagination.total_elements)} of {pagination.total_elements.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.has_previous} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!pagination.has_next} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminAnnouncementsPage() {
  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements')

  const tabs = [
    { id: 'announcements' as const, label: 'Announcements' },
    { id: 'notifications' as const, label: 'Notifications' },
  ]

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111827] font-display">Announcements</h1>
        <p className="text-[13px] text-[#4b5563] font-body mt-0.5">Send announcements to students</p>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#f3f4f6]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-[13px] font-medium font-body border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#4b5563] hover:text-[#111827]'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'announcements' && <AnnouncementsTab />}
      {activeTab === 'notifications'  && <NotificationsTab />}
    </div>
  )
}
