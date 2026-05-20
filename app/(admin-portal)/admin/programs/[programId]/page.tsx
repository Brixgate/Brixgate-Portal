'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Add01Icon, Cancel01Icon, Loading01Icon, AlertCircleIcon,
  Delete01Icon, ArrowDown01Icon, ArrowRight01Icon,
  ArrowLeft01Icon, File01Icon, BookOpen01Icon, VideoReplayIcon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Resource { id: number; title: string; type: string; link: string; status?: string }
interface Lesson   { id: number; title: string; content_type: string; duration?: number; order_index?: number }
interface Module   { id: number; title: string; description?: string; order_index?: number; status?: string; lessons: Lesson[]; resources: Resource[] }
interface Program  { id: number; title: string; level?: string; status?: string; description?: string }

const CONTENT_TYPES   = ['VIDEO', 'ARTICLE', 'QUIZ']
const RESOURCE_TYPES  = ['PDF', 'VIDEO', 'ARTICLE', 'IMAGE', 'PRESENTATION', 'LECTURE']
const MODULE_STATUSES = ['DRAFT', 'PUBLISHED']

// ── Resource type icon ────────────────────────────────────────────────────────
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

// ── Simple modal wrapper ──────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[460px] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#6b7280" strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">{label}</label>
      {children}
    </div>
  )
}
const inputCls = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
const selectCls = `${inputCls} bg-white`

