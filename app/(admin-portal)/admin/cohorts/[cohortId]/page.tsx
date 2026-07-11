'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, UserGroup02Icon,
  StarIcon, BookOpen01Icon, CheckmarkCircle01Icon,
  CircleIcon, AlertCircleIcon, DatabaseIcon,
  ArrowDown01Icon, ArrowRight01Icon, VideoReplayIcon, File01Icon,
  PencilEdit01Icon, Cancel01Icon, Building01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import { useSidebar } from '@/lib/sidebar-context'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cohort {
  id: number; title: string; status?: string
  start_date?: string; end_date?: string
  startDate?: string; endDate?: string       // camelCase fallbacks
  max_students?: number
  program_id?: number; programId?: number
  program?: { id: number; title: string }
}
interface ProgramModuleLesson   { id: number; title: string; content_type: string; duration?: number }
interface ProgramModuleResource { id: number; title: string; type: string; link?: string }
interface ProgramModule {
  id: number; title: string; description?: string; order_index?: number; status?: string
  lessons?: ProgramModuleLesson[]
  resources?: ProgramModuleResource[]
}
interface CohortModule  { id: number; program_module_id?: number; programModuleId?: number; title?: string }
interface CustomLesson  { tempId: string; title: string }

interface Member {
  id: number
  user?: { id?: number; name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }
  role?: string
  membershipStatus?: string; membership_status?: string
}
interface Enrollment {
  id: number
  user?: { id?: number; name?: string; email: string }
  enrollment_type?: string; enrollmentType?: string
  seats_purchased?: number; seatsPurchased?: number
  seats_used?: number; seatsUsed?: number
  status?: string
  completion_status?: string; completionStatus?: string
  created_at?: string; createdAt?: string
  organization_name?: string; organizationName?: string
}
interface Review {
  id: number; user?: { name?: string; email: string }; rating?: number
  comment?: string; is_anonymous?: boolean; created_at?: string
}

// Merged row for the People tab
interface PersonRow {
  key: string
  name: string
  email: string
  role: string
  enrollmentType: string
  seats: number | string        // display value for table cell
  seatsPurchased: number | null // raw for detail panel
  seatsUsed: number | null      // raw for detail panel
  enrollmentStatus: string
  completionStatus: string
  joinedAt: string
  organizationName: string      // '' if not a team enrollment
}

function getInitials(name: string): string {
  if (!name || name === '—') return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

function userName(u?: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email: string }) {
  if (!u) return '—'
  if (u.name) return u.name
  const f = u.firstName ?? u.first_name ?? ''
  const l = u.lastName  ?? u.last_name  ?? ''
  return `${f} ${l}`.trim() || u.email
}

function formatDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Resource type badge ───────────────────────────────────────────────────────
function ResourceTypeChip({ type }: { type: string }) {
  const colors: Record<string, string> = {
    PDF: '#d51520', VIDEO: '#7c3aed', ARTICLE: '#0369a1',
    IMAGE: '#0d9488', PRESENTATION: '#d97706', LECTURE: '#374151',
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold font-display uppercase"
      style={{ background: (colors[type] ?? '#374151') + '18', color: colors[type] ?? '#374151' }}>
      {type}
    </span>
  )
}

