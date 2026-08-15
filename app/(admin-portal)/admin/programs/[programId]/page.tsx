'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Add01Icon, Cancel01Icon, Loading01Icon, AlertCircleIcon,
  Delete01Icon, ArrowDown01Icon, ArrowRight01Icon,
  ArrowLeft01Icon, File01Icon, BookOpen01Icon, VideoReplayIcon,
  Upload01Icon, Link01Icon, PencilEdit01Icon, Invoice01Icon,
  Payment01Icon, CheckmarkCircle01Icon, Building04Icon,
  EyeIcon, Download01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import { useToast, ToastContainer } from '@/components/shared/Toast'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Resource { id: number; title: string; type: string; link: string; status?: string }
interface Lesson   {
  id: number; title: string; content_type: string
  description?: string; duration?: number; order_index?: number
}
interface Module   { id: number; title: string; description?: string; order_index?: number; status?: string; lessons: Lesson[]; resources: Resource[] }
interface Program {
  id: number; title: string; slug?: string; type?: string
  status?: string; level?: string
  description?: string; subtitle?: string
  duration?: string; flexibility?: string; languages?: string
  main_price?: number; final_price?: number
  discounted_amount?: number; discounted_percent?: number
  brochure_url?: string; sample_certificate_url?: string
  auto_percent_completion?: number
  created_at?: string; updated_at?: string; published_at?: string
  // JSON-string content fields
  audience?: string; outcomes?: string; skills?: string
  faqs?: string; projects?: string; key_features?: string
  partners?: string; testimonials?: string; tools?: string
  images?: string; includes_summary?: string; demand?: string
  eligibility?: string; application_process?: string
}

const CONTENT_TYPES   = ['VIDEO', 'ARTICLE', 'QUIZ']
const RESOURCE_TYPES  = ['PDF', 'VIDEO', 'ARTICLE', 'IMAGE', 'PRESENTATION', 'LECTURE']
const MODULE_STATUSES = ['DRAFT', 'PUBLISHED']