// ── Module accordion item ─────────────────────────────────────────────────────
function ModuleItem({
  mod, programId, isSelected, onSelect, onRefresh,
}: {
  mod: Module; programId: string; isSelected: boolean
  onSelect: (m: Module) => void; onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Delete module "${mod.title}" and all its content?`)) return
    setDeleting(true)
    try { await apiClient.delete(`/admin/programs/${programId}/modules/${mod.id}`); onRefresh() }
    catch { /* handled silently */ } finally { setDeleting(false) }
  }

  return (
    <div className={`rounded-[8px] border transition-all ${isSelected ? 'border-[#d51520] bg-[#fef2f2]' : 'border-[#e5e7eb] hover:border-[#d1d5db]'}`}>
      <div className="flex items-center gap-2 px-3 py-3 cursor-pointer" onClick={() => { setExpanded(e => !e); onSelect(mod) }}>
        {expanded ? <ArrowDown01Icon size={14} color="#6b7280" strokeWidth={2} /> : <ArrowRight01Icon size={14} color="#6b7280" strokeWidth={2} />}
        <BookOpen01Icon size={14} color={isSelected ? '#d51520' : '#9ca3af'} strokeWidth={1.5} />
        <span className={`flex-1 text-[13px] font-medium font-body truncate ${isSelected ? 'text-[#d51520]' : 'text-[#111827]'}`}>{mod.title}</span>
        <span className="text-[11px] text-[#9ca3af] font-body flex-shrink-0">{mod.lessons.length}L · {mod.resources.length}R</span>
        <button onClick={e => { e.stopPropagation(); handleDelete() }} disabled={deleting}
          className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fef2f2] transition-colors flex-shrink-0 ml-1">
          {deleting ? <Loading01Icon size={11} className="animate-spin text-[#d51520]" strokeWidth={2} />
            : <Delete01Icon size={12} color="#9ca3af" strokeWidth={1.5} />}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-1">
          {mod.lessons.map(l => (
            <div key={l.id} className="flex items-center gap-2 py-1.5 pl-4 rounded-[6px] hover:bg-white/60 transition-colors">
              <VideoReplayIcon size={11} color="#6b7280" strokeWidth={1.5} />
              <span className="text-[12px] text-[#374151] font-body flex-1 truncate">{l.title}</span>
              <span className="text-[10px] text-[#9ca3af] font-body">{l.content_type}</span>
            </div>
          ))}
          {mod.resources.map(r => (
            <div key={r.id} className="flex items-center gap-2 py-1.5 pl-4 rounded-[6px] hover:bg-white/60 transition-colors">
              <File01Icon size={11} color="#6b7280" strokeWidth={1.5} />
              <span className="text-[12px] text-[#374151] font-body flex-1 truncate">{r.title}</span>
              <ResourceTypeIcon type={r.type} />
            </div>
          ))}
          {mod.lessons.length === 0 && mod.resources.length === 0 && (
            <p className="text-[11px] text-[#9ca3af] font-body pl-4 py-1">No lessons or resources yet</p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({
  mod, programId, onRefresh,
}: { mod: Module | null; programId: string; onRefresh: () => void }) {
  const [showAddLesson, setShowAddLesson]     = useState(false)
  const [showAddResource, setShowAddResource] = useState(false)
  const [lessonForm, setLessonForm]           = useState({ title: '', content_type: 'VIDEO', duration: '' })
  const [resourceForm, setResourceForm]       = useState({ title: '', type: 'PDF', link: '' })
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')

  async function addLesson(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!lessonForm.title.trim()) { setError('Title required.'); return }
    setSaving(true)
    try {
      await apiClient.post(`/admin/programs/${programId}/modules/${mod!.id}/lessons`, {
        title: lessonForm.title.trim(),
        content_type: lessonForm.content_type,
        duration: lessonForm.duration ? parseInt(lessonForm.duration) : undefined,
      })
      setShowAddLesson(false)
      setLessonForm({ title: '', content_type: 'VIDEO', duration: '' })
      onRefresh()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  async function addResource(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!resourceForm.title.trim() || !resourceForm.link.trim()) { setError('Title and link required.'); return }
    setSaving(true)
    try {
      await apiClient.post(`/admin/programs/${programId}/modules/${mod!.id}/resources`, {
        title: resourceForm.title.trim(), type: resourceForm.type, link: resourceForm.link.trim(),
      })
      setShowAddResource(false)
      setResourceForm({ title: '', type: 'PDF', link: '' })
      onRefresh()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  if (!mod) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-20">
        <BookOpen01Icon size={36} color="#e5e7eb" strokeWidth={1.5} className="mb-3" />
        <p className="text-[14px] font-semibold text-[#374151] font-display">Select a module</p>
        <p className="text-[13px] text-[#9ca3af] font-body mt-1">Choose a module from the left to manage its content</p>
      </div>
    )
  }

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="mb-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[17px] font-bold text-[#111827] font-display leading-[24px]">{mod.title}</h3>
          <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${mod.status === 'PUBLISHED' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fffbeb] text-[#b45309]'}`}>
            {mod.status ?? 'DRAFT'}
          </span>
        </div>
        {mod.description && <p className="text-[13px] text-[#6b7280] font-body mt-1.5 leading-[1.6]">{mod.description}</p>}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-[12px] text-[#9ca3af] font-body">{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
          <span className="text-[12px] text-[#9ca3af] font-body">{mod.resources.length} resource{mod.resources.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Lessons */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#374151] font-display">Lessons</h4>
          <button onClick={() => setShowAddLesson(true)}
            className="flex items-center gap-1 text-[11px] text-[#d51520] font-medium font-display hover:underline">
            <Add01Icon size={11} strokeWidth={2} /> Add Lesson
          </button>
        </div>
        {mod.lessons.length === 0
          ? <p className="text-[12px] text-[#9ca3af] font-body py-3 text-center border border-dashed border-[#e5e7eb] rounded-[8px]">No lessons yet</p>
          : mod.lessons.map(l => (
            <div key={l.id} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-0">
              <VideoReplayIcon size={14} color="#9ca3af" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111827] font-body truncate">{l.title}</p>
                <p className="text-[11px] text-[#9ca3af] font-body">{l.content_type}{l.duration ? ` · ${l.duration} min` : ''}</p>
              </div>
            </div>
          ))
        }
      </div>

      {/* Resources */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[12px] font-bold uppercase tracking-[0.06em] text-[#374151] font-display">Resources</h4>
          <button onClick={() => setShowAddResource(true)}
            className="flex items-center gap-1 text-[11px] text-[#d51520] font-medium font-display hover:underline">
            <Add01Icon size={11} strokeWidth={2} /> Add Resource
          </button>
        </div>
        {mod.resources.length === 0
          ? <p className="text-[12px] text-[#9ca3af] font-body py-3 text-center border border-dashed border-[#e5e7eb] rounded-[8px]">No resources yet</p>
          : mod.resources.map(r => (
            <div key={r.id} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-0">
              <File01Icon size={14} color="#9ca3af" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#111827] font-body truncate">{r.title}</p>
              </div>
              <ResourceTypeIcon type={r.type} />
            </div>
          ))
        }
      </div>

      {/* Add lesson modal */}
      {showAddLesson && (
        <Modal title="Add Lesson" onClose={() => setShowAddLesson(false)}>
          <form onSubmit={addLesson} className="flex flex-col gap-4">
            <Field label="Title"><input value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))} placeholder="Week 1: Introduction" className={inputCls} /></Field>
            <Field label="Content Type">
              <select value={lessonForm.content_type} onChange={e => setLessonForm(p => ({ ...p, content_type: e.target.value }))} className={selectCls}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Duration (minutes)"><input type="number" value={lessonForm.duration} onChange={e => setLessonForm(p => ({ ...p, duration: e.target.value }))} placeholder="60" className={inputCls} /></Field>
            {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddLesson(false)} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />} Add Lesson
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add resource modal */}
      {showAddResource && (
        <Modal title="Add Resource" onClose={() => setShowAddResource(false)}>
          <form onSubmit={addResource} className="flex flex-col gap-4">
            <Field label="Title"><input value={resourceForm.title} onChange={e => setResourceForm(p => ({ ...p, title: e.target.value }))} placeholder="Week 1 Slides" className={inputCls} /></Field>
            <Field label="Type">
              <select value={resourceForm.type} onChange={e => setResourceForm(p => ({ ...p, type: e.target.value }))} className={selectCls}>
                {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Link / URL"><input value={resourceForm.link} onChange={e => setResourceForm(p => ({ ...p, link: e.target.value }))} placeholder="https://…" className={inputCls} /></Field>
            {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddResource(false)} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />} Add Resource
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProgramDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const programId = params.programId as string

  const [program, setProgram]   = useState<Program | null>(null)
  const [modules, setModules]   = useState<Module[]>([])
  const [selected, setSelected] = useState<Module | null>(null)
  const [loading, setLoading]   = useState(true)
  const [showAddMod, setShowAddMod] = useState(false)
  const [modForm, setModForm]   = useState({ title: '', description: '', status: 'DRAFT' })
  const [modSaving, setModSaving] = useState(false)
  const [modError, setModError] = useState('')

  const fetchModules = useCallback(async () => {
    try {
      const [progRes, modRes] = await Promise.allSettled([
        apiClient.get(`/admin/programs/${programId}`),
        apiClient.get(`/admin/programs/${programId}/modules`),
      ])
      if (progRes.status === 'fulfilled') {
        setProgram(unwrap<Program>(progRes.value.data))
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

  async function addModule(e: React.FormEvent) {
    e.preventDefault(); setModError('')
    if (!modForm.title.trim()) { setModError('Title required.'); return }
    setModSaving(true)
    try {
      await apiClient.post(`/admin/programs/${programId}/modules`, {
        title: modForm.title.trim(),
        description: modForm.description.trim() || undefined,
        status: modForm.status,
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
          <p className="text-[12px] text-[#9ca3af] font-body">Curriculum bank — modules, lessons & resources</p>
        </div>
        <button onClick={() => setShowAddMod(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={14} strokeWidth={2} /> Add Module
        </button>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: modules list */}
        <div className="w-[300px] flex-shrink-0 border-r border-[#f3f4f6] overflow-y-auto p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#9ca3af] font-display px-1 mb-1">
            {modules.length} Module{modules.length !== 1 ? 's' : ''}
          </p>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-[#f3f4f6] rounded-[8px] animate-pulse" />
              ))
            : modules.length === 0
            ? (
              <div className="text-center py-12">
                <BookOpen01Icon size={28} color="#e5e7eb" strokeWidth={1.5} className="mx-auto mb-2" />
                <p className="text-[12px] text-[#9ca3af] font-body">No modules yet</p>
              </div>
            )
            : modules.map(m => (
                <ModuleItem key={m.id} mod={m} programId={programId}
                  isSelected={selected?.id === m.id}
                  onSelect={setSelected} onRefresh={fetchModules} />
              ))
          }
        </div>

        {/* Right: detail panel */}
        <div className="flex-1 overflow-hidden">
          <DetailPanel mod={selected} programId={programId} onRefresh={fetchModules} />
        </div>
      </div>

      {/* Add module modal */}
      {showAddMod && (
        <Modal title="Add Module" onClose={() => setShowAddMod(false)}>
          <form onSubmit={addModule} className="flex flex-col gap-4">
            <Field label="Module Title"><input value={modForm.title} onChange={e => setModForm(p => ({ ...p, title: e.target.value }))} placeholder="Week 1: Introduction to AI" className={inputCls} /></Field>
            <Field label="Description">
              <textarea value={modForm.description} onChange={e => setModForm(p => ({ ...p, description: e.target.value }))}
                rows={3} placeholder="What students will learn…" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
            </Field>
            <Field label="Status">
              <select value={modForm.status} onChange={e => setModForm(p => ({ ...p, status: e.target.value }))} className={selectCls}>
                {MODULE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            {modError && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {modError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAddMod(false)} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-body hover:bg-[#f9fafb]">Cancel</button>
              <button type="submit" disabled={modSaving} className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {modSaving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />} Add Module
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
