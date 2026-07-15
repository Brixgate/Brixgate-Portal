'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Add01Icon, Cancel01Icon, Loading01Icon, AlertCircleIcon,
  Delete01Icon, ArrowDown01Icon, ArrowRight01Icon,
  ArrowLeft01Icon, File01Icon, BookOpen01Icon, VideoReplayIcon,
  Upload01Icon, Link01Icon, PencilEdit01Icon, Invoice01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Resource { id: number; title: string; type: string; link: string; status?: string }
interface Lesson   {
  id: number; title: string; content_type: string
  description?: string; duration?: number; order_index?: number
}
interface Module   { id: number; title: string; description?: string; order_index?: number; status?: string; lessons: Lesson[]; resources: Resource[] }
interface Program  { id: number; title: string; level?: string; status?: string; description?: string }

const CONTENT_TYPES   = ['VIDEO', 'ARTICLE', 'QUIZ']
const RESOURCE_TYPES  = ['PDF', 'VIDEO', 'ARTICLE', 'IMAGE', 'PRESENTATION', 'LECTURE']
const MODULE_STATUSES = ['DRAFT', 'PUBLISHED']

// ── Pricing types ─────────────────────────────────────────────────────────────
interface PricingBreakdown {
  id: number; currency: string
  basePrice?: number; base_price?: number
  finalPrice?: number; final_price?: number
}
interface PricingPlan {
  id: number; title?: string
  planType?: string; plan_type?: string
  status?: string; billingCycle?: string
  breakdowns?: PricingBreakdown[]
}
type PricingFormKey = 'title' | 'planType' | 'status' | 'ngn_base' | 'ngn_final' | 'usd_base' | 'usd_final' | 'gbp_base' | 'gbp_final'
type PricingForm = Record<PricingFormKey, string>

const PLAN_TYPE_BADGE: Record<string, string> = {
  INDIVIDUAL: 'bg-[#eff6ff] text-[#1d4ed8]',
  TEAM:       'bg-[#f5f3ff] text-[#6d28d9]',
  CORPORATE:  'bg-[#fffbeb] text-[#b45309]',
}
const PLAN_STATUS_BADGE: Record<string, string> = {
  ACTIVE:   'bg-[#ecfdf3] text-[#027a48]',
  INACTIVE: 'bg-[#f3f4f6] text-[#4b5563]',
  ARCHIVED: 'bg-[#f3f4f6] text-[#9ca3af]',
}
function fmtAmt(amount: number | undefined, currency: string) {
  if (amount === undefined || amount === null) return '—'
  const sym: Record<string, string> = { NGN: '₦', USD: '$', GBP: '£' }
  return `${sym[currency] ?? ''}${amount.toLocaleString('en-NG')}`
}

// ── Resource type badge ───────────────────────────────────────────────────────
function ResourceTypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    PDF: '#d51520', VIDEO: '#7c3aed', ARTICLE: '#0369a1',
    IMAGE: '#0d9488', PRESENTATION: '#d97706', LECTURE: '#374151',
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold font-display uppercase"
      style={{ background: colors[type] ? colors[type] + '18' : '#f3f4f6', color: colors[type] ?? '#374151' }}>
      {type}
    </span>
  )
}