// ── Pricing types ─────────────────────────────────────────────────────────────
interface PricingBreakdown {
  id?: number; breakdownId?: number; breakdown_id?: number
  currency: string
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
  mod, programId, isSelected, onSelect, onRefresh, onEdit,
}: {
  mod: Module; programId: string; isSelected: boolean
  onSelect: (m: Module) => void; onRefresh: () => void; onEdit: (m: Module) => void
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
          <button onClick={e => { e.stopPropagation(); onEdit(mod) }}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0 ml-1">
            <PencilEdit01Icon size={12} color="#4b5563" strokeWidth={1.5} />
          </button>
          <button onClick={e => { e.stopPropagation(); setConfirmOpen(true) }} disabled={deleting}
            className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fef2f2] transition-colors flex-shrink-0">
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
  // Cohort assignment state (for new resource modal only)
  const [cohortOptions, setCohortOptions]         = useState<{ id: number; title: string }[]>([])
  const [loadingCohorts, setLoadingCohorts]       = useState(false)
  const [cohortFetchError, setCohortFetchError]   = useState('')
  const [selectedCohortIds, setSelectedCohortIds] = useState<Set<number>>(new Set())
  // Shared state
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')
  const [deletingLessonId, setDeletingLessonId]     = useState<number | null>(null)
  const [deletingResourceId, setDeletingResourceId] = useState<number | null>(null)
  const [confirmLesson, setConfirmLesson]     = useState<Lesson | null>(null)
  const [confirmResource, setConfirmResource] = useState<Resource | null>(null)
  // Resource preview
  const [previewResource, setPreviewResource] = useState<{ id: number; title: string; s3Url: string; contentType: string } | null>(null)
  const [previewingId, setPreviewingId]       = useState<number | null>(null)
  const { toasts, toast, removeToast }        = useToast()

  async function getPresignedUrl(id: number): Promise<{ url: string; contentType: string }> {
    const res = await apiClient.get(`/program-resources/${id}/download`)
    const body = res.data as Record<string, unknown>
    const inner = (body?.data ?? body) as Record<string, unknown>
    const url = (inner?.url ?? inner?.link ?? body?.url) as string | undefined
    if (!url) throw new Error('No download URL in response')
    return { url, contentType: ((inner?.content_type ?? inner?.contentType ?? '') as string) }
  }

  async function openPreview(r: Resource) {
    if (previewingId === r.id) return
    setPreviewingId(r.id)
    try {
      const { url, contentType } = await getPresignedUrl(r.id)
      // Use the pre-signed S3 URL directly in the iframe/img src — no fetch() needed.
      // <iframe src> and <img src> are simple resource loads, not CORS requests,
      // so the S3 bucket's CORS policy doesn't block them.
      setPreviewResource({ id: r.id, title: r.title, s3Url: url, contentType })
    } catch (e) {
      toast.error('Preview failed: ' + getApiError(e))
    } finally {
      setPreviewingId(null)
    }
  }

  function closePreview() { setPreviewResource(null) }

  async function downloadResource(r: Resource) {
    try {
      const { url } = await getPresignedUrl(r.id)
      window.open(url, '_blank')
    } catch (e) { toast.error('Download failed: ' + getApiError(e)) }
  }

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

  // Fetch cohorts whenever the add-resource modal opens.
  // Try programme-specific first; if empty, fall back to all programmes.
  useEffect(() => {
    if (!showAddResource) return
    setLoadingCohorts(true)
    setCohortFetchError('')
    async function loadCohorts() {
      try {
        // 1. Try cohorts scoped to this programme
        const res  = await apiClient.get(`/admin/programs/${programId}/cohorts?size=100`)
        const data = unwrap<{ cohorts?: { id: number; title: string }[] }>(res.data)
        const list = Array.isArray(data?.cohorts) ? data.cohorts : []

        if (list.length > 0) { setCohortOptions(list); return }

        // 2. Fallback: fetch all programmes then pull their cohorts in parallel
        const progsRes  = await apiClient.get('/admin/programs?size=50')
        const progsData = unwrap<{ programs?: { id: number }[] }>(progsRes.data)
        const progs     = Array.isArray(progsData?.programs) ? progsData.programs : []

        const results = await Promise.allSettled(
          progs.map(p => apiClient.get(`/admin/programs/${p.id}/cohorts?size=50`))
        )
        const all: { id: number; title: string }[] = []
        results.forEach(r => {
          if (r.status !== 'fulfilled') return
          const d = unwrap<{ cohorts?: { id: number; title: string }[] }>(r.value.data)
          if (Array.isArray(d?.cohorts)) all.push(...d.cohorts)
        })
        // deduplicate by id
        const seen = new Set<number>()
        setCohortOptions(all.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true }))
      } catch (err) {
        setCohortFetchError(getApiError(err))
        setCohortOptions([])
      } finally {
        setLoadingCohorts(false)
      }
    }
    loadCohorts()
  }, [showAddResource, programId])

  // ── Resource handlers ──────────────────────────────────────────────────────
  const MAX_FILE_BYTES = 20 * 1024 * 1024 // 20 MB

  async function addResource(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!resourceForm.title.trim()) { setError('Title required.'); return }

    setSaving(true)
    try {
      let resourceId: number | undefined

      if (resourceMode === 'upload') {
        if (!uploadFile) { setError('Please select a file to upload.'); return }
        if (uploadFile.size > MAX_FILE_BYTES) {
          setError('File exceeds the 20 MB limit. Please choose a smaller file.')
          return
        }
        const formData = new FormData()
        formData.append('file', uploadFile)
        formData.append('program_id', programId)
        formData.append('program_module_id', String(mod!.id))
        formData.append('title', resourceForm.title.trim())
        formData.append('type', resourceForm.type)
        formData.append('status', 'PUBLISHED')
        const res = await apiClient.post('/program-resources', formData)
        const raw = (res.data?.data ?? res.data) as Record<string, unknown>
        resourceId = (
          raw?.id ??
          (raw?.programResource as Record<string, unknown>)?.id ??
          (raw?.program_resource as Record<string, unknown>)?.id ??
          (raw?.resource as Record<string, unknown>)?.id
        ) as number | undefined
      } else {
        const link = resourceForm.link.trim()
        if (!link) { setError('URL is required.'); return }
        const res = await apiClient.post(`${base}/resources`, {
          title: resourceForm.title.trim(), type: resourceForm.type, link, status: 'PUBLISHED',
        })
        const raw = (res.data?.data ?? res.data) as Record<string, unknown>
        resourceId = (
          raw?.id ??
          (raw?.programResource as Record<string, unknown>)?.id ??
          (raw?.program_resource as Record<string, unknown>)?.id ??
          (raw?.resource as Record<string, unknown>)?.id
        ) as number | undefined
      }

      // Assign to each selected cohort — best-effort, never blocks success
      if (selectedCohortIds.size > 0) {
        if (!resourceId) {
          toast.error('Resource was saved but the server did not return an ID — cohort assignment was skipped. Contact support if the resource does not appear for students.')
        } else {
          const assignResults = await Promise.allSettled(
            Array.from(selectedCohortIds).map(cohortId =>
              apiClient.post(`/admin/cohorts/${cohortId}/resources`, {
                program_resource_id: resourceId,
                status: 'ACTIVE',
              })
            )
          )
          const failed = assignResults.filter(r => r.status === 'rejected')
          if (failed.length > 0 && failed.length < assignResults.length) {
            toast.error(`Resource saved, but ${failed.length} cohort assignment${failed.length > 1 ? 's' : ''} failed. Re-upload to retry.`)
          } else if (failed.length === assignResults.length) {
            toast.error(`Resource saved, but cohort assignment failed for all ${failed.length} cohort${failed.length > 1 ? 's' : ''}. Ensure the cohort IDs are correct and try again.`)
          } else {
            toast.success(`Resource uploaded and assigned to ${assignResults.length} cohort${assignResults.length > 1 ? 's' : ''}.`)
          }
        }
      }

      setShowAddResource(false)
      setResourceForm({ title: '', type: 'PDF', link: '' })
      setUploadFile(null); setResourceMode('url')
      setSelectedCohortIds(new Set())
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
    setSelectedCohortIds(new Set()); setCohortFetchError('')
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
                  <p className="text-[12px] text-[#4b5563] font-body truncate">{r.type}</p>
                </div>
                <ResourceTypeIcon type={r.type} />
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openPreview(r)} disabled={previewingId === r.id}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#ecfdf3] transition-colors" title="Preview">
                    {previewingId === r.id
                      ? <Loading01Icon size={11} className="animate-spin text-[#059669]" strokeWidth={2} />
                      : <EyeIcon size={11} color="#059669" strokeWidth={1.5} />}
                  </button>
                  <button onClick={() => downloadResource(r)}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#eff6ff] transition-colors" title="Download">
                    <Download01Icon size={11} color="#1d4ed8" strokeWidth={1.5} />
                  </button>
                  <button onClick={() => openEditResource(r)}
                    className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#f3f4f6] transition-colors" title="Edit resource">
                    <PencilEdit01Icon size={11} color="#4b5563" strokeWidth={1.5} />
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
                  placeholder="https://drive.google.com/uc?export=download&id=FILE_ID"
                  className={inputCls} />
                <p className="text-[11px] text-[#6b7280] font-body mt-1.5 leading-relaxed">
                  Google Drive: use a <strong>direct download</strong> link —{' '}
                  <code className="bg-[#f3f4f6] px-1 rounded text-[10px]">drive.google.com/uc?export=download&amp;id=FILE_ID</code>
                  , not a viewer link. The server rejects viewer/share links.
                </p>
              </Field>
            )}

            {/* Drag-and-drop upload */}
            {!editResource && resourceMode === 'upload' && (
              <Field label="File">
                <FileDropZone
                  onFileSelected={setUploadFile}
                  uploading={saving}
                  uploadedFileName={uploadFile?.name ?? null}
                />
              </Field>
            )}

            {/* Cohort assignment — only for new resources */}
            {!editResource && (
              <Field label={`Assign to Cohorts${selectedCohortIds.size > 0 ? ` (${selectedCohortIds.size} selected)` : ' (optional)'}`}>
                {loadingCohorts ? (
                  <p className="text-[12px] text-[#9ca3af] font-body">Loading cohorts…</p>
                ) : cohortFetchError ? (
                  <p className="text-[12px] text-[#d51520] font-body">{cohortFetchError}</p>
                ) : cohortOptions.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af] font-body">No cohorts found. Create a cohort under the Cohorts tab first.</p>
                ) : (
                  <div className="border border-[#e5e7eb] rounded-[8px] overflow-hidden">
                    {/* Select / deselect all */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[#f9fafb] border-b border-[#e5e7eb]">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9ca3af] font-display">
                        {cohortOptions.length} cohort{cohortOptions.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedCohortIds(
                          selectedCohortIds.size === cohortOptions.length
                            ? new Set()
                            : new Set(cohortOptions.map(c => c.id))
                        )}
                        className="text-[11px] text-[#d51520] font-medium font-body hover:underline"
                      >
                        {selectedCohortIds.size === cohortOptions.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    {/* Scrollable list */}
                    <div className="max-h-[180px] overflow-y-auto divide-y divide-[#f3f4f6]">
                      {cohortOptions.map(c => {
                        const checked = selectedCohortIds.has(c.id)
                        return (
                          <label
                            key={c.id}
                            className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#f9fafb] cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setSelectedCohortIds(prev => {
                                const next = new Set(prev)
                                if (checked) { next.delete(c.id) } else { next.add(c.id) }
                                return next
                              })}
                              className="w-4 h-4 rounded border-[#d0d5dd] accent-[#d51520] cursor-pointer flex-shrink-0"
                            />
                            <span className="text-[13px] text-[#374151] font-body leading-snug">{c.title}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
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
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {(saving) && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
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

      {/* Resource preview modal */}
      {previewResource && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#e5e7eb] shadow-sm flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <File01Icon size={15} color="#4b5563" strokeWidth={1.5} className="flex-shrink-0" />
              <p className="text-[14px] font-semibold text-[#111827] font-display truncate">{previewResource.title}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => window.open(previewResource.s3Url, '_blank')}
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f3f4f6] transition-colors">
                <Download01Icon size={13} color="#374151" strokeWidth={1.5} />
                Download
              </button>
              <button onClick={closePreview}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
                <Cancel01Icon size={16} color="#374151" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-[#1a1a1a] flex items-center justify-center">
            {previewResource.contentType.includes('pdf') || previewResource.title.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewResource.s3Url)}&embedded=true`}
                className="w-full h-full border-0"
                title={previewResource.title}
              />
            ) : previewResource.contentType.startsWith('image/') ? (
              <img src={previewResource.s3Url} alt={previewResource.title} className="max-w-full max-h-full object-contain p-8" />
            ) : (
              <div className="text-center text-white px-6">
                <File01Icon size={40} color="#6b7280" strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-[15px] font-semibold font-display mb-1">Preview not available</p>
                <p className="text-[13px] text-[#9ca3af] font-body">This file type cannot be previewed in the browser. Use the Download button above to open it.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
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
          program_id: parseInt(programId), title: form.title.trim(),
          plan_type: form.planType, status: form.status, billing_cycle: 'ONEOFF',
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

// ── Payment options ────────────────────────────────────────────────────────────
interface PaymentOptionInstallment {
  installment_number?: number; installmentNumber?: number
  amount_type?: string; amountType?: string
  amount_value?: number; amountValue?: number
  due_offset_days?: number; dueOffsetDays?: number
}
interface PaymentOption {
  id: number
  title?: string
  payment_mode?: string; paymentMode?: string
  payment_interval?: string; paymentInterval?: string
  installment_calculation_type?: string; installmentCalculationType?: string
  number_of_installments?: number; numberOfInstallments?: number
  grace_period_days?: number; gracePeriodDays?: number
  suspend_access_on_overdue?: boolean; suspendAccessOnOverdue?: boolean
  status?: string; is_active?: boolean; isActive?: boolean
  installments?: PaymentOptionInstallment[]
}

interface InstallmentDef { amount_type: 'FIXED_AMOUNT' | 'PERCENTAGE'; amount_value: string; due_offset_days: string }

function PaymentOptionsModal({ planId, breakdown, planTitle, onClose }: {
  planId: number
  breakdown: PricingBreakdown
  planTitle: string
  onClose: () => void
}) {
  const [options,     setOptions]     = useState<PaymentOption[]>([])
  const [loading,     setLoading]     = useState(true)
  const [creating,    setCreating]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [toggling,    setToggling]    = useState<number | null>(null)
  const [error,       setError]       = useState('')
  const [expandedOpt, setExpandedOpt] = useState<number | null>(null)

  // Form state
  const [mode,             setMode]             = useState<'FULL' | 'FIXED_INSTALLMENT' | 'FLEXIBLE_PART_PAYMENT'>('FULL')
  const [calcType,         setCalcType]         = useState<'EQUAL' | 'CUSTOM'>('EQUAL')
  const [numInstallments,  setNumInstallments]  = useState('3')
  const [paymentInterval,  setPaymentInterval]  = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY')
  const [graceDays,        setGraceDays]        = useState('5')
  const [suspendOnOverdue, setSuspendOnOverdue] = useState(true)
  const [customInsts,      setCustomInsts]      = useState<InstallmentDef[]>([
    { amount_type: 'FIXED_AMOUNT', amount_value: '', due_offset_days: '0' },
    { amount_type: 'FIXED_AMOUNT', amount_value: '', due_offset_days: '' },
  ])

  const bdId = breakdown.id ?? breakdown.breakdownId ?? breakdown.breakdown_id

  const loadOptions = useCallback(async () => {
    if (!bdId) { setError('Breakdown ID missing — cannot load options.'); setLoading(false); return }
    setLoading(true)
    try {
      const res = await apiClient.get(`/admin/pricing-plans/${planId}/breakdowns/${bdId}/payment-options`)
      const raw = res.data
      const inner = raw?.data ?? raw
      const list: PaymentOption[] = Array.isArray(inner)
        ? inner
        : Array.isArray(inner?.payment_options) ? inner.payment_options
        : Array.isArray(inner?.options)          ? inner.options
        : Array.isArray(inner?.content)          ? inner.content
        : Array.isArray(inner?.data)             ? inner.data
        : []
      setOptions(list)
    } catch (e) { setError(getApiError(e)) } finally { setLoading(false) }
  }, [planId, bdId])

  useEffect(() => { loadOptions() }, [loadOptions])

  function addCustomRow() {
    setCustomInsts(p => [...p, { amount_type: 'PERCENTAGE', amount_value: '', due_offset_days: '' }])
  }

  function updateCustomRow(i: number, field: keyof InstallmentDef, value: string) {
    setCustomInsts(p => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r))
  }

  function removeCustomRow(i: number) {
    setCustomInsts(p => p.filter((_, idx) => idx !== i))
  }

  async function handleCreate() {
    if (!bdId) { setError('Breakdown ID missing — cannot save option.'); return }
    setSaving(true); setError('')
    try {
      const payload: Record<string, unknown> = {
        title:                    planTitle,
        payment_mode:             mode,
        status:                   'ACTIVE',
        grace_period_days:        Number(graceDays) || 5,
        suspend_access_on_overdue: suspendOnOverdue,
      }
      if (mode !== 'FULL') {
        payload.payment_interval              = paymentInterval
        payload.installment_calculation_type  = calcType
        if (calcType === 'CUSTOM') {
          payload.number_of_installments = customInsts.length
          payload.installments = customInsts.map((r, i) => ({
            installment_number: i + 1,
            amount_type:        r.amount_type,
            amount_value:       parseFloat(r.amount_value) || 0,
            due_offset_days:    Number(r.due_offset_days) || 0,
          }))
        } else {
          payload.number_of_installments = Number(numInstallments) || 3
        }
      }
      await apiClient.post(`/admin/pricing-plans/${planId}/breakdowns/${bdId}/payment-options`, payload)
      setCreating(false)
      await loadOptions()
    } catch (e) { setError(getApiError(e)) } finally { setSaving(false) }
  }

  async function handleToggle(opt: PaymentOption) {
    setToggling(opt.id)
    const isActive = opt.is_active ?? opt.isActive ?? opt.status === 'ACTIVE'
    try {
      if (isActive) {
        await apiClient.patch(`/admin/pricing-plans/${planId}/breakdowns/${bdId}/payment-options/${opt.id}/disable`)
      } else {
        await apiClient.patch(`/admin/pricing-plans/${planId}/breakdowns/${bdId}/payment-options/${opt.id}/enable`)
      }
      await loadOptions()
    } catch { /* ignore */ } finally { setToggling(null) }
  }

  async function handleDelete(optId: number) {
    try {
      await apiClient.delete(`/admin/pricing-plans/${planId}/breakdowns/${bdId}/payment-options/${optId}`)
      await loadOptions()
    } catch { /* ignore */ }
  }

  const MODE_LABELS: Record<string, string> = {
    FULL: 'Full Payment', FIXED_INSTALLMENT: 'Fixed Installments', FLEXIBLE_PART_PAYMENT: 'Flexible Part Payment',
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={!saving ? onClose : undefined} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[560px] max-h-[86vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6] flex items-start justify-between flex-shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-[#111827] font-display">Payment Options</h3>
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
              {breakdown.currency} breakdown — define how students can pay
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors flex-shrink-0">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Existing options */}
          <div className="px-6 pt-5">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loading01Icon size={20} className="animate-spin" color="#9ca3af" strokeWidth={1.5} />
              </div>
            ) : options.length === 0 && !creating ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mx-auto mb-3">
                  <Payment01Icon size={22} color="#9ca3af" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-semibold text-[#374151] font-display mb-0.5">No payment options yet</p>
                <p className="text-[12px] text-[#9ca3af] font-body">Add at least one option so students can pay at enrolment.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {options.map(opt => {
                  const isActive   = opt.is_active ?? opt.isActive ?? opt.status === 'ACTIVE'
                  const modeLabel  = MODE_LABELS[opt.payment_mode ?? opt.paymentMode ?? ''] ?? (opt.payment_mode ?? opt.paymentMode ?? '—')
                  const instCount  = opt.number_of_installments ?? opt.numberOfInstallments
                  const grace      = opt.grace_period_days ?? opt.gracePeriodDays
                  const interval   = opt.payment_interval ?? opt.paymentInterval
                  const calcType   = opt.installment_calculation_type ?? opt.installmentCalculationType
                  const insts      = opt.installments ?? []
                  const isExpanded = expandedOpt === opt.id
                  return (
                    <div key={opt.id} className="rounded-[8px] border border-[#eaecf0] overflow-hidden">
                      {/* Header row */}
                      <div
                        className="flex items-center justify-between gap-3 p-4 bg-[#fafafa] cursor-pointer hover:bg-[#f3f4f6] transition-colors"
                        onClick={() => setExpandedOpt(isExpanded ? null : opt.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] font-semibold text-[#111827] font-display">{modeLabel}</p>
                            {instCount && (
                              <span className="text-[10px] font-semibold bg-[#eff6ff] text-[#1d4ed8] px-2 py-0.5 rounded-full font-display">
                                {instCount} instalments
                              </span>
                            )}
                            {interval && (
                              <span className="text-[10px] font-semibold bg-[#f0fdf4] text-[#15803d] px-2 py-0.5 rounded-full font-display">
                                {interval}
                              </span>
                            )}
                            {grace != null && (
                              <span className="text-[10px] text-[#6b7280] font-body">{grace}d grace</span>
                            )}
                          </div>
                          {(opt.suspend_access_on_overdue ?? opt.suspendAccessOnOverdue) && (
                            <p className="text-[11px] text-amber-600 font-body mt-0.5">Suspends access on overdue</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleToggle(opt)}
                            disabled={toggling === opt.id}
                            className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${isActive ? 'bg-[#d51520]' : 'bg-[#d1d5db]'} disabled:opacity-60`}
                            title={isActive ? 'Disable' : 'Enable'}
                          >
                            {toggling === opt.id
                              ? <Loading01Icon size={12} className="absolute inset-0 m-auto animate-spin" color="white" strokeWidth={2} />
                              : <span className={`absolute top-0.5 left-0 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                            }
                          </button>
                          <button onClick={() => handleDelete(opt.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#fef2f2] transition-colors">
                            <Delete01Icon size={13} color="#d51520" strokeWidth={1.5} />
                          </button>
                          <ArrowDown01Icon size={14} color="#9ca3af" strokeWidth={2}
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <div className="px-4 py-4 bg-white border-t border-[#f3f4f6] flex flex-col gap-3">
                          {/* Key-value summary */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">Payment Mode</p>
                              <p className="text-[12px] font-medium text-[#111827] font-body">{modeLabel}</p>
                            </div>
                            {interval && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">Payment Interval</p>
                                <p className="text-[12px] font-medium text-[#111827] font-body">{interval}</p>
                              </div>
                            )}
                            {calcType && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">Calculation Type</p>
                                <p className="text-[12px] font-medium text-[#111827] font-body">{calcType === 'CUSTOM' ? 'Custom amounts' : 'Equal splits'}</p>
                              </div>
                            )}
                            {instCount && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">No. of Instalments</p>
                                <p className="text-[12px] font-medium text-[#111827] font-body">{instCount}</p>
                              </div>
                            )}
                            {grace != null && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">Grace Period</p>
                                <p className="text-[12px] font-medium text-[#111827] font-body">{grace} day{grace !== 1 ? 's' : ''}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">Suspend on Overdue</p>
                              <p className="text-[12px] font-medium text-[#111827] font-body">
                                {(opt.suspend_access_on_overdue ?? opt.suspendAccessOnOverdue) ? 'Yes' : 'No'}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-0.5">Status</p>
                              <p className={`text-[12px] font-semibold font-body ${isActive ? 'text-[#15803d]' : 'text-[#6b7280]'}`}>
                                {isActive ? 'Active' : 'Inactive'}
                              </p>
                            </div>
                          </div>

                          {/* Instalment schedule table */}
                          {insts.length > 0 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-[#9ca3af] font-display mb-2">Instalment Schedule</p>
                              <div className="rounded-[6px] border border-[#f3f4f6] overflow-hidden">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                                      {['#', 'Type', 'Amount', 'Due (days after enrol)'].map(h => (
                                        <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] font-display">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {insts.map((inst, i) => {
                                      const num   = inst.installment_number ?? inst.installmentNumber ?? (i + 1)
                                      const type  = inst.amount_type ?? inst.amountType ?? '—'
                                      const val   = inst.amount_value ?? inst.amountValue
                                      const due   = inst.due_offset_days ?? inst.dueOffsetDays
                                      return (
                                        <tr key={i} className="border-b border-[#f3f4f6] last:border-0">
                                          <td className="px-3 py-2 text-[12px] text-[#374151] font-body">{num}</td>
                                          <td className="px-3 py-2 text-[12px] text-[#374151] font-body">{type === 'FIXED_AMOUNT' ? '₦ Fixed' : '%'}</td>
                                          <td className="px-3 py-2 text-[12px] font-semibold text-[#111827] font-body">
                                            {val != null ? (type === 'FIXED_AMOUNT' ? `₦${Number(val).toLocaleString('en-NG')}` : `${val}%`) : '—'}
                                          </td>
                                          <td className="px-3 py-2 text-[12px] text-[#374151] font-body">{due != null ? `Day ${due}` : '—'}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Create form */}
          {creating && (
            <div className="px-6 pb-2">
              <div className="border border-[#eaecf0] rounded-[10px] p-5 bg-white flex flex-col gap-4">
                <p className="text-[13px] font-bold text-[#111827] font-display">New Payment Option</p>

                {/* Payment mode */}
                <div>
                  <p className="text-[11px] font-medium text-[#374151] font-body mb-2">Payment Mode</p>
                  <div className="flex flex-col gap-1.5">
                    {(['FULL', 'FIXED_INSTALLMENT', 'FLEXIBLE_PART_PAYMENT'] as const).map(m => (
                      <button key={m} onClick={() => setMode(m)}
                        className={`flex items-center gap-2.5 h-10 px-3 rounded-[8px] border text-left text-[13px] font-medium font-display transition-colors ${
                          mode === m ? 'border-[#d51520] bg-[#fef2f2] text-[#d51520]' : 'border-[#e5e7eb] bg-white text-[#374151] hover:bg-[#f9fafb]'
                        }`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${mode === m ? 'border-[#d51520]' : 'border-[#d1d5db]'}`}>
                          {mode === m && <div className="w-2 h-2 rounded-full bg-[#d51520]" />}
                        </div>
                        {MODE_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>

                {mode !== 'FULL' && (
                  <>
                    {/* Payment interval */}
                    <div>
                      <p className="text-[11px] font-medium text-[#374151] font-body mb-1.5">Payment Interval</p>
                      <div className="flex gap-2">
                        {(['MONTHLY', 'WEEKLY'] as const).map(iv => (
                          <button key={iv} onClick={() => setPaymentInterval(iv)}
                            className={`flex-1 h-9 rounded-[8px] text-[12px] font-semibold font-display border transition-colors ${
                              paymentInterval === iv ? 'bg-[#fef2f2] border-[#fecdca] text-[#d51520]' : 'bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                            }`}>
                            {iv === 'MONTHLY' ? 'Monthly' : 'Weekly'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculation type */}
                    <div>
                      <p className="text-[11px] font-medium text-[#374151] font-body mb-1.5">Installment Calculation</p>
                      <div className="flex gap-2">
                        {(['EQUAL', 'CUSTOM'] as const).map(t => (
                          <button key={t} onClick={() => setCalcType(t)}
                            className={`flex-1 h-9 rounded-[8px] text-[12px] font-semibold font-display border transition-colors ${
                              calcType === t ? 'bg-[#fef2f2] border-[#fecdca] text-[#d51520]' : 'bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                            }`}>
                            {t === 'EQUAL' ? 'Equal splits' : 'Custom amounts'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {calcType === 'EQUAL' && (
                      <div>
                        <p className="text-[11px] font-medium text-[#374151] font-body mb-1.5">Number of Installments</p>
                        <input type="number" min="2" max="24" value={numInstallments} onChange={e => setNumInstallments(e.target.value)}
                          className="w-full h-9 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] focus:outline-none focus:border-[#d51520]" />
                      </div>
                    )}

                    {calcType === 'CUSTOM' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-medium text-[#374151] font-body">Installment Schedule</p>
                          <p className="text-[10px] text-[#9ca3af] font-body">{customInsts.length} installment{customInsts.length !== 1 ? 's' : ''}</p>
                        </div>
                        {/* Column headers */}
                        <div className="flex items-center gap-2 mb-1 px-0.5">
                          <span className="w-5 flex-shrink-0" />
                          <span className="text-[10px] text-[#9ca3af] font-body" style={{ width: '80px', flexShrink: 0 }}>Type</span>
                          <span className="text-[10px] text-[#9ca3af] font-body flex-1">Amount</span>
                          <span className="text-[10px] text-[#9ca3af] font-body flex-1">Due (days after enrol)</span>
                          <span className="w-4 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col gap-2">
                          {customInsts.map((row, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-[11px] text-[#9ca3af] font-body w-5 flex-shrink-0 text-center">{i + 1}.</span>
                              <select value={row.amount_type} onChange={e => updateCustomRow(i, 'amount_type', e.target.value)}
                                className="h-8 px-2 border border-[#e5e7eb] rounded-[6px] text-[11px] font-body text-[#374151] focus:outline-none focus:border-[#d51520]"
                                style={{ width: '80px', flexShrink: 0 }}>
                                <option value="FIXED_AMOUNT">₦ Fixed</option>
                                <option value="PERCENTAGE">%</option>
                              </select>
                              <input type="number" min="0" value={row.amount_value} onChange={e => updateCustomRow(i, 'amount_value', e.target.value)}
                                placeholder={row.amount_type === 'PERCENTAGE' ? '30' : '50000'}
                                className="flex-1 h-8 px-2 border border-[#e5e7eb] rounded-[6px] text-[12px] font-body text-[#111827] focus:outline-none focus:border-[#d51520]" />
                              <input type="number" min="0" value={row.due_offset_days} onChange={e => updateCustomRow(i, 'due_offset_days', e.target.value)}
                                placeholder="e.g. 0 or 30"
                                className="flex-1 h-8 px-2 border border-[#e5e7eb] rounded-[6px] text-[12px] font-body text-[#111827] focus:outline-none focus:border-[#d51520]" />
                              {customInsts.length > 1 && (
                                <button onClick={() => removeCustomRow(i)} className="flex-shrink-0">
                                  <Cancel01Icon size={13} color="#d51520" strokeWidth={2} />
                                </button>
                              )}
                            </div>
                          ))}
                          <button onClick={addCustomRow}
                            className="flex items-center gap-1 text-[11px] font-semibold text-[#d51520] font-display hover:opacity-80 mt-0.5">
                            <Add01Icon size={12} strokeWidth={2} /> Add installment
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Grace + suspend */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-[#374151] font-body mb-1.5">Grace Period (days)</p>
                    <input type="number" min="0" value={graceDays} onChange={e => setGraceDays(e.target.value)}
                      className="w-full h-9 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] focus:outline-none focus:border-[#d51520]" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <button onClick={() => setSuspendOnOverdue(p => !p)}
                      className="flex items-center gap-2 h-9 px-3 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium font-body text-[#374151] hover:bg-[#f9fafb] transition-colors">
                      <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all ${suspendOnOverdue ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db]'}`}>
                        {suspendOnOverdue && <CheckmarkCircle01Icon size={10} color="white" strokeWidth={2} />}
                      </div>
                      Suspend on overdue
                    </button>
                  </div>
                </div>

                {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}</p>}

                <div className="flex gap-2">
                  <button onClick={() => { setCreating(false); setError('') }}
                    className="flex-1 h-9 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleCreate} disabled={saving}
                    className="flex-1 h-9 rounded-[8px] bg-[#d51520] text-[12px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                    {saving && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
                    Save Option
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!creating && (
          <div className="px-6 py-4 border-t border-[#f3f4f6] flex-shrink-0">
            <button onClick={() => { setCreating(true); setError('') }}
              className="w-full flex items-center justify-center gap-1.5 h-9 rounded-[8px] border border-dashed border-[#d51520] text-[12px] font-semibold font-display text-[#d51520] hover:bg-[#fef2f2] transition-colors">
              <Add01Icon size={13} strokeWidth={2} /> Add Payment Option
            </button>
          </div>
        )}
      </div>
    </>
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
  // { planId, breakdown } — opens the payment options modal for a specific breakdown
  const [payOptTarget, setPayOptTarget] = useState<{ planId: number; breakdown: PricingBreakdown; planTitle: string } | null>(null)

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

      // Fetch each plan's detail to get breakdowns (list endpoint omits them)
      const details = await Promise.allSettled(
        list.map(p => apiClient.get(`/admin/pricing-plans/${p.id}`))
      )
      const enriched = list.map((p, i) => {
        const r = details[i]
        if (r.status === 'fulfilled') {
          const d = r.value.data
          const full = (d?.data ?? d) as PricingPlan
          const bds = Array.isArray(full?.breakdowns) ? full.breakdowns : (p.breakdowns ?? [])
          return { ...p, breakdowns: bds }
        }
        return p
      })
      setPlans(enriched)
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
                    {/* Payment options per breakdown */}
                    {bds.length > 0 && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {bds.map(bd => (
                          <button
                            key={bd.id}
                            onClick={() => setPayOptTarget({ planId: plan.id, breakdown: bd, planTitle: plan.title ?? '' })}
                            className="flex items-center gap-1.5 h-7 px-2.5 rounded-[6px] border border-[#e5e7eb] text-[11px] font-semibold font-display text-[#374151] hover:bg-[#f9fafb] hover:border-[#d51520] hover:text-[#d51520] transition-colors"
                          >
                            <Payment01Icon size={11} strokeWidth={1.5} />
                            {bd.currency} Payment Options
                          </button>
                        ))}
                      </div>
                    )}
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

      {payOptTarget && (
        <PaymentOptionsModal
          planId={payOptTarget.planId}
          breakdown={payOptTarget.breakdown}
          planTitle={payOptTarget.planTitle}
          onClose={() => setPayOptTarget(null)}
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

// ── General tab ───────────────────────────────────────────────────────────────
function GeneralTab({ program, loading }: { program: Program | null; loading: boolean }) {
  function fmtDate(d?: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  function fmtPrice(n?: number) {
    if (n == null) return '—'
    return `₦${n.toLocaleString('en-NG')}`
  }
  // Safely parse a JSON string field and return the object (or null)
  function tryParse(s?: string): Record<string, unknown> | null {
    if (!s) return null
    try { return JSON.parse(s) } catch { return null }
  }
  function countArray(s?: string, key?: string): number | null {
    const p = tryParse(s)
    if (!p) return null
    const arr = key ? p[key] : null
    return Array.isArray(arr) ? arr.length : null
  }

  const PROG_STATUS: Record<string, string> = {
    ACTIVE:    'bg-[#ecfdf3] text-[#027a48]',
    PUBLISHED: 'bg-[#ecfdf3] text-[#027a48]',
    DRAFT:     'bg-[#fffbeb] text-[#b45309]',
    INACTIVE:  'bg-[#f3f4f6] text-[#4b5563]',
    ARCHIVED:  'bg-[#f3f4f6] text-[#4b5563]',
  }

  const sk = (w: number) => <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} />

  const details: { label: string; value: string | undefined }[] = [
    { label: 'Programme ID',    value: program ? `#${program.id}` : undefined },
    { label: 'Type',            value: program?.type },
    { label: 'Slug',            value: program?.slug },
    { label: 'Level',           value: program?.level },
    { label: 'Duration',        value: program?.duration },
    { label: 'Flexibility',     value: program?.flexibility },
    { label: 'Language',        value: program?.languages },
    { label: 'Completion',      value: program?.auto_percent_completion != null ? `${program.auto_percent_completion}%` : undefined },
    { label: 'Published',       value: fmtDate(program?.published_at) },
    { label: 'Created',         value: fmtDate(program?.created_at) },
    { label: 'Last Updated',    value: fmtDate(program?.updated_at) },
  ]

  const pricing: { label: string; value: string }[] = program ? [
    { label: 'Main Price',          value: fmtPrice(program.main_price) },
    { label: 'Final Price',         value: fmtPrice(program.final_price) },
    { label: 'Discount Amount',     value: fmtPrice(program.discounted_amount) },
    { label: 'Discount %',          value: program.discounted_percent != null ? `${program.discounted_percent}%` : '—' },
  ] : []

  // Content summary — parse JSON strings to show counts
  const contentStats: { label: string; count: number | null }[] = [
    { label: 'Outcomes',      count: countArray(program?.outcomes, 'outcomes') },
    { label: 'Skills',        count: countArray(program?.skills, 'skills') },
    { label: 'FAQs',          count: countArray(program?.faqs, 'faqs') },
    { label: 'Projects',      count: countArray(program?.projects, 'projects') },
    { label: 'Apply Steps',   count: countArray(program?.application_process, 'steps') },
    { label: 'Tools',         count: countArray(program?.tools, 'tools') },
    { label: 'Testimonials',  count: countArray(program?.testimonials, 'testimonies') },
  ].filter(s => s.count !== null && s.count > 0) as { label: string; count: number }[]

  return (
    <div className="p-8 flex flex-col gap-6 max-w-[900px]">

      {/* Overview */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
        <div className="flex items-start gap-4 mb-3">
          <div className="flex-1 min-w-0">
            {loading
              ? <div className="h-6 w-72 bg-[#f3f4f6] rounded animate-pulse mb-2" />
              : <h2 className="text-[20px] font-bold text-[#111827] font-display leading-snug">{program?.title ?? '—'}</h2>
            }
            {loading
              ? <div className="h-4 w-64 bg-[#f3f4f6] rounded animate-pulse mt-2" />
              : program?.subtitle && (
                <p className="text-[13px] text-[#475467] font-body mt-1 leading-[1.6]">{program.subtitle}</p>
              )
            }
          </div>
          {!loading && program?.status && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {program.type && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-display bg-[#eff6ff] text-[#1d4ed8]">
                  {program.type}
                </span>
              )}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold font-display ${PROG_STATUS[program.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                {program.status}
              </span>
            </div>
          )}
        </div>

        <div className="h-px bg-[#f3f4f6] my-4" />

        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-2">Description</p>
        {loading
          ? <div className="flex flex-col gap-2">{[300, 260, 200].map((w, i) => <div key={i} className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} />)}</div>
          : <p className="text-[14px] text-[#374151] font-body leading-[1.7]">{program?.description || 'No description provided.'}</p>
        }

        {/* Links row */}
        {!loading && (program?.brochure_url || program?.sample_certificate_url) && (
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            {program.brochure_url && (
              <a href={program.brochure_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#d51520] hover:underline font-display">
                <Invoice01Icon size={13} strokeWidth={1.5} />
                View Brochure
              </a>
            )}
            {program.sample_certificate_url && (
              <span className="inline-flex items-center gap-1.5 text-[12px] text-[#4b5563] font-body">
                <CheckmarkCircle01Icon size={13} strokeWidth={1.5} color="#12b76a" />
                Certificate available
              </span>
            )}
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-4">Programme Details</p>
        <div className="grid grid-cols-2 gap-x-10 gap-y-4">
          {details.map(f => (
            <div key={f.label}>
              <p className="text-[11px] font-semibold text-[#9ca3af] font-display uppercase tracking-[0.05em] mb-0.5">{f.label}</p>
              {loading ? sk(100) : <p className="text-[14px] font-medium text-[#111827] font-body">{f.value || '—'}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-4">Pricing</p>
        {loading ? (
          <div className="grid grid-cols-4 gap-6">{[1,2,3,4].map(i => <div key={i} className="h-10 bg-[#f3f4f6] rounded animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {pricing.map(p => (
              <div key={p.label}>
                <p className="text-[11px] font-semibold text-[#9ca3af] font-display uppercase tracking-[0.05em] mb-0.5">{p.label}</p>
                <p className="text-[18px] font-bold text-[#111827] font-display leading-tight">{p.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Content summary */}
      {(!loading && contentStats.length > 0) && (
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-4">Content Summary</p>
          <div className="flex flex-wrap gap-3">
            {contentStats.map(s => (
              <div key={s.label} className="flex items-center gap-2 px-4 py-2 bg-[#f9fafb] border border-[#f3f4f6] rounded-[8px]">
                <span className="text-[20px] font-bold text-[#111827] font-display leading-none">{s.count}</span>
                <span className="text-[12px] text-[#4b5563] font-body">{s.label}</span>
              </div>
            ))}
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
  total_students?: number; enrolled_count?: number; enrolledCount?: number
  learning_format?: string; learningFormat?: string
  frequency?: string
  description?: string
  duration?: string
  admission_period?: string
  total_instructors?: number
}
interface ApiCohortCreate {
  program_id: string; title: string
  start_date: string; end_date: string
  status: string; max_students: string
  learning_format: string; frequency: string
  description: string
  admission_start: string; admission_end: string
}

function calcDuration(start: string, end: string): string {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return ''
  const days = Math.round(ms / (1000 * 60 * 60 * 24))
  const weeks = Math.floor(days / 7)
  const rem   = days % 7
  if (weeks === 0) return `${days} Day${days !== 1 ? 's' : ''}`
  if (rem === 0)   return `${weeks} Week${weeks !== 1 ? 's' : ''}`
  return `${weeks} Week${weeks !== 1 ? 's' : ''} ${rem} Day${rem !== 1 ? 's' : ''}`
}

function formatAdmissionPeriod(start: string, end: string): string {
  if (!start || !end) return ''
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${fmt(start)} - ${fmt(end)}`
}

function parseAdmissionPeriod(str?: string): { start: string; end: string } {
  if (!str) return { start: '', end: '' }
  const parts = str.split(' - ')
  if (parts.length !== 2) return { start: '', end: '' }
  const toISO = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0] }
  return { start: toISO(parts[0]), end: toISO(parts[1]) }
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
  const [form, setForm]               = useState<ApiCohortCreate>({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30', learning_format: '', frequency: '', description: '', admission_start: '', admission_end: '' })
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
      const list: ApiCohort[] = Array.isArray(data?.cohorts) ? data.cohorts : []
      // Enrich each cohort with total_students from the detail endpoint in parallel
      const enriched = await Promise.allSettled(
        list.map(c => apiClient.get(`/admin/cohorts/${c.id}`))
      )
      const merged = list.map((c, i) => {
        const result = enriched[i]
        if (result.status !== 'fulfilled') return c
        const detail = unwrap<{ cohort?: ApiCohort }>(result.value.data)
        const cohort = (detail?.cohort ?? detail) as ApiCohort
        return { ...c, total_students: cohort?.total_students ?? c.total_students }
      })
      setCohorts(merged)
    } catch { setCohorts([]) } finally { setLoading(false) }
  }, [programId])

  useEffect(() => { load() }, [load])

  async function createCohort(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!form.title.trim()) { setFormError('Title is required.'); return }
    if (!form.start_date || !form.end_date) { setFormError('Start and end dates required.'); return }
    setSaving(true)
    try {
      const dur = calcDuration(form.start_date, form.end_date)
      const adm = formatAdmissionPeriod(form.admission_start, form.admission_end)
      await apiClient.post(`/admin/programs/${programId}/cohorts`, {
        title:            form.title.trim(),
        startDate:        form.start_date,  start_date:   form.start_date,
        endDate:          form.end_date,    end_date:     form.end_date,
        status:           form.status,
        maxStudents:      parseInt(form.max_students) || 30,
        max_students:     parseInt(form.max_students) || 30,
        learningFormat:   form.learning_format || undefined,
        learning_format:  form.learning_format || undefined,
        frequency:        form.frequency       || undefined,
        description:      form.description.trim() || undefined,
        duration:         dur || undefined,
        admission_period: adm || undefined,
      })
      setShowCreate(false)
      setForm({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30', learning_format: '', frequency: '', description: '', admission_start: '', admission_end: '' })
      load()
    } catch (err) { setFormError(getApiError(err)) } finally { setSaving(false) }
  }

  async function saveCohortEdit(e: React.FormEvent) {
    e.preventDefault(); setFormError('')
    if (!editCohort) return
    await doSaveCohortEdit()
  }

  async function doSaveCohortEdit() {
    if (!editCohort) return
    setSaving(true)
    try {
      const dur = calcDuration(form.start_date, form.end_date)
      const adm = formatAdmissionPeriod(form.admission_start, form.admission_end)
      await apiClient.patch(`/admin/cohorts/${editCohort.id}`, {
        title:            form.title.trim(),
        startDate:        form.start_date,  start_date:   form.start_date,
        endDate:          form.end_date,    end_date:     form.end_date,
        status:           form.status,
        maxStudents:      parseInt(form.max_students) || 30,
        max_students:     parseInt(form.max_students) || 30,
        learningFormat:   form.learning_format || undefined,
        learning_format:  form.learning_format || undefined,
        frequency:        form.frequency       || undefined,
        description:      form.description.trim() || undefined,
        duration:         dur || undefined,
        admission_period: adm || undefined,
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
    const adm = parseAdmissionPeriod(c.admission_period)
    setForm({
      program_id:      programId,
      title:           c.title,
      start_date:      c.start_date      ?? c.startDate      ?? '',
      end_date:        c.end_date        ?? c.endDate        ?? '',
      status:          c.status          ?? 'UPCOMING',
      max_students:    String(c.max_students ?? c.maxStudents ?? 30),
      learning_format: c.learning_format ?? c.learningFormat ?? '',
      frequency:       c.frequency       ?? '',
      description:     c.description     ?? '',
      admission_start: adm.start,
      admission_end:   adm.end,
    })
    setFormError('')
    setEditCohort(c)
  }

  const cohortFormModal = (isEdit: boolean) => (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={() => { if (isEdit) { setEditCohort(null) } else { setShowCreate(false) } }}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[540px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{isEdit ? 'Edit Cohort' : 'New Cohort'}</h2>
          <button type="button" onClick={() => { if (isEdit) { setEditCohort(null) } else { setShowCreate(false) } }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={isEdit ? saveCohortEdit : createCohort} className="px-6 py-5 max-h-[80vh] overflow-y-auto flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Cohort Title</label>
            <input value={form.title} onChange={e => setF('title', e.target.value)}
              placeholder="AI Prompt Engineering — Cohort 3" className={clsInput} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Description <span className="text-[#9ca3af] font-normal">(optional)</span></label>
            <textarea value={form.description} onChange={e => setF('description', e.target.value)}
              rows={2} placeholder="Brief overview of what this cohort covers…"
              className={`${clsInput} h-auto resize-none py-2.5`} />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Cohort Dates</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={form.start_date} onChange={e => setF('start_date', e.target.value)} className={clsInput} />
              <input type="date" value={form.end_date}   onChange={e => setF('end_date',   e.target.value)} className={clsInput} />
            </div>
            {calcDuration(form.start_date, form.end_date) && (
              <p className="mt-1.5 text-[11px] text-[#4b5563] font-body">
                Duration: <span className="font-semibold text-[#111827]">{calcDuration(form.start_date, form.end_date)}</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Admission Period <span className="text-[#9ca3af] font-normal">(optional)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-[#9ca3af] font-body mb-1">From</p>
                <input type="date" value={form.admission_start} onChange={e => setF('admission_start', e.target.value)} className={clsInput} />
              </div>
              <div>
                <p className="text-[11px] text-[#9ca3af] font-body mb-1">To</p>
                <input type="date" value={form.admission_end} onChange={e => setF('admission_end', e.target.value)} className={clsInput} />
              </div>
            </div>
            {formatAdmissionPeriod(form.admission_start, form.admission_end) && (
              <p className="mt-1.5 text-[11px] text-[#4b5563] font-body">
                Preview: <span className="font-semibold text-[#111827]">{formatAdmissionPeriod(form.admission_start, form.admission_end)}</span>
              </p>
            )}
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
            <button type="button" onClick={() => { if (isEdit) { setEditCohort(null) } else { setShowCreate(false) } }}
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
        <button onClick={() => { setForm({ program_id: programId, title: '', start_date: '', end_date: '', status: 'UPCOMING', max_students: '30', learning_format: '', frequency: '', description: '', admission_start: '', admission_end: '' }); setFormError(''); setShowCreate(true) }}
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
              <tr className="bg-[#f9fafb] border-b border-[#eaecf0]">
                {['Cohort', 'Status', 'Start Date', 'End Date', 'Students', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display bg-[#f9fafb]">{h}</th>
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
                    {c.total_students ?? c.enrolled_count ?? 0} / {c.max_students ?? '—'}
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
type PageTab = 'General' | 'Cohorts' | 'Pricing' | 'General Curriculum'

export default function ProgramDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const programId = params.programId as string

  const [program, setProgram]       = useState<Program | null>(null)
  const [modules, setModules]       = useState<Module[]>([])
  const [selected, setSelected]     = useState<Module | null>(null)
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<PageTab>('General')
  const [showAddMod, setShowAddMod] = useState(false)
  const [editMod, setEditMod]       = useState<Module | null>(null)
  const [modForm, setModForm]       = useState({ title: '', description: '', status: 'DRAFT' })
  const [modSaving, setModSaving]   = useState(false)
  const [modError, setModError]     = useState('')
  const descEditorRef               = useRef<HTMLDivElement>(null)

  const fetchModules = useCallback(async () => {
    try {
      const [progRes, modRes] = await Promise.allSettled([
        apiClient.get(`/admin/programs/${programId}`),
        apiClient.get(`/admin/programs/${programId}/modules`),
      ])
      if (progRes.status === 'fulfilled') {
        const progRaw = unwrap<Record<string, unknown>>(progRes.value.data)
        // Handle both bare { id, title, ... } and wrapped { program: { id, title, ... } }
        const prog = (progRaw?.program && typeof progRaw.program === 'object'
          ? progRaw.program
          : progRaw) as Program
        setProgram(prog)
      }
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

  function openAddMod() {
    setModForm({ title: '', description: '', status: 'DRAFT' })
    setModError('')
    setShowAddMod(true)
    setTimeout(() => { if (descEditorRef.current) descEditorRef.current.innerHTML = '' }, 0)
  }

  function openEditMod(m: Module) {
    setModForm({ title: m.title, description: m.description || '', status: m.status || 'DRAFT' })
    setModError('')
    setEditMod(m)
    setTimeout(() => { if (descEditorRef.current) descEditorRef.current.innerHTML = m.description || '' }, 0)
  }

  function closeModModal() {
    setShowAddMod(false)
    setEditMod(null)
    setModForm({ title: '', description: '', status: 'DRAFT' })
    setModError('')
  }

  async function addModule(e: React.FormEvent) {
    e.preventDefault(); setModError('')
    if (!modForm.title.trim()) { setModError('Title required.'); return }
    const desc = descEditorRef.current?.innerHTML.trim() || ''
    setModSaving(true)
    try {
      await apiClient.post(`/admin/programs/${programId}/modules`, {
        title:       modForm.title.trim(),
        description: desc || undefined,
        status:      modForm.status,
      })
      closeModModal()
      fetchModules()
    } catch (err) { setModError(getApiError(err)) } finally { setModSaving(false) }
  }

  async function updateModule(e: React.FormEvent) {
    e.preventDefault(); setModError('')
    if (!editMod) return
    if (!modForm.title.trim()) { setModError('Title required.'); return }
    const desc = descEditorRef.current?.innerHTML.trim() || ''
    setModSaving(true)
    try {
      await apiClient.patch(`/admin/programs/${programId}/modules/${editMod.id}`, {
        title:       modForm.title.trim(),
        description: desc || undefined,
        status:      modForm.status,
      })
      closeModModal()
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
            {activeTab === 'General'            ? 'Overview and programme details'
            : activeTab === 'Cohorts'           ? 'Cohorts running this programme'
            : activeTab === 'Pricing'           ? 'Pricing plans and payment options'
            : 'General curriculum — modules, lessons & resources'}
          </p>
        </div>
        {activeTab === 'General Curriculum' && (
          <button onClick={openAddMod}
            className="flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
            <Add01Icon size={14} strokeWidth={2} /> Add Module
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        {(['General', 'Cohorts', 'Pricing', 'General Curriculum'] as PageTab[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#4b5563] hover:text-[#374151]'
            }`}>
            {tab === 'General'            && <Building04Icon  size={14} strokeWidth={1.5} />}
            {tab === 'Cohorts'            && <BookOpen01Icon  size={14} strokeWidth={1.5} />}
            {tab === 'Pricing'            && <Invoice01Icon   size={14} strokeWidth={1.5} />}
            {tab === 'General Curriculum' && <File01Icon      size={14} strokeWidth={1.5} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'General' && (
        <div className="flex-1 overflow-y-auto bg-[#f9fafb]">
          <GeneralTab program={program} loading={loading} />
        </div>
      )}

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
                  onSelect={setSelected} onRefresh={fetchModules} onEdit={openEditMod} />
              ))
            )}
          </div>

          {/* Right: detail panel */}
          <div className="flex-1 bg-white overflow-hidden">
            <DetailPanel mod={selected} programId={programId} onRefresh={fetchModules} />
          </div>
        </div>
      )}

      {/* Add / Edit module modal */}
      {(showAddMod || editMod) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={closeModModal}>
          <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[640px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
              <h2 className="text-[15px] font-bold text-[#111827] font-display">
                {editMod ? 'Edit Module' : 'Add Module'}
              </h2>
              <button onClick={closeModModal} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
                <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
              </button>
            </div>
            <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
              <form onSubmit={editMod ? updateModule : addModule} className="flex flex-col gap-5">
                <Field label="Module Title">
                  <input value={modForm.title}
                    onChange={e => setModForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Week 1: Introduction to AI"
                    className={inputCls} />
                </Field>
                <Field label="Description">
                  <div className="border border-[#e5e7eb] rounded-[6px] overflow-hidden focus-within:ring-2 focus-within:ring-[#d51520]/20 focus-within:border-[#d51520]">
                    {/* Rich text toolbar */}
                    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#f3f4f6] bg-[#f9fafb]">
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); document.execCommand('bold') }}
                        className="w-7 h-7 rounded-[4px] hover:bg-[#e5e7eb] flex items-center justify-center text-[13px] font-bold text-[#374151] transition-colors"
                        title="Bold">
                        B
                      </button>
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); document.execCommand('italic') }}
                        className="w-7 h-7 rounded-[4px] hover:bg-[#e5e7eb] flex items-center justify-center text-[13px] italic text-[#374151] transition-colors"
                        title="Italic">
                        I
                      </button>
                      <div className="w-px h-4 bg-[#e5e7eb] mx-1" />
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); document.execCommand('insertUnorderedList') }}
                        className="w-7 h-7 rounded-[4px] hover:bg-[#e5e7eb] flex items-center justify-center text-[13px] text-[#374151] transition-colors"
                        title="Bullet list">
                        ≡
                      </button>
                      <button type="button"
                        onMouseDown={e => { e.preventDefault(); document.execCommand('insertOrderedList') }}
                        className="w-7 h-7 rounded-[4px] hover:bg-[#e5e7eb] flex items-center justify-center text-[12px] text-[#374151] transition-colors"
                        title="Numbered list">
                        1.
                      </button>
                    </div>
                    {/* Editable area */}
                    <div
                      ref={descEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="min-h-[140px] p-3 text-[13px] text-[#374151] font-body outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-0.5 empty:before:content-[attr(data-placeholder)] empty:before:text-[#9ca3af]"
                      data-placeholder="What students will learn in this module…"
                    />
                  </div>
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
                  <button type="button" onClick={closeModModal}
                    className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">
                    Cancel
                  </button>
                  <button type="submit" disabled={modSaving}
                    className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                    {modSaving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                    {editMod ? 'Save Changes' : 'Add Module'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
