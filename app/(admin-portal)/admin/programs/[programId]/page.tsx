'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Add01Icon, Cancel01Icon, Loading01Icon, AlertCircleIcon,
  Delete01Icon, ArrowDown01Icon, ArrowRight01Icon,
  ArrowLeft01Icon, File01Icon, BookOpen01Icon, VideoReplayIcon,
  Upload01Icon, Link01Icon, PencilEdit01Icon,
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
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
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
      {hint && <p className="text-[11px] text-[#6b7280] font-body mt-1">{hint}</p>}
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
          <p className="text-[11px] text-[#6b7280] font-body">Click to change file</p>
        </>
      ) : (
        <>
          <div className="w-9 h-9 rounded-[8px] bg-[#f3f4f6] flex items-center justify-center">
            <Upload01Icon size={18} color="#6b7280" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#374151] font-body">
              Drag &amp; drop or <span className="text-[#d51520]">browse</span>
            </p>
            <p className="text-[11px] text-[#6b7280] font-body mt-0.5">PDF, Video, Images — up to 50MB</p>
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
            ? <ArrowDown01Icon size={14} color="#6b7280" strokeWidth={2} />
            : <ArrowRight01Icon size={14} color="#6b7280" strokeWidth={2} />}
          <BookOpen01Icon size={14} color={isSelected ? '#d51520' : '#9ca3af'} strokeWidth={1.5} />
          <span className={`flex-1 text-[13px] font-medium font-body truncate ${isSelected ? 'text-[#d51520]' : 'text-[#111827]'}`}>
            {mod.title}
          </span>
          <span className="text-[11px] text-[#9ca3af] font-body flex-shrink-0">
            {mod.lessons.length}L · {mod.resources.length}R
          </span>
          <button onClick={e => { e.stopPropagation(); setConfirmOpen(true) }} disabled={deleting}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fef2f2] transition-colors flex-shrink-0 ml-1">
            {deleting
              ? <Loading01Icon size={11} className="animate-spin text-[#d51520]" strokeWidth={2} />
              : <Delete01Icon size={12} color="#9ca3af" strokeWidth={1.5} />}
          </button>
        </div>

        {expanded && (
          <div className="px-4 pb-3 border-t border-[#f3f4f6] pt-2 space-y-1 bg-[#fafafa]">
            {mod.lessons.map(l => (
              <div key={l.id} className="flex items-center gap-2 py-1.5 pl-4 rounded-[6px]">
                <VideoReplayIcon size={11} color="#6b7280" strokeWidth={1.5} />
                <span className="text-[12px] text-[#374151] font-body flex-1 truncate">{l.title}</span>
                <span className="text-[10px] text-[#9ca3af] font-body">{l.content_type}</span>
              </div>
            ))}
            {mod.resources.map(r => (
              <div key={r.id} className="flex items-center gap-2 py-1.5 pl-4 rounded-[6px]">
                <File01Icon size={11} color="#6b7280" strokeWidth={1.5} />
                <span className="text-[12px] text-[#374151] font-body flex-1 truncate">{r.title}</span>
                <ResourceTypeIcon type={r.type} />
              </div>
            ))}
            {mod.lessons.length === 0 && mod.resources.length === 0 && (
              <p className="text-[11px] text-[#6b7280] font-body pl-4 py-1">No lessons or resources yet</p>
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
        <p className="text-[13px] text-[#6b7280] font-body mt-1">Choose a module from the left to manage its content</p>
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
          <span className="text-[12px] text-[#6b7280] font-body">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
          <span className="text-[12px] text-[#6b7280] font-body">{mod.resources.length} resource{mod.resources.length !== 1 ? 's' : ''}</span>
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
            <p className="text-[13px] text-[#6b7280] font-body py-4 text-center">No lessons yet</p>
          ) : (
            mod.lessons.map(l => (
              <div key={l.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-0 group hover:bg-[#f9fafb] transition-colors">
                <VideoReplayIcon size={14} color="#9ca3af" strokeWidth={1.5} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111827] font-body truncate">{l.title}</p>
                  <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
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
            <p className="text-[13px] text-[#6b7280] font-body py-4 text-center">No resources yet</p>
          ) : (
            mod.resources.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f3f4f6] last:border-0 group hover:bg-[#f9fafb] transition-colors">
                <File01Icon size={14} color="#9ca3af" strokeWidth={1.5} className="flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[#111827] font-body truncate">{r.title}</p>
                  <p className="text-[12px] text-[#6b7280] font-body truncate">{r.link}</p>
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
                    resourceMode === 'url' ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#6b7280] hover:bg-[#f9fafb]'
                  }`}>
                  <Link01Icon size={13} strokeWidth={1.5} /> Paste URL
                </button>
                <button type="button"
                  onClick={() => setResourceMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 h-9 text-[12px] font-medium font-body transition-colors border-l border-[#e5e7eb] ${
                    resourceMode === 'upload' ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#6b7280] hover:bg-[#f9fafb]'
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

// ── Cohort types (for cohorts tab) ────────────────────────────────────────────
interface ApiCohort { id: number; title: string; status?: string; start_date?: string; end_date?: string; max_students?: number; enrolled_count?: number }
interface ApiCohortCreate { program_id: string; title: string; start_date: string; end_date: string; status: string; max_students: string }

const COHORT_STATUS_STYLE: Record<string, string> = {
  OPEN:     'bg-[#ecfdf3] text-[#027a48]',
  UPCOMING: 'bg-[#eff6ff] text-[#1d4ed8]',
  CLOSED:   'bg-[#f3f4f6] text-[#6b7280]',
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
  const [form, setForm]               = useState<ApiCohortCreate>({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30' })
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
        title: form.title.trim(), start_date: form.start_date, end_date: form.end_date,
        status: form.status, max_students: parseInt(form.max_students) || 30,
      })
      setShowCreate(false)
      setForm({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30' })
      load()
    } catch (err) { setFormError(getApiError(err)) } finally { setSaving(false) }
  }

  async function saveCohortEdit(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!editCohort) return
    setSaving(true)
    try {
      await apiClient.patch(`/admin/cohorts/${editCohort.id}`, {
        title:        form.title.trim(),
        start_date:   form.start_date,
        end_date:     form.end_date,
        status:       form.status,
        max_students: parseInt(form.max_students) || 30,
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
      program_id:   programId,
      title:        c.title,
      start_date:   c.start_date ?? '',
      end_date:     c.end_date   ?? '',
      status:       c.status     ?? 'UPCOMING',
      max_students: String(c.max_students ?? 30),
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
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
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
        <p className="text-[13px] text-[#6b7280] font-body">
          {loading ? 'Loading…' : `${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}`}
        </p>
        <button onClick={() => { setForm({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30' }); setFormError(''); setShowCreate(true) }}
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
          <p className="text-[13px] text-[#6b7280] font-body mt-1">Create the first cohort for this programme</p>
        </div>
      ) : (
        <div className="rounded-[10px] border border-[#eaecf0] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Cohort', 'Status', 'Start Date', 'End Date', 'Students', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">{h}</th>
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
                  <td className="px-4 py-3.5 text-[13px] text-[#6b7280] font-body">{formatDate(c.start_date)}</td>
                  <td className="px-4 py-3.5 text-[13px] text-[#6b7280] font-body">{formatDate(c.end_date)}</td>
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
                        <PencilEdit01Icon size={13} color="#6b7280" strokeWidth={1.5} />
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
            <p className="text-[13px] text-[#6b7280] font-body mb-5">
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
type PageTab = 'Cohorts' | 'Curriculum'

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
          <p className="text-[13px] text-[#6b7280] font-body mt-0.5">
            {activeTab === 'Cohorts' ? 'Cohorts running this programme' : 'Master curriculum — modules, lessons & resources'}
          </p>
        </div>
        {activeTab === 'Curriculum' && (
          <button onClick={() => setShowAddMod(true)}
            className="flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
            <Add01Icon size={14} strokeWidth={2} /> Add Module
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        {(['Cohorts', 'Curriculum'] as PageTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#6b7280] hover:text-[#374151]'
            }`}>
            {tab === 'Cohorts'    && <BookOpen01Icon size={14} strokeWidth={1.5} />}
            {tab === 'Curriculum' && <File01Icon     size={14} strokeWidth={1.5} />}
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

      {activeTab === 'Curriculum' && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left: module list */}
          <div className="w-[300px] flex-shrink-0 bg-white border-r border-[#f3f4f6] overflow-y-auto flex flex-col">
            <div className="px-4 py-3 border-b border-[#f3f4f6]">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9ca3af] font-display">
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
                <p className="text-[13px] text-[#6b7280] font-body">No modules yet</p>
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