// ── Shared form modal ─────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm delete modal ──────────────────────────────────────────────────────
function ConfirmModal({
  itemName, onConfirm, onCancel, deleting,
}: { itemName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4" onClick={onCancel}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-7 pb-5 text-center">
          <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center mx-auto mb-4">
            <Delete01Icon size={20} color="#d51520" strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-bold text-[#111827] font-display mb-2">Delete item?</h3>
          <p className="text-[13px] text-[#475467] font-body leading-[1.6]">
            <span className="font-semibold text-[#111827]">&ldquo;{itemName}&rdquo;</span> will be permanently deleted.
            This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body text-[#374151] hover:bg-[#f9fafb] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting}
            className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[#4b5563] font-body mt-1">{hint}</p>}
    </div>
  )
}
const inputCls  = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
const selectCls = `${inputCls} bg-white`
const textareaCls = 'w-full px-3 py-2.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none'

// ── Drag-and-drop file upload zone ────────────────────────────────────────────
function FileDropZone({
  onFileSelected, uploading, uploadedFileName, accept = '*/*',
}: {
  onFileSelected: (file: File) => void
  uploading: boolean
  uploadedFileName: string | null
  accept?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFileSelected(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed cursor-pointer transition-colors px-4 py-6 text-center ${
        dragging
          ? 'border-[#d51520] bg-[#fef2f2]'
          : uploadedFileName
          ? 'border-[#22c55e] bg-[#f0fdf4]'
          : 'border-[#e5e7eb] hover:border-[#d51520]/40 hover:bg-[#fafafa]'
      }`}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />

      {uploading ? (
        <>
          <Loading01Icon size={22} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-[#374151] font-body">Uploading…</p>
        </>
      ) : uploadedFileName ? (
        <>
          <div className="w-9 h-9 rounded-[8px] bg-[#dcfce7] flex items-center justify-center">
            <File01Icon size={18} color="#16a34a" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium text-[#16a34a] font-body truncate max-w-full">{uploadedFileName}</p>
          <p className="text-[11px] text-[#4b5563] font-body">Click to change file</p>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
            <Upload01Icon size={18} color="#4b5563" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#374151] font-body">
              Drag &amp; drop or <span className="text-[#d51520]">browse</span>
            </p>
            <p className="text-[11px] text-[#4b5563] font-body mt-0.5">PDF, Video, Images — up to 50MB</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Module list item ──────────────────────────────────────────────────────────
function ModuleItem({
  mod, programId, isSelected, onSelect, onRefresh,
}: {
  mod: Module; programId: string; isSelected: boolean
  onSelect: (m: Module) => void; onRefresh: () => void
}) {
  const [expanded, setExpanded]       = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function doDelete() {
    setDeleting(true)
    try { await apiClient.delete(`/admin/programs/${programId}/modules/${mod.id}`); onRefresh() }
    catch { /* silent */ } finally { setDeleting(false); setConfirmOpen(false) }
  }

  return (
    <>
      <div className={`border-b border-[#f3f4f6] last:border-0 transition-colors ${
        isSelected ? 'bg-[#fef2f2] border-l-2 border-l-[#d51520]' : 'bg-white hover:bg-[#f9fafb]'
      }`}>
        <div className="flex items-center gap-2 px-4 py-3.5 cursor-pointer"
          onClick={() => { setExpanded(e => !e); onSelect(mod) }}>
          {expanded
            ? <ArrowDown01Icon size={14} color="#4b5563" strokeWidth={2} />
            : <ArrowRight01Icon size={14} color="#4b5563" strokeWidth={2} />}
          <BookOpen01Icon size={14} color={isSelected ? '#d51520' : '#9ca3af'} strokeWidth={1.5} />
          <span className={`flex-1 text-[13px] font-semibold font-display truncate ${isSelected ? 'text-[#d51520]' : 'text-[#111827]'}`}>
            {mod.title}
          </span>
          <span className="text-[11px] text-[#4b5563] font-body flex-shrink-0">
            {mod.lessons.length}L · {mod.resources.length}R
          </span>
          <button onClick={e => { e.stopPropagation(); setConfirmOpen(true) }} disabled={deleting}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fef2f2] transition-colors flex-shrink-0 ml-1">
            {deleting
              ? <Loading01Icon size={11} className="animate-spin text-[#d51520]" strokeWidth={2} />
              : <Delete01Icon size={12} color="#4b5563" strokeWidth={1.5} />}
          </button>
        </div>

        {expanded && (
          <div className="px-4 pb-3 border-t border-[#f3f4f6] pt-2 space-y-1 bg-[#fafafa]">
            {mod.lessons.map(l => (
              <div key={l.id} className="flex items-center gap-2 py-1.5 pl-4 rounded-[6px]">
                <VideoReplayIcon size={11} color="#4b5563" strokeWidth={1.5} />
                <span className="text-[12px] text-[#374151] font-body flex-1 truncate">{l.title}</span>
                <span className="text-[10px] text-[#4b5563] font-body">{l.content_type}</span>
              </div>
            ))}
            {mod.resources.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 pl-4 rounded-[6px]">
                <File01Icon size={11} color="#4b5563" strokeWidth={1.5} />
                <span className="text-[12px] text-[#374151] font-body flex-1 truncate">{r.title}</span>
                <ResourceTypeIcon type={r.type} />
              </div>
            ))}
            {mod.lessons.length === 0 && mod.resources.length === 0 && (
              <p className="text-[11px] text-[#4b5563] font-body pl-4 py-1">No lessons or resources yet</p>
            )}
          </div>
        )}
      </div>

      {confirmOpen && (
        <ConfirmModal itemName={mod.title} onConfirm={doDelete}
          onCancel={() => setConfirmOpen(false)} deleting={deleting} />
      )}
    </>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ mod, programId, onRefresh }: { mod: Module | null; programId: string; onRefresh: () => void }) {
  // Lesson form state
  const [showAddLesson, setShowAddLesson]   = useState(false)
  const [editLesson, setEditLesson]         = useState<Lesson | null>(null)
  const [lessonForm, setLessonForm]         = useState({
    title: '', content_type: 'VIDEO', duration: '', description: '',
  })

  // Resource form state
  const [showAddResource, setShowAddResource] = useState(false)
  const [editResource, setEditResource]       = useState<Resource | null>(null)
  const [resourceForm, setResourceForm]       = useState({ title: '', type: 'PDF', link: '' })
  const [resourceMode, setResourceMode]       = useState<'url' | 'upload'>('url')
  const [uploadFile, setUploadFile]           = useState<File | null>(null)
  const [uploading, setUploading]             = useState(false)

  // Shared state
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')
  const [deletingLessonId, setDeletingLessonId]     = useState<number | null>(null)
  const [deletingResourceId, setDeletingResourceId] = useState<number | null>(null)
  const [confirmLesson, setConfirmLesson]     = useState<Lesson | null>(null)
  const [confirmResource, setConfirmResource] = useState<Resource | null>(null)

  const base = `/admin/programs/${programId}/modules/${mod?.id}`

  // ── Lesson handlers ────────────────────────────────────────────────────────
  async function addLesson(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!lessonForm.title.trim()) { setError('Title required.'); return }
    setSaving(true)
    try {
      await apiClient.post(`${base}/lessons`, {
        title:        lessonForm.title.trim(),
        content_type: lessonForm.content_type,
        description:  lessonForm.description.trim() || undefined,
        duration:     lessonForm.duration ? parseInt(lessonForm.duration) : undefined,
      })
      setShowAddLesson(false)
      setLessonForm({ title: '', content_type: 'VIDEO', duration: '', description: '' })
      onRefresh()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  async function saveEditLesson(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!lessonForm.title.trim()) { setError('Title required.'); return }
    setSaving(true)
    try {
      await apiClient.patch(`${base}/lessons/${editLesson!.id}`, {
        title:        lessonForm.title.trim(),
        content_type: lessonForm.content_type,
        description:  lessonForm.description.trim() || undefined,
        duration:     lessonForm.duration ? parseInt(lessonForm.duration) : undefined,
      })
      setEditLesson(null); onRefresh()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  async function doDeleteLesson() {
    if (!confirmLesson) return
    setDeletingLessonId(confirmLesson.id)
    try { await apiClient.delete(`${base}/lessons/${confirmLesson.id}`); onRefresh() }
    catch { /* silent */ } finally { setDeletingLessonId(null); setConfirmLesson(null) }
  }

  function openEditLesson(l: Lesson) {
    setLessonForm({
      title: l.title, content_type: l.content_type,
      duration: l.duration ? String(l.duration) : '',
      description: l.description ?? '',
    })
    setEditLesson(l); setError('')
  }

  // ── Resource handlers ──────────────────────────────────────────────────────
  async function handleFileUpload(file: File): Promise<string | null> {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      // NOTE: confirm the upload endpoint with the dev lead —
      // typical pattern: /admin/upload or /admin/resources/upload
      const res = await apiClient.post('/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const d = unwrap<{ url?: string; link?: string; file_url?: string }>(res.data)
      return d?.url ?? d?.link ?? d?.file_url ?? null
    } catch {
      setError('File upload failed. Please try the URL option instead.')
      return null
    } finally {
      setUploading(false)
    }
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!resourceForm.title.trim()) { setError('Title required.'); return }

    let link = resourceForm.link.trim()

    if (resourceMode === 'upload') {
      if (!uploadFile) { setError('Please select a file to upload.'); return }
      const uploaded = await handleFileUpload(uploadFile)
      if (!uploaded) return
      link = uploaded
    } else {
      if (!link) { setError('URL is required.'); return }
    }

    setSaving(true)
    try {
      await apiClient.post(`${base}/resources`, {
        title: resourceForm.title.trim(), type: resourceForm.type, link,
      })
      setShowAddResource(false)
      setResourceForm({ title: '', type: 'PDF', link: '' })
      setUploadFile(null); setResourceMode('url')
      onRefresh()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  async function saveEditResource(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!resourceForm.title.trim() || !resourceForm.link.trim()) { setError('Title and link required.'); return }
    setSaving(true)
    try {
      await apiClient.patch(`${base}/resources/${editResource!.id}`, {
        title: resourceForm.title.trim(), type: resourceForm.type, link: resourceForm.link.trim(),
      })
      setEditResource(null); onRefresh()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  async function doDeleteResource() {
    if (!confirmResource) return
    setDeletingResourceId(confirmResource.id)
    try { await apiClient.delete(`${base}/resources/${confirmResource.id}`); onRefresh() }
    catch { /* silent */ } finally { setDeletingResourceId(null); setConfirmResource(null) }
  }

  function openEditResource(r: Resource) {
    setResourceForm({ title: r.title, type: r.type, link: r.link })
    setResourceMode('url') // edit always uses URL (already have a URL)
    setEditResource(r); setError('')
  }

  function closeResourceModal() {
    setShowAddResource(false); setEditResource(null)
    setUploadFile(null); setResourceMode('url')
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!mod) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <BookOpen01Icon size={36} color="#e5e7eb" strokeWidth={1.5} className="mb-3" />
        <p className="text-[14px] font-semibold text-[#374151] font-display">Select a module</p>
        <p className="text-[13px] text-[#4b5563] font-body mt-1">Choose a module from the left to manage its content</p>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      {/* Module header */}
      <div className="pb-5 mb-5 border-b border-[#f3f4f6]">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-bold text-[#111827] font-display leading-[24px]">{mod.title}</h3>
          <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${
            mod.status === 'PUBLISHED' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fffbeb] text-[#b45309]'
          }`}>
            {mod.status ?? 'DRAFT'}
          </span>
        </div>
        {mod.description && (
          <p className="text-[14px] text-[#374151] font-body mt-2 leading-[1.7]">{mod.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[12px] text-[#4b5563] font-body">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
          <span className="text-[12px] text-[#4b5563] font-body">{mod.resources.length} resource{mod.resources.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Lessons */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#374151] font-display">Lessons</h4>
          <button
            onClick={() => { setLessonForm({ title: '', content_type: 'VIDEO', duration: '', description: '' }); setError(''); setShowAddLesson(true) }}
            className="flex items-center gap-1 text-[11px] text-[#d51520] font-medium font-display hover:underline">
            <Add01Icon size={11} strokeWidth={2} /> Add Lesson
          </button>
        </div>
        <div className="bg-white rounded-[8px] border border-[#f3f4f6] overflow-hidden">
          {mod.lessons.length === 0 ? (
            <p className="text-[13px] text-[#4b5563] font-body py-4 text-center">No lessons yet</p>
          ) : (
            mod.lessons.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-0 group hover:bg-[#f9fafb] transition-colors">
                <VideoReplayIcon size={14} color="#4b5563" strokeWidth={1.5} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111827] font-body truncate">{l.title}</p>
                  <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
                    {l.content_type}{l.duration ? ` · ${l.duration} min` : ''}
                    {l.description ? ` · Has description` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditLesson(l)}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#eff6ff] transition-colors" title="Edit lesson">
                    <Add01Icon size={11} color="#1d4ed8" strokeWidth={2} />
                  </button>
                  <button onClick={() => setConfirmLesson(l)} disabled={deletingLessonId === l.id}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fef2f2] transition-colors" title="Delete lesson">
                    {deletingLessonId === l.id
                      ? <Loading01Icon size={11} className="animate-spin text-[#d51520]" strokeWidth={2} />
                      : <Delete01Icon size={11} color="#d51520" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#374151] font-display">Resources</h4>
          <button
            onClick={() => { setResourceForm({ title: '', type: 'PDF', link: '' }); setError(''); setShowAddResource(true) }}
            className="flex items-center gap-1 text-[11px] text-[#d51520] font-medium font-display hover:underline">
            <Add01Icon size={11} strokeWidth={2} /> Add Resource
          </button>
        </div>
        <div className="bg-white rounded-[8px] border border-[#f3f4f6] overflow-hidden">
          {mod.resources.length === 0 ? (
            <p className="text-[13px] text-[#4b5563] font-body py-4 text-center">No resources yet</p>
          ) : (
            mod.resources.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-0 group hover:bg-[#f9fafb] transition-colors">
                <File01Icon size={14} color="#4b5563" strokeWidth={1.5} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111827] font-body truncate">{r.title}</p>
                  <p className="text-[12px] text-[#4b5563] font-body truncate">{r.link}</p>
                </div>
                <ResourceTypeIcon type={r.type} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditResource(r)}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#eff6ff] transition-colors" title="Edit resource">
                    <Add01Icon size={11} color="#1d4ed8" strokeWidth={2} />
                  </button>
                  <button onClick={() => setConfirmResource(r)} disabled={deletingResourceId === r.id}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fef2f2] transition-colors" title="Delete resource">
                    {deletingResourceId === r.id
                      ? <Loading01Icon size={11} className="animate-spin text-[#d51520]" strokeWidth={2} />
                      : <Delete01Icon size={11} color="#d51520" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Add / Edit lesson modal ────────────────────────────────────────── */}
      {(showAddLesson || editLesson) && (
        <Modal title={editLesson ? 'Edit Lesson' : 'Add Lesson'} onClose={() => { setShowAddLesson(false); setEditLesson(null) }}>
          <form onSubmit={editLesson ? saveEditLesson : addLesson} className="flex flex-col gap-4">
            <Field label="Title">
              <input value={lessonForm.title}
                onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Week 1: Introduction to Prompt Engineering"
                className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Content Type">
                <select value={lessonForm.content_type}
                  onChange={e => setLessonForm(p => ({ ...p, content_type: e.target.value }))}
                  className={selectCls}>
                  {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Duration (minutes)">
                <input type="number" value={lessonForm.duration}
                  onChange={e => setLessonForm(p => ({ ...p, duration: e.target.value }))}
                  placeholder="60" className={inputCls} />
              </Field>
            </div>

            <Field label="Description / Content" hint="Paragraphs, learning objectives, notes — supports plain text">
              <textarea
                value={lessonForm.description}
                onChange={e => setLessonForm(p => ({ ...p, description: e.target.value }))}
                rows={5}
                placeholder="In this lesson, students will learn how to craft effective prompts for large language models. We'll cover zero-shot prompting, few-shot examples, and chain-of-thought techniques…"
                className={textareaCls}
              />
            </Field>

            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowAddLesson(false); setEditLesson(null) }}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                {editLesson ? 'Save Changes' : 'Add Lesson'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Add / Edit resource modal ──────────────────────────────────────── */}
      {(showAddResource || editResource) && (
        <Modal title={editResource ? 'Edit Resource' : 'Add Resource'} onClose={closeResourceModal}>
          <form onSubmit={editResource ? saveEditResource : addResource} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Title">
                <input value={resourceForm.title}
                  onChange={e => setResourceForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Week 1 Slides" className={inputCls} />
              </Field>
              <Field label="Type">
                <select value={resourceForm.type}
                  onChange={e => setResourceForm(p => ({ ...p, type: e.target.value }))}
                  className={selectCls}>
                  {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>

            {/* URL vs Upload toggle — only for new resources */}
            {!editResource && (
              <div className="flex rounded-[8px] border border-[#e5e7eb] overflow-hidden">
                <button type="button"
                  onClick={() => { setResourceMode('url'); setUploadFile(null) }}
                  className={`flex-1 flex items-center justify-center gap-2 h-9 text-[12px] font-medium font-body transition-colors ${
                    resourceMode === 'url' ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#4b5563] hover:bg-[#f9fafb]'
                  }`}>
                  <Link01Icon size={13} strokeWidth={1.5} /> Paste URL
                </button>
                <button type="button"
                  onClick={() => setResourceMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 h-9 text-[12px] font-medium font-body transition-colors border-l border-[#e5e7eb] ${
                    resourceMode === 'upload' ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#4b5563] hover:bg-[#f9fafb]'
                  }`}>
                  <Upload01Icon size={13} strokeWidth={1.5} /> Upload File
                </button>
              </div>
            )}

            {/* URL input */}
            {(editResource || resourceMode === 'url') && (
              <Field label="Link / URL">
                <input value={resourceForm.link}
                  onChange={e => setResourceForm(p => ({ ...p, link: e.target.value }))}
                  placeholder="https://docs.google.com/… or https://drive.google.com/…"
                  className={inputCls} />
              </Field>
            )}

            {/* Drag-and-drop upload */}
            {!editResource && resourceMode === 'upload' && (
              <Field label="File">
                <FileDropZone
                  onFileSelected={setUploadFile}
                  uploading={uploading}
                  uploadedFileName={uploadFile?.name ?? null}
                />
              </Field>
            )}

            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={closeResourceModal}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">
                Cancel
              </button>
              <button type="submit" disabled={saving || uploading}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {(saving || uploading) && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                {editResource ? 'Save Changes' : 'Add Resource'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm delete modals */}
      {confirmLesson && (
        <ConfirmModal itemName={confirmLesson.title} onConfirm={doDeleteLesson}
          onCancel={() => setConfirmLesson(null)} deleting={deletingLessonId !== null} />
      )}
      {confirmResource && (
        <ConfirmModal itemName={confirmResource.title} onConfirm={doDeleteResource}
          onCancel={() => setConfirmResource(null)} deleting={deletingResourceId !== null} />
      )}
    </div>
  )
}

// ── Pricing plan modal (create / edit) ────────────────────────────────────────
const CURRENCY_ROWS = [
  { code: 'NGN', label: '₦ NGN', bk: 'ngn_base' as PricingFormKey, fk: 'ngn_final' as PricingFormKey },
  { code: 'USD', label: '$ USD', bk: 'usd_base' as PricingFormKey, fk: 'usd_final' as PricingFormKey },
  { code: 'GBP', label: '£ GBP', bk: 'gbp_base' as PricingFormKey, fk: 'gbp_final' as PricingFormKey },
] as const

function getBd(plan: PricingPlan | null, currency: string): { id?: number; base: string; final: string } {
  const bd = (plan?.breakdowns ?? []).find(b => b.currency === currency)
  return {
    id:    bd?.id,
    base:  String(bd?.basePrice  ?? bd?.base_price  ?? ''),
    final: String(bd?.finalPrice ?? bd?.final_price ?? ''),
  }
}

function PricingPlanModal({
  programId, plan, onClose, onSaved,
}: { programId: string; plan: PricingPlan | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = plan !== null
  const ngn = getBd(plan, 'NGN')
  const usd = getBd(plan, 'USD')
  const gbp = getBd(plan, 'GBP')

  const [form, setForm] = useState<PricingForm>({
    title: plan?.title ?? '', planType: plan?.planType ?? plan?.plan_type ?? 'INDIVIDUAL',
    status: plan?.status ?? 'ACTIVE',
    ngn_base: ngn.base, ngn_final: ngn.final,
    usd_base: usd.base, usd_final: usd.final,
    gbp_base: gbp.base, gbp_final: gbp.final,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setF(k: PricingFormKey, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Plan title is required.'); return }
    setSaving(true)
    try {
      let planId: number
      if (isEdit) {
        await apiClient.patch(`/admin/pricing-plans/${plan!.id}`, {
          title: form.title.trim(), planType: form.planType, status: form.status,
        })
        planId = plan!.id
      } else {
        const res   = await apiClient.post('/admin/pricing-plans', {
          programId: parseInt(programId), title: form.title.trim(),
          planType: form.planType, status: form.status, billingCycle: 'ONEOFF',
        })
        const raw   = res.data as Record<string, unknown>
        const inner = (raw?.data ?? raw) as Record<string, unknown>
        planId = inner?.id as number
        if (!planId) throw new Error('Plan created but ID not returned')
      }

      const bdMap: Record<string, { id?: number; base: string; final: string }> = {
        NGN: ngn, USD: usd, GBP: gbp,
      }
      await Promise.all(CURRENCY_ROWS.map(c => {
        const base  = form[c.bk]  ? parseFloat(form[c.bk])  : undefined
        const final = form[c.fk]  ? parseFloat(form[c.fk])  : undefined
        if (base === undefined && final === undefined) return Promise.resolve()
        const payload = { currency: c.code, basePrice: base, base_price: base, finalPrice: final, final_price: final }
        const existing = bdMap[c.code]
        return existing.id
          ? apiClient.patch(`/admin/pricing-plans/${planId}/breakdowns/${existing.id}`, payload)
          : apiClient.post(`/admin/pricing-plans/${planId}/breakdowns`, payload)
      }))
      onSaved()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const clsIn = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6] flex-shrink-0">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{isEdit ? 'Edit Pricing Plan' : 'New Pricing Plan'}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Plan Title</label>
              <input value={form.title} onChange={e => setF('title', e.target.value)}
                placeholder="Individual Plan" className={clsIn} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Plan Type</label>
              <select value={form.planType} onChange={e => setF('planType', e.target.value)} className={`${clsIn} bg-white`}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="TEAM">Team</option>
                <option value="CORPORATE">Corporate</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
            <select value={form.status} onChange={e => setF('status', e.target.value)} className={`${clsIn} bg-white`}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#374151] font-display mb-2">Prices by Currency</p>
            <div className="rounded-[8px] border border-[#e5e7eb] overflow-hidden">
              <div className="grid grid-cols-[100px_1fr_1fr] bg-[#f9fafb] border-b border-[#e5e7eb]">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display">Currency</div>
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display border-l border-[#e5e7eb]">Base Price</div>
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display border-l border-[#e5e7eb]">Final Price</div>
              </div>
              {CURRENCY_ROWS.map((c, i) => (
                <div key={c.code} className={`grid grid-cols-[100px_1fr_1fr] ${i < 2 ? 'border-b border-[#e5e7eb]' : ''}`}>
                  <div className="px-3 py-2.5 flex items-center">
                    <span className="text-[12px] font-semibold text-[#111827] font-body">{c.label}</span>
                  </div>
                  <div className="border-l border-[#e5e7eb] px-2 py-1.5">
                    <input type="number" min="0" value={form[c.bk]} onChange={e => setF(c.bk, e.target.value)}
                      placeholder="0.00" className="w-full h-8 px-2 text-[12px] font-body text-[#111827] outline-none rounded-[4px] bg-transparent focus:bg-[#f9fafb]" />
                  </div>
                  <div className="border-l border-[#e5e7eb] px-2 py-1.5">
                    <input type="number" min="0" value={form[c.fk]} onChange={e => setF(c.fk, e.target.value)}
                      placeholder="0.00" className="w-full h-8 px-2 text-[12px] font-body text-[#111827] outline-none rounded-[4px] bg-transparent focus:bg-[#f9fafb]" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#4b5563] font-body mt-1">Leave a row empty to skip that currency. Billing is One-off.</p>
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
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              {isEdit ? 'Save Changes' : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Pricing tab ────────────────────────────────────────────────────────────────
function PricingTab({ programId }: { programId: string }) {
  const [plans, setPlans]           = useState<PricingPlan[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editPlan, setEditPlan]     = useState<PricingPlan | null>(null)
  const [deletePlan, setDeletePlan] = useState<PricingPlan | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get(`/admin/pricing-plans?program_id=${programId}`)
      const raw = unwrap<Record<string, PricingPlan[]> | PricingPlan[]>(res.data)
      const list: PricingPlan[] = []
      if (Array.isArray(raw)) {
        list.push(...raw)
      } else if (raw && typeof raw === 'object') {
        Object.values(raw as Record<string, unknown>).forEach(v => {
          if (Array.isArray(v)) list.push(...(v as PricingPlan[]))
        })
      }
      setPlans(list)
    } catch { setPlans([]) } finally { setLoading(false) }
  }, [programId])

  useEffect(() => { load() }, [load])

  async function doDelete() {
    if (!deletePlan) return
    setDeleting(true); setDeleteError('')
    try {
      await apiClient.delete(`/admin/pricing-plans/${deletePlan.id}`)
      setPlans(prev => prev.filter(p => p.id !== deletePlan.id))
      setDeletePlan(null)
    } catch (err) { setDeleteError(getApiError(err)) } finally { setDeleting(false) }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-[#4b5563] font-body">
          {loading ? 'Loading…' : `${plans.length} pricing plan${plans.length !== 1 ? 's' : ''}`}
        </p>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={13} strokeWidth={2} /> New Plan
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[88px] bg-[#f9fafb] rounded-[10px] animate-pulse" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mx-auto mb-4">
            <Invoice01Icon size={28} color="#9ca3af" strokeWidth={1.5} />
          </div>
          <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No pricing plans yet</p>
          <p className="text-[13px] text-[#4b5563] font-body max-w-[280px] mx-auto">Set up pricing so students can enrol in this programme</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-4 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
            Add Pricing Plan
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map(plan => {
            const pt  = plan.planType ?? plan.plan_type ?? 'INDIVIDUAL'
            const st  = plan.status ?? 'ACTIVE'
            const bds = plan.breakdowns ?? []
            return (
              <div key={plan.id} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-[14px] font-semibold text-[#111827] font-display">{plan.title ?? '—'}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display flex-shrink-0 ${PLAN_TYPE_BADGE[pt] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {pt.charAt(0) + pt.slice(1).toLowerCase()}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display flex-shrink-0 ${PLAN_STATUS_BADGE[st] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {st.charAt(0) + st.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-5 flex-wrap">
                      {bds.length === 0 ? (
                        <span className="text-[12px] text-[#9ca3af] font-body">No prices set</span>
                      ) : bds.map(bd => {
                        const base  = bd.basePrice  ?? bd.base_price
                        const final = bd.finalPrice ?? bd.final_price
                        return (
                          <div key={bd.id} className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-[#4b5563] font-body">{bd.currency}</span>
                            <span className="text-[14px] font-bold text-[#111827] font-display">{fmtAmt(final, bd.currency)}</span>
                            {base !== undefined && base !== final && (
                              <span className="text-[11px] text-[#9ca3af] font-body line-through">{fmtAmt(base, bd.currency)}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-[11px] text-[#9ca3af] font-body mt-2">One-off billing</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setEditPlan(plan)}
                      className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors" title="Edit plan">
                      <PencilEdit01Icon size={13} color="#4b5563" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => { setDeleteError(''); setDeletePlan(plan) }}
                      className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#fef2f2] transition-colors" title="Delete plan">
                      <Delete01Icon size={13} color="#d51520" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showCreate || editPlan !== null) && (
        <PricingPlanModal
          programId={programId}
          plan={editPlan}
          onClose={() => { setShowCreate(false); setEditPlan(null) }}
          onSaved={() => { setShowCreate(false); setEditPlan(null); load() }}
        />
      )}

      {deletePlan && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={() => setDeletePlan(null)}>
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
              <Delete01Icon size={18} color="#d51520" strokeWidth={1.5} />
            </div>
            <h2 className="text-[15px] font-bold text-[#111827] font-display mb-1">Delete Pricing Plan?</h2>
            <p className="text-[13px] text-[#4b5563] font-body mb-5">
              <span className="font-semibold text-[#374151]">{deletePlan.title}</span> and all its price breakdowns will be permanently deleted.
            </p>
            {deleteError && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body mb-3">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setDeletePlan(null)}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">Cancel</button>
              <button onClick={doDelete} disabled={deleting}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Cohort types (for cohorts tab) ────────────────────────────────────────────
interface ApiCohort {
  id: number; title: string; status?: string
  start_date?: string; startDate?: string
  end_date?: string;   endDate?: string
  max_students?: number; maxStudents?: number
  enrolled_count?: number; enrolledCount?: number
  learning_format?: string; learningFormat?: string
  frequency?: string
}
interface ApiCohortCreate {
  program_id: string; title: string
  start_date: string; end_date: string
  status: string; max_students: string
  learning_format: string; frequency: string
}

const COHORT_STATUS_STYLE: Record<string, string> = {
  OPEN:     'bg-[#ecfdf3] text-[#027a48]',
  UPCOMING: 'bg-[#eff6ff] text-[#1d4ed8]',
  CLOSED:   'bg-[#f3f4f6] text-[#4b5563]',
}
function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Cohorts tab ───────────────────────────────────────────────────────────────
function CohortsTab({ programId }: { programId: string }) {
  const router = useRouter()
  const [cohorts, setCohorts]         = useState<ApiCohort[]>([])
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]   = useState(false)
  const [editCohort, setEditCohort]   = useState<ApiCohort | null>(null)
  const [deleteCohort, setDeleteCohort] = useState<ApiCohort | null>(null)
  const [form, setForm]               = useState<ApiCohortCreate>({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30', learning_format: '', frequency: '' })
  const [saving, setSaving]           = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [formError, setFormError]     = useState('')

  const clsInput = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white'

  function setF(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiClient.get(`/admin/programs/${programId}/cohorts?size=50`)
      const data = unwrap<{ cohorts?: ApiCohort[] }>(res.data)
      setCohorts(Array.isArray(data?.cohorts) ? data.cohorts : [])
    } catch { setCohorts([]) } finally { setLoading(false) }
  }, [programId])

  useEffect(() => { load() }, [load])

  async function createCohort(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.start_date || !form.end_date) { setFormError('Start and end dates required.'); return }
    setSaving(true)
    try {
      await apiClient.post(`/admin/programs/${programId}/cohorts`, {
        title:           form.title.trim(),
        startDate:       form.start_date,  start_date:   form.start_date,
        endDate:         form.end_date,    end_date:     form.end_date,
        status:          form.status,
        maxStudents:     parseInt(form.max_students) || 30,
        max_students:    parseInt(form.max_students) || 30,
        learningFormat:  form.learning_format || undefined,
        learning_format: form.learning_format || undefined,
        frequency:       form.frequency       || undefined,
      })
      setShowCreate(false)
      setForm({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30', learning_format: '', frequency: '' })
      load()
    } catch (err) { setFormError(getApiError(err)) } finally { setSaving(false) }
  }

  async function saveCohortEdit(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!editCohort) return
    setSaving(true)
    try {
      await apiClient.patch(`/admin/cohorts/${editCohort.id}`, {
        title:           form.title.trim(),
        startDate:       form.start_date,  start_date:   form.start_date,
        endDate:         form.end_date,    end_date:     form.end_date,
        status:          form.status,
        maxStudents:     parseInt(form.max_students) || 30,
        max_students:    parseInt(form.max_students) || 30,
        learningFormat:  form.learning_format || undefined,
        learning_format: form.learning_format || undefined,
        frequency:       form.frequency       || undefined,
      })
      setEditCohort(null)
      load()
    } catch (err) { setFormError(getApiError(err)) } finally { setSaving(false) }
  }

  async function doDeleteCohort() {
    if (!deleteCohort) return
    setDeleting(true)
    try {
      await apiClient.delete(`/admin/cohorts/${deleteCohort.id}`)
      setCohorts(prev => prev.filter(c => c.id !== deleteCohort.id))
      setDeleteCohort(null)
    } catch (err) { setFormError(getApiError(err)) } finally { setDeleting(false) }
  }

  function openEdit(c: ApiCohort) {
    setForm({
      program_id:      programId,
      title:           c.title,
      start_date:      c.start_date      ?? c.startDate      ?? '',
      end_date:        c.end_date        ?? c.endDate        ?? '',
      status:          c.status          ?? 'UPCOMING',
      max_students:    String(c.max_students ?? c.maxStudents ?? 30),
      learning_format: c.learning_format ?? c.learningFormat ?? '',
      frequency:       c.frequency       ?? '',
    })
    setFormError('')
    setEditCohort(c)
  }

  const cohortFormModal = (isEdit: boolean) => (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={() => isEdit ? setEditCohort(null) : setShowCreate(false)}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{isEdit ? 'Edit Cohort' : 'New Cohort'}</h2>
          <button onClick={() => isEdit ? setEditCohort(null) : setShowCreate(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={isEdit ? saveCohortEdit : createCohort} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Cohort Title</label>
            <input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="AI Prompt Engineering — Cohort 3" className={clsInput} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} className={clsInput} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">End Date</label>
              <input type="date" value={form.end_date} onChange={e => setF('end_date', e.target.value)} className={clsInput} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
              <select value={form.status} onChange={e => setF('status', e.target.value)} className={clsInput}>
                {['UPCOMING', 'OPEN', 'CLOSED'].map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Max Students</label>
              <input type="number" value={form.max_students} onChange={e => setF('max_students', e.target.value)} placeholder="30" className={clsInput} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Learning Format</label>
              <select value={form.learning_format} onChange={e => setF('learning_format', e.target.value)} className={clsInput}>
                <option value="">Select format…</option>
                <option value="LIVE">Live Session</option>
                <option value="ONLINE">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Frequency</label>
              <select value={form.frequency} onChange={e => setF('frequency', e.target.value)} className={clsInput}>
                <option value="">Select frequency…</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>
          {formError && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {formError}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => isEdit ? setEditCohort(null) : setShowCreate(false)}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              {isEdit ? 'Save Changes' : 'Create Cohort'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[13px] text-[#4b5563] font-body">
          {loading ? 'Loading…' : `${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}`}
        </p>
        <button onClick={() => { setForm({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30', learning_format: '', frequency: '' }); setFormError(''); setShowCreate(true) }}
          className="flex items-center gap-1.5 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={13} strokeWidth={2} /> New Cohort
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 bg-[#f9fafb] rounded-[8px] animate-pulse" />
          ))}
        </div>
      ) : cohorts.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen01Icon size={28} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-[#111827] font-display">No cohorts yet</p>
          <p className="text-[13px] text-[#4b5563] font-body mt-1">Create the first cohort for this programme</p>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[#eaecf0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Cohort', 'Status', 'Start Date', 'End Date', 'Students', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map(c => (
                <tr key={c.id}
                  onClick={() => router.push(`/admin/cohorts/${c.id}`)}
                  className="border-b border-[#f3f4f6] hover:bg-[#fafafa] cursor-pointer transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-semibold text-[#111827] font-display">{c.title}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.status
                      ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${COHORT_STATUS_STYLE[c.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                          {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
                        </span>
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] font-body">{formatDate(c.start_date)}</td>
                  <td className="px-4 py-3.5 text-[13px] text-[#4b5563] font-body">{formatDate(c.end_date)}</td>
                  <td className="px-4 py-3.5 text-[13px] font-medium text-[#111827] font-body">
                    {c.enrolled_count ?? 0} / {c.max_students ?? '—'}
                  </td>
                  {/* Inline actions */}
                  <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
                        title="Edit cohort"
                      >
                        <PencilEdit01Icon size={13} color="#4b5563" strokeWidth={1.5} />
                      </button>
                      <button
                        onClick={() => setDeleteCohort(c)}
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#fef2f2] transition-colors"
                        title="Delete cohort"
                      >
                        <Delete01Icon size={13} color="#d51520" strokeWidth={1.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && cohortFormModal(false)}
      {editCohort  && cohortFormModal(true)}

      {/* Delete cohort confirm */}
      {deleteCohort && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={() => setDeleteCohort(null)}>
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
              <Delete01Icon size={18} color="#d51520" strokeWidth={1.5} />
            </div>
            <h2 className="text-[15px] font-bold text-[#111827] font-display mb-1">Delete Cohort?</h2>
            <p className="text-[13px] text-[#4b5563] font-body mb-5">
              <span className="font-semibold text-[#374151]">{deleteCohort.title}</span> will be permanently deleted. This cannot be undone.
            </p>
            {formError && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body mb-3">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {formError}
              </p>
            )}
            <div className="flex gap-2">
              <button onClick={() => setDeleteCohort(null)}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
                Cancel
              </button>
              <button onClick={doDeleteCohort} disabled={deleting}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type PageTab = 'Cohorts' | 'Pricing' | 'General Curriculum'

export default function ProgramDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const programId = params.programId as string

  const [program, setProgram]       = useState<Program | null>(null)
  const [modules, setModules]       = useState<Module[]>([])
  const [selected, setSelected]     = useState<Module | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<PageTab>('Cohorts')
  const [showAddMod, setShowAddMod] = useState(false)
  const [modForm, setModForm]       = useState({ title: '', description: '', status: 'DRAFT' })
  const [modSaving, setModSaving]   = useState(false)
  const [modError, setModError]     = useState('')

  const fetchModules = useCallback(async () => {
    try {
      const [progRes, modRes] = await Promise.allSettled([
        apiClient.get(`/admin/programs/${programId}`),
        apiClient.get(`/admin/programs/${programId}/modules`),
      ])
      if (progRes.status === 'fulfilled') setProgram(unwrap<Program>(progRes.value.data))
      if (modRes.status === 'fulfilled') {
        const data = unwrap<{ modules?: Module[] } | Module[]>(modRes.value.data)
        const list = Array.isArray(data) ? data : (data as { modules?: Module[] })?.modules ?? []
        setModules(list)
        if (selected) {
          const refreshed = list.find(m => m.id === selected.id)
          if (refreshed) setSelected(refreshed)
        }
      }
    } finally { setLoading(false) }
  }, [programId, selected])

  useEffect(() => { fetchModules() }, [programId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function addModule(e: React.FormEvent) {
    e.preventDefault(); setModError('')
    if (!modForm.title.trim()) { setModError('Title required.'); return }
    setModSaving(true)
    try {
      await apiClient.post(`/admin/programs/${programId}/modules`, {
        title:       modForm.title.trim(),
        description: modForm.description.trim() || undefined,
        status:      modForm.status,
      })
      setShowAddMod(false)
      setModForm({ title: '', description: '', status: 'DRAFT' })
      fetchModules()
    } catch (err) { setModError(getApiError(err)) } finally { setModSaving(false) }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        <button onClick={() => router.push('/admin/programs')}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          {loading
            ? <div className="h-5 w-48 bg-[#f3f4f6] rounded animate-pulse" />
            : <h1 className="text-[16px] font-bold text-[#111827] font-display truncate">{program?.title ?? 'Programme'}</h1>
          }
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">
            {activeTab === 'Cohorts' ? 'Cohorts running this programme' : 'General curriculum — modules, lessons & resources'}
          </p>
        </div>
        {activeTab === 'General Curriculum' && (
          <button onClick={() => setShowAddMod(true)}
            className="flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
            <Add01Icon size={14} strokeWidth={2} /> Add Module
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        {(['Cohorts', 'Pricing', 'General Curriculum'] as PageTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#4b5563] hover:text-[#374151]'
            }`}>
            {tab === 'Cohorts'            && <BookOpen01Icon size={14} strokeWidth={1.5} />}
            {tab === 'Pricing'            && <Invoice01Icon  size={14} strokeWidth={1.5} />}
            {tab === 'General Curriculum' && <File01Icon     size={14} strokeWidth={1.5} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'Cohorts' && (
        <div className="flex-1 overflow-y-auto bg-[#f9fafb]">
          <CohortsTab programId={programId} />
        </div>
      )}

      {activeTab === 'Pricing' && (
        <div className="flex-1 overflow-y-auto bg-[#f9fafb]">
          <PricingTab programId={programId} />
        </div>
      )}

      {activeTab === 'General Curriculum' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: module list */}
          <div className="w-[300px] flex-shrink-0 bg-white border-r border-[#f3f4f6] overflow-y-auto flex flex-col">
            <div className="px-4 py-3 border-b border-[#f3f4f6]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4b5563] font-display">
                {modules.length} Module{modules.length !== 1 ? 's' : ''}
              </p>
            </div>
            {loading ? (
              <div className="flex flex-col">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 border-b border-[#f3f4f6] flex items-center px-4 gap-3">
                    <div className="h-4 bg-[#f3f4f6] rounded animate-pulse flex-1" />
                  </div>
                ))}
              </div>
            ) : modules.length === 0 ? (
              <div className="text-center py-12 px-4">
                <BookOpen01Icon size={28} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-2" />
                <p className="text-[13px] text-[#4b5563] font-body">No modules yet</p>
              </div>
            ) : (
              modules.map(m => (
                <ModuleItem key={m.id} mod={m} programId={programId}
                  isSelected={selected?.id === m.id}
                  onSelect={setSelected} onRefresh={fetchModules} />
              ))
            )}
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 bg-white overflow-hidden">
            <DetailPanel mod={selected} programId={programId} onRefresh={fetchModules} />
          </div>
        </div>
      )}

      {/* Add module modal */}
      {showAddMod && (
        <Modal title="Add Module" onClose={() => setShowAddMod(false)}>
          <form onSubmit={addModule} className="flex flex-col gap-4">
            <Field label="Module Title">
              <input value={modForm.title}
                onChange={e => setModForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Week 1: Introduction to AI"
                className={inputCls} />
            </Field>
            <Field label="Description">
              <textarea value={modForm.description}
                onChange={e => setModForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="What students will learn…"
                className={textareaCls} />
            </Field>
            <Field label="Status">
              <select value={modForm.status}
                onChange={e => setModForm(p => ({ ...p, status: e.target.value }))}
                className={selectCls}>
                {MODULE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {modError && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {modError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddMod(false)}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">
                Cancel
              </button>
              <button type="submit" disabled={modSaving}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {modSaving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Add Module
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