// ── Tab: Curriculum ───────────────────────────────────────────────────────────
function CurriculumTab({ cohortId, programId }: { cohortId: string; programId: number | null }) {
  const [allModules, setAllModules]           = useState<ProgramModule[]>([])
  const [cohortModules, setCohortModules]     = useState<CohortModule[]>([])
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<number>>(new Set())
  const [loading, setLoading]                 = useState(true)
  const [saving, setSaving]                   = useState(false)
  const [error, setError]                     = useState('')
  const [success, setSuccess]                 = useState(false)
  const [mode, setMode]                       = useState<'read' | 'edit'>('read')
  const [expandedId, setExpandedId]           = useState<number | null>(null)

  // Phase 2 — per-module lesson selection
  const [editingModule, setEditingModule]     = useState<ProgramModule | null>(null)
  const [loadingLessons, setLoadingLessons]   = useState(false)
  const [fetchedLessons, setFetchedLessons]   = useState<ProgramModuleLesson[]>([])
  const [selectedLessonsPerModule, setSelectedLessonsPerModule] = useState<Record<number, Set<number>>>({})
  const [customLessonsPerModule, setCustomLessonsPerModule]     = useState<Record<number, CustomLesson[]>>({})
  const [newLessonTitle, setNewLessonTitle]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Always fetch the cohort's own modules — this works without programId
      const cohortModRes = await apiClient.get(`/cohorts/${cohortId}/modules`).catch(() => null)
      if (cohortModRes) {
        const d = unwrap<{ modules?: CohortModule[] } | CohortModule[]>(cohortModRes.data)
        const mods: CohortModule[] = Array.isArray(d) ? d : (d as { modules?: CohortModule[] })?.modules ?? []
        setCohortModules(mods)
        setSelectedModuleIds(new Set(mods.map(m => m.program_module_id ?? m.programModuleId ?? 0).filter(Boolean)))
      }
      // Fetch programme pool only when we know the programId
      if (programId) {
        const progModRes = await apiClient.get(`/admin/programs/${programId}/modules`).catch(() => null)
        if (progModRes) {
          const d = unwrap<{ modules?: ProgramModule[] } | ProgramModule[]>(progModRes.data)
          setAllModules(Array.isArray(d) ? d : (d as { modules?: ProgramModule[] })?.modules ?? [])
        }
      }
    } finally { setLoading(false) }
  }, [cohortId, programId])

  useEffect(() => { load() }, [load])

  function toggleModule(id: number) {
    setSelectedModuleIds(prev => {
      const n = new Set(prev); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n
    })
  }

  async function openModuleLessons(module: ProgramModule) {
    setEditingModule(module)
    let lessons: ProgramModuleLesson[] = module.lessons ?? []
    if (lessons.length === 0 && programId) {
      setLoadingLessons(true)
      try {
        const res = await apiClient.get(`/admin/programs/${programId}/modules/${module.id}/lessons`)
        const d = unwrap<{ lessons?: ProgramModuleLesson[] } | ProgramModuleLesson[]>(res.data)
        lessons = Array.isArray(d) ? d : (d as { lessons?: ProgramModuleLesson[] })?.lessons ?? []
        setAllModules(prev => prev.map(m => m.id === module.id ? { ...m, lessons } : m))
      } catch { lessons = [] } finally { setLoadingLessons(false) }
    }
    setFetchedLessons(lessons)
    // Pre-select all lessons the first time this module is opened
    if (!selectedLessonsPerModule[module.id]) {
      setSelectedLessonsPerModule(prev => ({ ...prev, [module.id]: new Set(lessons.map(l => l.id)) }))
    }
  }

  function toggleLesson(lessonId: number) {
    if (!editingModule) return
    setSelectedLessonsPerModule(prev => {
      const s = new Set(prev[editingModule.id] ?? [])
      if (s.has(lessonId)) { s.delete(lessonId) } else { s.add(lessonId) }
      return { ...prev, [editingModule.id]: s }
    })
  }

  function addCustomLesson() {
    const title = newLessonTitle.trim()
    if (!title || !editingModule) return
    const tempId = `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setCustomLessonsPerModule(prev => ({
      ...prev, [editingModule.id]: [...(prev[editingModule.id] ?? []), { tempId, title }],
    }))
    setNewLessonTitle('')
  }

  function removeCustomLesson(moduleId: number, tempId: string) {
    setCustomLessonsPerModule(prev => ({
      ...prev, [moduleId]: (prev[moduleId] ?? []).filter(l => l.tempId !== tempId),
    }))
  }

  async function saveCurriculum() {
    setSaving(true); setError(''); setSuccess(false)
    try {
      const moduleIds = Array.from(selectedModuleIds)
      // Save module assignments — batch first, fall back to individual
      try {
        await apiClient.post(`/admin/cohorts/${cohortId}/modules`, { module_ids: moduleIds })
      } catch {
        const currentIds = new Set(cohortModules.map(m => m.program_module_id ?? m.programModuleId ?? 0))
        const toAdd    = moduleIds.filter(id => !currentIds.has(id))
        const toRemove = cohortModules.filter(m => !selectedModuleIds.has(m.program_module_id ?? m.programModuleId ?? 0))
        await Promise.allSettled([
          ...toAdd.map(id   => apiClient.post(`/admin/cohorts/${cohortId}/modules`, { program_module_id: id })),
          ...toRemove.map(m => apiClient.delete(`/admin/cohorts/${cohortId}/modules/${m.id}`)),
        ])
      }
      // Save lessons for each selected module (ignore duplicates)
      await Promise.allSettled(
        moduleIds.flatMap(mid => [
          ...Array.from(selectedLessonsPerModule[mid] ?? []).map(lid =>
            apiClient.post(`/admin/cohorts/${cohortId}/lessons`, { program_lesson_id: lid, module_id: mid })
          ),
          ...(customLessonsPerModule[mid] ?? []).map(cl =>
            apiClient.post(`/admin/cohorts/${cohortId}/lessons`, { title: cl.title, module_id: mid, content_type: 'VIDEO' })
          ),
        ])
      )
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
      setMode('read'); setEditingModule(null)
      setSelectedLessonsPerModule({}); setCustomLessonsPerModule({})
      load()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const hasChanges = (() => {
    const cur = new Set(cohortModules.map(m => m.program_module_id ?? m.programModuleId ?? 0))
    if (cur.size !== selectedModuleIds.size) return true
    if (allModules.some(m => selectedModuleIds.has(m.id) !== cur.has(m.id))) return true
    // Also dirty if the user has queued up any custom lessons
    return Object.values(customLessonsPerModule).some(ls => ls.length > 0)
  })()

  // ── READ MODE ───────────────────────────────────────────────────────────────
  if (mode === 'read') {
    const assignedModules = allModules.filter(m => selectedModuleIds.has(m.id))
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0 bg-white">
          <div>
            <p className="text-[13px] font-semibold text-[#111827] font-display">
              {loading ? '…' : `${selectedModuleIds.size} module${selectedModuleIds.size !== 1 ? 's' : ''} assigned to this cohort`}
            </p>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">Click &ldquo;Edit Curriculum&rdquo; to change assignments</p>
          </div>
          {success && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#027a48] font-body mr-3">
              <CheckmarkCircle01Icon size={12} color="#027a48" strokeWidth={1.5} /> Saved
            </p>
          )}
          <button onClick={() => setMode('edit')}
            className="flex items-center gap-2 h-9 px-4 border border-[#e5e7eb] rounded-[8px] text-[12px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors">
            <PencilEdit01Icon size={13} color="#374151" strokeWidth={1.5} />
            Edit Curriculum
          </button>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4 border-b border-[#f3f4f6]">
                <div className="w-5 h-5 rounded bg-[#e5e7eb] animate-pulse flex-shrink-0" />
                <div className="h-4 bg-[#e5e7eb] rounded animate-pulse flex-1" />
              </div>
            ))
          ) : assignedModules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                <BookOpen01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No modules assigned</p>
              <p className="text-[13px] text-[#4b5563] font-body max-w-[280px]">
                Click &ldquo;Edit Curriculum&rdquo; to assign modules from the programme pool
              </p>
              <button onClick={() => setMode('edit')}
                className="mt-5 flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
                <PencilEdit01Icon size={13} color="white" strokeWidth={1.5} />
                Edit Curriculum
              </button>
            </div>
          ) : (
            assignedModules.map((m, idx) => {
              const isOpen    = expandedId === m.id
              const lessons   = m.lessons   ?? []
              const resources = m.resources ?? []
              return (
                <div key={m.id} className="border-b border-[#f3f4f6] last:border-0">
                  <button onClick={() => setExpandedId(isOpen ? null : m.id)}
                    className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#f9fafb] transition-colors text-left">
                    {isOpen
                      ? <ArrowDown01Icon  size={14} color="#4b5563" strokeWidth={2} className="flex-shrink-0" />
                      : <ArrowRight01Icon size={14} color="#4b5563" strokeWidth={2} className="flex-shrink-0" />}
                    <div className="w-6 h-6 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#d51520] font-display">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{m.title}</p>
                      {m.description && <p className="text-[11px] text-[#4b5563] font-body mt-0.5 truncate">{m.description}</p>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {m.status && (
                        <span className={`text-[9px] font-bold font-display px-1.5 py-0.5 rounded-[3px] uppercase tracking-wide ${
                          m.status === 'PUBLISHED' ? 'bg-[#ecfdf3] text-[#027a48]' : 'bg-[#fffbeb] text-[#b45309]'
                        }`}>{m.status}</span>
                      )}
                      <span className="text-[11px] text-[#4b5563] font-body">{lessons.length}L · {resources.length}R</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 pt-1 bg-[#fafafa] border-t border-[#f3f4f6]">
                      {lessons.length > 0 && (
                        <div className="mb-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display mb-1.5 pl-9">Lessons</p>
                          <div className="flex flex-col gap-0.5 pl-9">
                            {lessons.map(l => (
                              <div key={l.id} className="flex items-center gap-2 py-1.5">
                                <VideoReplayIcon size={12} color="#4b5563" strokeWidth={1.5} className="flex-shrink-0" />
                                <span className="text-[12px] font-medium text-[#374151] font-body flex-1 truncate">{l.title}</span>
                                <span className="text-[10px] text-[#4b5563] font-body flex-shrink-0">{l.content_type}{l.duration ? ` · ${l.duration}min` : ''}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {resources.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display mb-1.5 pl-9">Resources</p>
                          <div className="flex flex-col gap-0.5 pl-9">
                            {resources.map(r => (
                              <div key={r.id} className="flex items-center gap-2 py-1.5">
                                <File01Icon size={12} color="#4b5563" strokeWidth={1.5} className="flex-shrink-0" />
                                <span className="text-[12px] font-medium text-[#374151] font-body flex-1 truncate">{r.title}</span>
                                <ResourceTypeChip type={r.type} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {lessons.length === 0 && resources.length === 0 && (
                        <p className="text-[12px] text-[#4b5563] font-body pl-9 py-1">No lessons or resources added yet</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // ── EDIT MODE — Phase 2: lesson selection for a specific module ─────────────
  if (editingModule) {
    const selectedIds = selectedLessonsPerModule[editingModule.id] ?? new Set<number>()
    const customs     = customLessonsPerModule[editingModule.id] ?? []
    return (
      <div className="flex flex-col h-full overflow-hidden bg-white">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setEditingModule(null)}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#4b5563] font-body hover:text-[#374151] transition-colors">
              <ArrowLeft01Icon size={14} color="currentColor" strokeWidth={2} />
              Back to modules
            </button>
            <div className="w-px h-4 bg-[#e5e7eb]" />
            <div>
              <p className="text-[13px] font-semibold text-[#111827] font-display">{editingModule.title}</p>
              <p className="text-[11px] text-[#4b5563] font-body">Select lessons to include in this cohort</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={12} color="#d51520" strokeWidth={1.5} />{error}
              </p>
            )}
            <button onClick={() => setEditingModule(null)}
              className="h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
              Back
            </button>
            <button onClick={saveCurriculum} disabled={saving || !hasChanges}
              className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[12px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center gap-2">
              {saving && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
              Save Curriculum
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loadingLessons ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-14 bg-[#f9fafb] rounded-[10px] animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Programme lessons */}
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display mb-3">
                Lessons from programme ({fetchedLessons.length})
              </p>
              {fetchedLessons.length === 0 ? (
                <p className="text-[13px] text-[#4b5563] font-body mb-6">No lessons found in this module</p>
              ) : (
                <div className="flex flex-col gap-2 mb-6">
                  {fetchedLessons.map(lesson => {
                    const checked = selectedIds.has(lesson.id)
                    return (
                      <button key={lesson.id} onClick={() => toggleLesson(lesson.id)}
                        className={`flex items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-all ${
                          checked ? 'border-[#d51520] bg-[#fef2f2]' : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                        }`}>
                        <div className={`w-5 h-5 rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          checked ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'
                        }`}>
                          {checked && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <VideoReplayIcon size={13} color={checked ? '#d51520' : '#9ca3af'} strokeWidth={1.5} className="flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold font-display ${checked ? 'text-[#d51520]' : 'text-[#111827]'}`}>{lesson.title}</p>
                          <p className="text-[11px] text-[#4b5563] font-body">{lesson.content_type}{lesson.duration ? ` · ${lesson.duration}min` : ''}</p>
                        </div>
                        {checked
                          ? <CheckmarkCircle01Icon size={14} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                          : <CircleIcon           size={14} color="#d1d5db" strokeWidth={1.5} className="flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Custom lessons */}
              {customs.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display mb-3">
                    Custom lessons ({customs.length})
                  </p>
                  <div className="flex flex-col gap-2">
                    {customs.map(cl => (
                      <div key={cl.tempId} className="flex items-center gap-3 rounded-[10px] border border-[#d51520] bg-[#fef2f2] px-4 py-3">
                        <VideoReplayIcon size={13} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                        <p className="flex-1 text-[13px] font-semibold text-[#d51520] font-display truncate">{cl.title}</p>
                        <span className="flex-shrink-0 text-[9px] font-bold uppercase text-[#d51520] font-display border border-[#d51520] px-1.5 py-0.5 rounded-[4px]">Custom</span>
                        <button onClick={() => removeCustomLesson(editingModule.id, cl.tempId)}
                          className="w-6 h-6 flex items-center justify-center rounded-[4px] hover:bg-[#fecdca] transition-colors flex-shrink-0">
                          <Cancel01Icon size={12} color="#d51520" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add custom lesson */}
              <div className="border-t border-[#f3f4f6] pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display mb-3">Add custom lesson</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLessonTitle}
                    onChange={e => setNewLessonTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomLesson() } }}
                    placeholder="Lesson title…"
                    className="flex-1 h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 outline-none transition-all"
                  />
                  <button onClick={addCustomLesson} disabled={!newLessonTitle.trim()}
                    className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[12px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 transition-colors flex-shrink-0">
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── EDIT MODE — Phase 1: module selection (two panels) ─────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: programme pool */}
      <div className="w-[300px] flex-shrink-0 border-r border-[#f3f4f6] flex flex-col bg-[#f9fafb]">
        <div className="px-5 py-4 border-b border-[#f3f4f6] bg-white">
          <div className="flex items-center gap-2">
            <DatabaseIcon size={14} color="#4b5563" strokeWidth={1.5} />
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4b5563] font-display">Programme Pool</p>
          </div>
          <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
            {programId ? `All modules (${allModules.length}) — click to select` : 'No programme linked to this cohort'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-[#f3f4f6]">
                <div className="w-5 h-5 rounded bg-[#e5e7eb] animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="h-3.5 bg-[#e5e7eb] rounded animate-pulse w-3/4 mb-1.5" />
                  <div className="h-3 bg-[#e5e7eb] rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))
          ) : !programId ? (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-[#4b5563] font-body">Link a programme to this cohort to see the module pool</p>
            </div>
          ) : allModules.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-[#4b5563] font-body">No modules in programme</p>
            </div>
          ) : (
            allModules.map(m => (
              <div key={m.id}
                className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#f3f4f6] cursor-pointer transition-colors ${
                  selectedModuleIds.has(m.id) ? 'bg-[#fef2f2]' : 'bg-white hover:bg-[#f9fafb]'
                }`}
                onClick={() => toggleModule(m.id)}
              >
                <div className={`w-5 h-5 rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                  selectedModuleIds.has(m.id) ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'
                }`}>
                  {selectedModuleIds.has(m.id) && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-semibold font-display leading-tight ${selectedModuleIds.has(m.id) ? 'text-[#d51520]' : 'text-[#111827]'}`}>{m.title}</p>
                  {m.description && <p className="text-[11px] text-[#4b5563] font-body mt-0.5 truncate">{m.description}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right panel: cohort curriculum */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen01Icon size={14} color="#d51520" strokeWidth={1.5} />
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#d51520] font-display">Cohort Curriculum</p>
            </div>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
              {selectedModuleIds.size} of {allModules.length} modules selected — click a module to configure its lessons
            </p>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={12} color="#d51520" strokeWidth={1.5} />{error}
              </p>
            )}
            <button onClick={() => { setMode('read'); load() }}
              className="h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button onClick={saveCurriculum} disabled={saving || !hasChanges}
              className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[12px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center gap-2">
              {saving && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
              Save Curriculum
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {selectedModuleIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                <BookOpen01Icon size={24} color="#d1d5db" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No modules selected</p>
              <p className="text-[13px] text-[#4b5563] font-body max-w-[280px]">Select modules from the programme pool on the left</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {allModules.filter(m => selectedModuleIds.has(m.id)).map((m, idx) => {
                const configuredCount = selectedLessonsPerModule[m.id]?.size ?? null
                const customCount     = customLessonsPerModule[m.id]?.length ?? 0
                const programCount    = m.lessons?.length ?? 0
                return (
                  <button key={m.id} onClick={() => openModuleLessons(m)}
                    className="flex items-center gap-3 rounded-[10px] border border-[#d51520] bg-[#fef2f2] px-4 py-3.5 text-left hover:bg-[#fde8e8] transition-all">
                    <div className="w-6 h-6 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-white font-display">{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#d51520] font-display truncate">{m.title}</p>
                      <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
                        {configuredCount !== null
                          ? `${configuredCount + customCount} lesson${configuredCount + customCount !== 1 ? 's' : ''} selected`
                          : programCount > 0
                          ? `${programCount} lesson${programCount !== 1 ? 's' : ''} available — click to configure`
                          : 'Click to add lessons'}
                      </p>
                    </div>
                    <ArrowRight01Icon size={14} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Tab: People (merged Members + Enrollments) ────────────────────────────────
function PeopleTab({ cohortId }: { cohortId: string }) {
  const [rows, setRows]                   = useState<PersonRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<PersonRow | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [membRes, enrollRes] = await Promise.allSettled([
          apiClient.get(`/admin/cohorts/${cohortId}/members?size=100`),
          apiClient.get(`/admin/cohort-enrollments?cohort_id=${cohortId}&size=100`),
        ])

        const members: Member[] = membRes.status === 'fulfilled'
          ? (() => { const d = unwrap<{ members?: Member[] }>(membRes.value.data); return Array.isArray(d?.members) ? d.members : [] })()
          : []

        const enrollments: Enrollment[] = enrollRes.status === 'fulfilled'
          ? (() => { const d = unwrap<{ enrollments?: Enrollment[] }>(enrollRes.value.data); return Array.isArray(d?.enrollments) ? d.enrollments : [] })()
          : []

        const roleByEmail: Record<string, string> = {}
        members.forEach(m => {
          if (m.user?.email) roleByEmail[m.user.email] = m.role ?? ''
        })

        const enrollmentRows: PersonRow[] = enrollments.map(e => ({
          key:              `e-${e.id}`,
          name:             userName(e.user),
          email:            e.user?.email ?? '—',
          role:             roleByEmail[e.user?.email ?? ''] ?? '',
          enrollmentType:   (e.enrollmentType ?? e.enrollment_type ?? 'INDIVIDUAL').toUpperCase(),
          seats:            e.seatsPurchased ?? e.seats_purchased ?? '—',
          seatsPurchased:   e.seatsPurchased ?? e.seats_purchased ?? null,
          seatsUsed:        e.seatsUsed ?? e.seats_used ?? null,
          enrollmentStatus: e.status ?? '—',
          completionStatus: (e.completionStatus ?? e.completion_status ?? 'NOT_STARTED').replace(/_/g, ' '),
          joinedAt:         formatDateTime(e.created_at ?? e.createdAt),
          organizationName: e.organizationName ?? e.organization_name ?? '',
        }))

        const enrollmentEmails = new Set(enrollments.map(e => e.user?.email ?? ''))
        const memberOnlyRows: PersonRow[] = members
          .filter(m => m.user?.email && !enrollmentEmails.has(m.user.email))
          .map(m => ({
            key:              `m-${m.id}`,
            name:             userName(m.user),
            email:            m.user?.email ?? '—',
            role:             m.role ?? '',
            enrollmentType:   'TEAM MEMBER',
            seats:            '—',
            seatsPurchased:   null,
            seatsUsed:        null,
            enrollmentStatus: m.membershipStatus ?? m.membership_status ?? '—',
            completionStatus: '—',
            joinedAt:         '—',
            organizationName: '',
          }))

        setRows([...enrollmentRows, ...memberOnlyRows])
      } catch { setRows([]) } finally { setLoading(false) }
    }
    load()
  }, [cohortId])

  const COMP_STYLE: Record<string, string> = {
    'COMPLETED':    'bg-[#ecfdf3] text-[#027a48]',
    'IN PROGRESS':  'bg-[#eff6ff] text-[#1d4ed8]',
    'NOT STARTED':  'bg-[#f3f4f6] text-[#4b5563]',
  }
  const STATUS_STYLE: Record<string, string> = {
    ENROLLED:   'bg-[#ecfdf3] text-[#027a48]',
    ACTIVE:     'bg-[#ecfdf3] text-[#027a48]',
    PENDING:    'bg-[#fffbeb] text-[#b45309]',
    CANCELLED:  'bg-[#fef2f2] text-[#d51520]',
  }
  const ROLE_STYLE: Record<string, string> = {
    STUDENT:     'bg-[#ecfdf3] text-[#027a48]',
    INSTRUCTOR:  'bg-[#eff6ff] text-[#1d4ed8]',
    ADMIN:       'bg-[#fef2f2] text-[#d51520]',
    TEAM_LEAD:   'bg-[#fffbeb] text-[#b45309]',
  }

  const isTeam = (type: string) => type === 'TEAM' || type === 'TEAM MEMBER' || type === 'TEAM_MEMBER'

  // Find all teammates of the selected person (same non-empty org name)
  const teammates = selectedPerson?.organizationName
    ? rows.filter(r => r.organizationName === selectedPerson.organizationName)
    : []

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
    </div>
  )

  return (
    <>
      <div className="px-6 py-4 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
              {['Name', 'Email', 'Role', 'Plan', 'Seats', 'Status', 'Progress', 'Joined'].map(h => (
                <th key={h}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display ${
                    h === 'Seats' ? 'text-center' : 'text-left'
                  }`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#4b5563] font-body">
                  No people in this cohort yet
                </td>
              </tr>
            ) : rows.map(r => (
              <tr
                key={r.key}
                onClick={() => setSelectedPerson(r)}
                className={`border-b border-[#f3f4f6] cursor-pointer transition-colors ${
                  selectedPerson?.key === r.key ? 'bg-[#fef2f2]' : 'hover:bg-[#fafafa]'
                }`}
              >
                <td className="px-4 py-3.5">
                  <p className="text-[13px] font-semibold text-[#111827] font-display">{r.name}</p>
                  {r.organizationName && (
                    <p className="text-[11px] text-[#4b5563] font-body mt-0.5 flex items-center gap-1">
                      <Building01Icon size={10} color="#4b5563" strokeWidth={1.5} />
                      {r.organizationName}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[12px] text-[#4b5563] font-body">{r.email}</p>
                </td>
                <td className="px-4 py-3.5">
                  {r.role
                    ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${ROLE_STYLE[r.role.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                        {r.role}
                      </span>
                    : <span className="text-[12px] text-[#d1d5db] font-body">—</span>
                  }
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${
                    isTeam(r.enrollmentType) ? 'bg-[#fffbeb] text-[#b45309]' : 'bg-[#f3f4f6] text-[#4b5563]'
                  }`}>
                    {r.enrollmentType}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <span className="text-[13px] font-semibold text-[#111827] font-display">{r.seats}</span>
                </td>
                <td className="px-4 py-3.5">
                  {r.enrollmentStatus !== '—'
                    ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${STATUS_STYLE[r.enrollmentStatus.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>
                        {r.enrollmentStatus}
                      </span>
                    : <span className="text-[12px] text-[#d1d5db] font-body">—</span>
                  }
                </td>
                <td className="px-4 py-3.5">
                  {r.completionStatus !== '—'
                    ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${COMP_STYLE[r.completionStatus.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>
                        {r.completionStatus}
                      </span>
                    : <span className="text-[12px] text-[#d1d5db] font-body">—</span>
                  }
                </td>
                <td className="px-4 py-3.5">
                  <p className="text-[12px] text-[#4b5563] font-body whitespace-nowrap">{r.joinedAt}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Backdrop ─────────────────────────────────────────────────────────── */}
      {selectedPerson && (
        <div
          className="fixed inset-0 bg-black/20 z-[49]"
          onClick={() => setSelectedPerson(null)}
        />
      )}

      {/* ── Detail panel (always in DOM for slide animation) ─────────────────── */}
      <div className={`fixed right-0 top-0 h-screen w-[420px] bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
        selectedPerson ? 'translate-x-0' : 'translate-x-full'
      }`}>
        {selectedPerson && (
          <>
            {/* Panel header */}
            <div className="px-6 pt-6 pb-5 border-b border-[#f3f4f6] flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                    <span className="text-[18px] font-bold text-[#d51520] font-display">
                      {getInitials(selectedPerson.name)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold text-[#111827] font-display leading-tight">
                      {selectedPerson.name}
                    </h3>
                    <p className="text-[13px] text-[#4b5563] font-body mt-0.5 break-all">
                      {selectedPerson.email}
                    </p>
                    {selectedPerson.role && (
                      <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${
                        ROLE_STYLE[selectedPerson.role.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#374151]'
                      }`}>
                        {selectedPerson.role}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors flex-shrink-0 mt-0.5"
                >
                  <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

              {/* Enrollment details */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4b5563] font-display mb-3">
                  Enrollment Details
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  <div>
                    <p className="text-[11px] text-[#4b5563] font-body mb-0.5">Plan Type</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                      isTeam(selectedPerson.enrollmentType) ? 'bg-[#fffbeb] text-[#b45309]' : 'bg-[#f3f4f6] text-[#4b5563]'
                    }`}>
                      {selectedPerson.enrollmentType}
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#4b5563] font-body mb-0.5">Enrollment Status</p>
                    {selectedPerson.enrollmentStatus !== '—'
                      ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                          STATUS_STYLE[selectedPerson.enrollmentStatus.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#4b5563]'
                        }`}>
                          {selectedPerson.enrollmentStatus}
                        </span>
                      : <span className="text-[13px] text-[#d1d5db] font-body">—</span>
                    }
                  </div>
                  <div>
                    <p className="text-[11px] text-[#4b5563] font-body mb-0.5">Completion</p>
                    {selectedPerson.completionStatus !== '—'
                      ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${
                          COMP_STYLE[selectedPerson.completionStatus.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#4b5563]'
                        }`}>
                          {selectedPerson.completionStatus}
                        </span>
                      : <span className="text-[13px] text-[#d1d5db] font-body">—</span>
                    }
                  </div>
                  <div>
                    <p className="text-[11px] text-[#4b5563] font-body mb-0.5">Date Joined</p>
                    <p className="text-[13px] font-medium text-[#374151] font-body">{selectedPerson.joinedAt}</p>
                  </div>
                  {(selectedPerson.seatsPurchased !== null) && (
                    <div className="col-span-2">
                      <p className="text-[11px] text-[#4b5563] font-body mb-0.5">Seats</p>
                      <p className="text-[13px] font-medium text-[#374151] font-body">
                        {selectedPerson.seatsPurchased} purchased
                        {selectedPerson.seatsUsed !== null && ` · ${selectedPerson.seatsUsed} used`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Organisation / Team section — only for TEAM leads (not team members) */}
              {selectedPerson.enrollmentType === 'TEAM' && selectedPerson.organizationName && teammates.length > 0 && (
                <div>
                  <div className="h-px bg-[#f3f4f6] -mx-6 mb-5" />
                  <div className="flex items-center gap-2 mb-3">
                    <Building01Icon size={14} color="#4b5563" strokeWidth={1.5} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4b5563] font-display">
                      Organisation
                    </p>
                  </div>
                  {/* Org name */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-[8px] bg-[#fffbeb] flex items-center justify-center flex-shrink-0">
                      <Building01Icon size={14} color="#b45309" strokeWidth={1.5} />
                    </div>
                    <p className="text-[14px] font-semibold text-[#111827] font-display">
                      {selectedPerson.organizationName}
                    </p>
                  </div>

                  {/* Team members list */}
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#4b5563] font-display mb-2">
                    Team Members ({teammates.length})
                  </p>
                  <div className="flex flex-col gap-1">
                    {teammates.map(t => (
                      <div
                        key={t.key}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] border transition-colors cursor-pointer ${
                          t.key === selectedPerson.key
                            ? 'border-[#d51520] bg-[#fef2f2]'
                            : 'border-[#f3f4f6] bg-[#f9fafb] hover:bg-[#f3f4f6]'
                        }`}
                        onClick={() => setSelectedPerson(t)}
                      >
                        <div className="w-8 h-8 rounded-full bg-[#e5e7eb] flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-[#374151] font-display">
                            {getInitials(t.name)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] font-semibold font-display truncate ${
                            t.key === selectedPerson.key ? 'text-[#d51520]' : 'text-[#111827]'
                          }`}>
                            {t.name}
                            {t.key === selectedPerson.key && (
                              <span className="ml-1.5 text-[9px] font-bold text-[#d51520] font-display uppercase tracking-wide">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[#4b5563] font-body truncate">{t.email}</p>
                        </div>
                        <span className={`flex-shrink-0 text-[9px] font-bold font-display px-1.5 py-0.5 rounded-[4px] uppercase tracking-wide ${
                          isTeam(t.enrollmentType) && t.enrollmentType !== 'TEAM MEMBER' && t.enrollmentType !== 'TEAM_MEMBER'
                            ? 'bg-[#fffbeb] text-[#b45309]'
                            : 'bg-[#f3f4f6] text-[#4b5563]'
                        }`}>
                          {t.enrollmentType === 'TEAM' ? 'Lead' : 'Member'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Tab: Reviews ──────────────────────────────────────────────────────────────
function ReviewsTab({ cohortId }: { cohortId: string }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get(`/admin/cohorts/${cohortId}/reviews?size=50`).then(res => {
      const data = unwrap<{ reviews?: Review[] }>(res.data)
      setReviews(Array.isArray(data?.reviews) ? data.reviews : [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [cohortId])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loading01Icon size={20} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
    </div>
  )

  return (
    <div className="px-6 py-4 overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
            {['Reviewer', 'Rating', 'Comment', 'Date'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reviews.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-12 text-center text-[13px] text-[#4b5563] font-body">No reviews yet</td></tr>
          ) : reviews.map(r => (
            <tr key={r.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
              <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{r.is_anonymous ? 'Anonymous' : userName(r.user)}</p></td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} size={13} color={i < (r.rating ?? 0) ? '#d97706' : '#e5e7eb'} strokeWidth={1.5} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3.5 max-w-[300px]"><p className="text-[12px] text-[#4b5563] font-body line-clamp-2">{r.comment ?? '—'}</p></td>
              <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{formatDate(r.created_at)}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = ['Curriculum', 'People', 'Reviews'] as const
type Tab = typeof TABS[number]

const STATUS_STYLE: Record<string, string> = {
  OPEN: 'bg-[#ecfdf3] text-[#027a48]', UPCOMING: 'bg-[#eff6ff] text-[#1d4ed8]', CLOSED: 'bg-[#f3f4f6] text-[#4b5563]',
}

export default function CohortDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const cohortId = params.cohortId as string

  const [cohort, setCohort]       = useState<Cohort | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('Curriculum')
  const [loading, setLoading]     = useState(true)
  const { setCollapsed }          = useSidebar()

  // Auto-collapse sidebar when Curriculum tab is active
  useEffect(() => {
    setCollapsed(activeTab === 'Curriculum')
    return () => setCollapsed(false)
  }, [activeTab, setCollapsed])

  useEffect(() => {
    async function loadCohort() {
      try {
        const res = await apiClient.get(`/admin/cohorts/${cohortId}`)
        const c   = unwrap<Cohort>(res.data)
        setCohort(c)

        // Supplement dates from the program cohorts list if the single endpoint doesn't return them
        const pId = c?.programId ?? c?.program_id ?? c?.program?.id ?? null
        if (pId) {
          try {
            const listRes = await apiClient.get(`/admin/programs/${pId}/cohorts?size=50`)
            const ld = unwrap<{ cohorts?: Cohort[]; content?: Cohort[] } | Cohort[]>(listRes.data)
            const list: Cohort[] = Array.isArray(ld)
              ? ld
              : (ld as { cohorts?: Cohort[]; content?: Cohort[] })?.cohorts
                ?? (ld as { cohorts?: Cohort[]; content?: Cohort[] })?.content
                ?? []
            const match = list.find(co => co.id === Number(cohortId))
            if (match) {
              setCohort(prev => prev ? {
                ...prev,
                start_date: prev.start_date ?? match.start_date,
                end_date:   prev.end_date   ?? match.end_date,
                startDate:  prev.startDate  ?? match.startDate,
                endDate:    prev.endDate    ?? match.endDate,
              } : prev)
            }
          } catch { /* ignore — dates stay as returned by single cohort endpoint */ }
        }
      } catch { /* ignore */ } finally { setLoading(false) }
    }
    loadCohort()
  }, [cohortId])

  const programId = cohort?.programId ?? cohort?.program_id ?? cohort?.program?.id ?? null

  function goBack() {
    if (programId) {
      router.push(`/admin/programs/${programId}`)
    } else {
      router.back()
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        <button onClick={goBack}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        {loading
          ? <div className="h-5 w-56 bg-[#f3f4f6] rounded animate-pulse" />
          : (
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                {cohort?.program && (
                  <p className="text-[11px] text-[#4b5563] font-body truncate">{cohort.program.title}</p>
                )}
                <h1 className="text-[16px] font-bold text-[#111827] font-display truncate">{cohort?.title ?? 'Cohort'}</h1>
              </div>
              {cohort?.status && (
                <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display ${STATUS_STYLE[cohort.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                  {cohort.status}
                </span>
              )}
            </div>
          )
        }
        {cohort && (
          <div className="flex items-center gap-4 text-[12px] text-[#4b5563] font-body ml-auto flex-shrink-0">
            <span>Start: <span className="text-[#374151] font-medium">{formatDate(cohort.start_date ?? cohort.startDate)}</span></span>
            <span>End: <span className="text-[#374151] font-medium">{formatDate(cohort.end_date ?? cohort.endDate)}</span></span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-6 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
              activeTab === tab ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#4b5563] hover:text-[#374151]'
            }`}>
            {tab === 'Curriculum' && <BookOpen01Icon  size={14} strokeWidth={1.5} />}
            {tab === 'People'     && <UserGroup02Icon size={14} strokeWidth={1.5} />}
            {tab === 'Reviews'    && <StarIcon        size={14} strokeWidth={1.5} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div
        className="flex-1 bg-white"
        style={activeTab === 'Curriculum' ? { display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { overflowY: 'auto' }}
      >
        {activeTab === 'Curriculum' && <CurriculumTab cohortId={cohortId} programId={programId} />}
        {activeTab === 'People'     && <PeopleTab     cohortId={cohortId} />}
        {activeTab === 'Reviews'    && <ReviewsTab    cohortId={cohortId} />}
      </div>
    </div>
  )
}
