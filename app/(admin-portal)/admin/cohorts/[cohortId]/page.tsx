'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft01Icon, Loading01Icon, UserGroup02Icon,
  StarIcon, BookOpen01Icon, CheckmarkCircle01Icon,
  AlertCircleIcon, DatabaseIcon, Search01Icon,
  ArrowDown01Icon, ArrowRight01Icon, VideoReplayIcon, File01Icon,
  PencilEdit01Icon, Cancel01Icon, Building01Icon, UserAdd01Icon,
  Certificate01Icon, Payment01Icon, Invoice01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import { useSidebar } from '@/lib/sidebar-context'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Cohort {
  id: number; title: string; status?: string
  start_date?: string; end_date?: string
  startDate?: string; endDate?: string
  max_students?: number
  // Programme linkage — broad naming variants to survive API inconsistencies
  program_id?: number; programId?: number
  programme_id?: number; programmeId?: number
  program?: { id: number; title: string }
  programme?: { id: number; title: string }
}
interface ProgramModuleLesson   { id: number; title: string; content_type: string; duration?: number }
interface ProgramModuleResource { id: number; title: string; type: string; link?: string }
interface ProgramModule {
  id: number; title: string; description?: string; order_index?: number; status?: string
  lessons?: ProgramModuleLesson[]
  resources?: ProgramModuleResource[]
}
interface CohortModule  { id: number; program_module_id?: number; programModuleId?: number; title?: string; program_id?: number; programId?: number }

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

interface AdminCertificate {
  id: number
  user_id?: number; userId?: number
  cohort_id?: number; cohortId?: number
  user?: { id?: number; email?: string }
  certificate_number?: string; certificateNumber?: string
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
  userId: number | null         // needed for certificate POST
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
function CurriculumTab({ cohortId, programId, parentLoading, onProgramIdResolved }: { cohortId: string; programId: number | null; parentLoading?: boolean; onProgramIdResolved?: (id: number) => void }) {
  const [allModules, setAllModules]               = useState<ProgramModule[]>([])
  const [cohortModuleIds, setCohortModuleIds]     = useState<Set<number>>(new Set())
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<number>>(new Set())
  const [selectedLessonIds, setSelectedLessonIds] = useState<Set<number>>(new Set())
  const [lessonsCache, setLessonsCache]           = useState<Record<number, ProgramModuleLesson[]>>({})
  const [expandedModuleId, setExpandedModuleId]   = useState<number | null>(null)
  const [readExpandedId, setReadExpandedId]       = useState<number | null>(null)
  const [loadingModuleId, setLoadingModuleId]     = useState<number | null>(null)
  const [loading, setLoading]                     = useState(true)
  const [entering, setEntering]                   = useState(false)
  const [saving, setSaving]                       = useState(false)
  const [error, setError]                         = useState('')
  const [success, setSuccess]                     = useState(false)
  const [mode, setMode]                           = useState<'read' | 'edit'>('read')
  // Holds the resolved program ID — may differ from prop if recovered from modules response
  const [effectiveProgramId, setEffectiveProgramId] = useState<number | null>(programId)
  // Ref so load() can read the latest resolved ID without adding it to deps (avoids infinite loop)
  const effectiveProgramIdRef = useRef<number | null>(programId)
  useEffect(() => { effectiveProgramIdRef.current = effectiveProgramId }, [effectiveProgramId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let resolvedProgramId = programId ?? effectiveProgramIdRef.current

      // Step 1: Try the admin cohort detail endpoint first — it may embed assigned modules
      // in its response (the student endpoint is enrollment-gated and returns nothing for admins)
      let foundModulesFromAdmin = false
      const adminCohortRes = await apiClient.get(`/admin/cohorts/${cohortId}`).catch(() => null)
      if (adminCohortRes) {
        const adRaw = unwrap<Record<string, unknown>>(adminCohortRes.data)
        // Handle both { id, program_id, ... } and { cohort: { id, program_id, ... } } shapes
        const ad = (adRaw?.cohort && typeof adRaw.cohort === 'object'
          ? adRaw.cohort
          : adRaw) as Record<string, unknown>
        const rawMods =
          (ad?.modules as CohortModule[] | undefined) ??
          (ad?.cohort_modules as CohortModule[] | undefined) ??
          ((adRaw?.content as Record<string, unknown>)?.modules as CohortModule[] | undefined) ??
          []
        if (Array.isArray(rawMods) && rawMods.length > 0) {
          foundModulesFromAdmin = true
          setCohortModuleIds(new Set(rawMods.map((m: CohortModule) => m.program_module_id ?? m.programModuleId ?? 0).filter(Boolean)))
          if (!resolvedProgramId) {
            const fromMod = rawMods[0].program_id ?? rawMods[0].programId ?? null
            if (fromMod) { resolvedProgramId = fromMod; setEffectiveProgramId(fromMod); onProgramIdResolved?.(fromMod) }
          }
        }
        // Extract programId from the cohort record itself (present even when no modules are embedded)
        if (!resolvedProgramId) {
          const pid =
            (ad?.program_id as number | undefined) ??
            (ad?.programId as number | undefined) ??
            (ad?.programme_id as number | undefined) ??
            (ad?.programmeId as number | undefined) ??
            ((ad?.program as Record<string, unknown>)?.id as number | undefined) ??
            ((ad?.programme as Record<string, unknown>)?.id as number | undefined) ??
            null
          if (pid) { resolvedProgramId = pid; setEffectiveProgramId(pid); onProgramIdResolved?.(pid) }
        }
      }

      // Step 1b: Fallback to student endpoint
      // NOTE: GET /admin/cohorts/{id}/content/selection returns 500 (POST-only — no GET).
      // Backend needs to either add a GET endpoint or embed modules in the cohort detail response.
      if (!foundModulesFromAdmin) {
        const cohortModRes = await apiClient.get(`/cohorts/${cohortId}/modules`).catch(() => null)
        if (cohortModRes) {
          const d = unwrap<{ modules?: CohortModule[] } | CohortModule[]>(cohortModRes.data)
          const mods: CohortModule[] = Array.isArray(d) ? d : ((d as { modules?: CohortModule[] })?.modules ?? [])
          if (mods.length > 0) {
            foundModulesFromAdmin = true
            setCohortModuleIds(new Set(mods.map(m => m.program_module_id ?? m.programModuleId ?? 0).filter(Boolean)))
            if (!resolvedProgramId) {
              const fromMod = mods[0].program_id ?? mods[0].programId ?? null
              if (fromMod) { resolvedProgramId = fromMod; setEffectiveProgramId(fromMod); onProgramIdResolved?.(fromMod) }
            }
          }
        }
      }


      // Step 2: If programId still unknown, search all programmes to find which one owns this cohort
      if (!resolvedProgramId) {
        const progsRes = await apiClient.get('/admin/programs?size=100').catch(() => null)
        if (progsRes) {
          const pd = unwrap<{ programs?: { id: number }[] } | { id: number }[]>(progsRes.data)
          const progs: { id: number }[] = Array.isArray(pd) ? pd : (pd as { programs?: { id: number }[] })?.programs ?? []
          for (const prog of progs) {
            try {
              const cRes = await apiClient.get(`/admin/programs/${prog.id}/cohorts?size=100`)
              const cd = unwrap<{ cohorts?: { id: number }[]; content?: { id: number }[] } | { id: number }[]>(cRes.data)
              const cohorts: { id: number }[] = Array.isArray(cd) ? cd : (cd as { cohorts?: { id: number }[]; content?: { id: number }[] })?.cohorts ?? (cd as { cohorts?: { id: number }[]; content?: { id: number }[] })?.content ?? []
              if (cohorts.some(c => c.id === Number(cohortId))) {
                resolvedProgramId = prog.id
                setEffectiveProgramId(prog.id)
                onProgramIdResolved?.(prog.id)
                break
              }
            } catch { /* ignore */ }
          }
        }
      }

      // Step 3: Load programme modules (the pool to pick from in edit mode)
      if (resolvedProgramId) {
        const progModRes = await apiClient.get(`/admin/programs/${resolvedProgramId}/modules?status=PUBLISHED`).catch(() => null)
        if (progModRes) {
          const d = unwrap<{ modules?: ProgramModule[]; content?: ProgramModule[] } | ProgramModule[]>(progModRes.data)
          const mods: ProgramModule[] = Array.isArray(d)
            ? d
            : ((d as { modules?: ProgramModule[]; content?: ProgramModule[] })?.modules
               ?? (d as { modules?: ProgramModule[]; content?: ProgramModule[] })?.content
               ?? [])
          setAllModules(mods)
          const seedCache: Record<number, ProgramModuleLesson[]> = {}
          mods.forEach(m => { if (m.lessons?.length) seedCache[m.id] = m.lessons })
          if (Object.keys(seedCache).length > 0) {
            setLessonsCache(prev => ({ ...seedCache, ...prev }))
          }
        }
      }
    } finally { setLoading(false) }
  }, [cohortId, programId, onProgramIdResolved])

  // Don't start loading until the parent page has resolved the cohort (and thus programId)
  useEffect(() => {
    if (parentLoading) return
    load()
  }, [load, parentLoading])

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function getLessons(moduleId: number): ProgramModuleLesson[] {
    return lessonsCache[moduleId] ?? allModules.find(m => m.id === moduleId)?.lessons ?? []
  }

  function getModuleState(moduleId: number): 'full' | 'partial' | 'none' {
    if (!selectedModuleIds.has(moduleId)) return 'none'
    const lessons = getLessons(moduleId)
    if (lessons.length === 0) return 'full'
    const count = lessons.filter(l => selectedLessonIds.has(l.id)).length
    if (count === lessons.length) return 'full'
    return 'partial'
  }

  async function fetchLessons(module: ProgramModule): Promise<ProgramModuleLesson[]> {
    const cached = getLessons(module.id)
    if (cached.length > 0) return cached
    if (!effectiveProgramId) return []
    setLoadingModuleId(module.id)
    try {
      const res = await apiClient.get(`/admin/programs/${effectiveProgramId}/modules/${module.id}/lessons?status=PUBLISHED`)
      const d = unwrap<{ lessons?: ProgramModuleLesson[]; content?: ProgramModuleLesson[] } | ProgramModuleLesson[]>(res.data)
      const lessons: ProgramModuleLesson[] = Array.isArray(d)
        ? d
        : ((d as { lessons?: ProgramModuleLesson[]; content?: ProgramModuleLesson[] })?.lessons
           ?? (d as { lessons?: ProgramModuleLesson[]; content?: ProgramModuleLesson[] })?.content
           ?? [])
      setLessonsCache(prev => ({ ...prev, [module.id]: lessons }))
      return lessons
    } catch { return [] } finally { setLoadingModuleId(null) }
  }

  async function toggleExpand(module: ProgramModule) {
    if (expandedModuleId === module.id) { setExpandedModuleId(null); return }
    setExpandedModuleId(module.id)
    await fetchLessons(module)
  }

  async function toggleModule(module: ProgramModule) {
    const isCurrentlySelected = selectedModuleIds.has(module.id)
    if (isCurrentlySelected) {
      // Deselect: remove module and all its lessons
      setSelectedModuleIds(prev => { const next = new Set(prev); next.delete(module.id); return next })
      const lessons = getLessons(module.id)
      if (lessons.length > 0) {
        setSelectedLessonIds(prev => { const next = new Set(prev); lessons.forEach(l => next.delete(l.id)); return next })
      }
    } else {
      // Select: add module, then fetch and add all lessons
      setSelectedModuleIds(prev => new Set(Array.from(prev).concat(module.id)))
      const lessons = getLessons(module.id).length > 0 ? getLessons(module.id) : await fetchLessons(module)
      if (lessons.length > 0) {
        setSelectedLessonIds(prev => { const next = new Set(prev); lessons.forEach(l => next.add(l.id)); return next })
      }
    }
  }

  function toggleLesson(lessonId: number, moduleId: number) {
    setSelectedLessonIds(prev => {
      const next = new Set(prev)
      if (next.has(lessonId)) { next.delete(lessonId) } else { next.add(lessonId) }
      return next
    })
    // Ensure parent module is selected when any lesson is ticked
    setSelectedModuleIds(prev => new Set(Array.from(prev).concat(moduleId)))
  }

  async function enterEditMode() {
    setEntering(true)
    try {
      const assignedModules = allModules.filter(m => cohortModuleIds.has(m.id))
      const toFetch = assignedModules.filter(m => getLessons(m.id).length === 0)
      const mergedCache = { ...lessonsCache }

      if (toFetch.length > 0 && effectiveProgramId) {
        const results = await Promise.allSettled(
          toFetch.map(m =>
            apiClient.get(`/admin/programs/${effectiveProgramId}/modules/${m.id}/lessons?status=PUBLISHED`).then(res => {
              const d = unwrap<{ lessons?: ProgramModuleLesson[] } | ProgramModuleLesson[]>(res.data)
              const lessons: ProgramModuleLesson[] = Array.isArray(d) ? d : ((d as { lessons?: ProgramModuleLesson[] })?.lessons ?? [])
              return { moduleId: m.id, lessons }
            })
          )
        )
        results.forEach(r => { if (r.status === 'fulfilled') mergedCache[r.value.moduleId] = r.value.lessons })
        setLessonsCache(mergedCache)
      }

      // Pre-select modules and their lessons from what's already assigned to the cohort
      setSelectedModuleIds(new Set(assignedModules.map(m => m.id)))
      const preSelected = new Set<number>()
      assignedModules.forEach(m => {
        ;(mergedCache[m.id] ?? m.lessons ?? []).forEach(l => preSelected.add(l.id))
      })
      setSelectedLessonIds(preSelected)
    } finally {
      setEntering(false)
      setMode('edit')
    }
  }

  async function saveCurriculum() {
    setSaving(true); setError('')
    try {
      const selectedModules = allModules.filter(m => selectedModuleIds.has(m.id))
      // Build reverse map: lessonId → moduleId — seed from both sources
      const lessonModuleMap = new Map<number, number>()
      allModules.forEach(m => { (m.lessons ?? []).forEach(l => lessonModuleMap.set(l.id, m.id)) })
      Object.entries(lessonsCache).forEach(([moduleId, lessons]) => {
        lessons.forEach(l => lessonModuleMap.set(l.id, parseInt(moduleId)))
      })

      const now = new Date().toISOString()

      const res = await apiClient.post(`/admin/cohorts/${cohortId}/content/selection`, {
        modules: selectedModules.map((m, i) => ({
          program_module_id: m.id,
          order_index:       i + 1,
          release_date:      now,
          visibility_status: 'PUBLISHED',
        })),
        lessons: Array.from(selectedLessonIds)
          .map((lid, i) => {
            const mid = lessonModuleMap.get(lid)
            return mid ? {
              program_lesson_id: lid,
              program_module_id: mid,
              order_index:       i + 1,
              release_date:      now,
              visibility_status: 'PUBLISHED',
            } : null
          })
          .filter((l): l is { program_lesson_id: number; program_module_id: number; order_index: number; release_date: string; visibility_status: string } => l !== null),
        resources: [],
      })

      // Read saved program_module_ids back from the response so admin state
      // reflects exactly what the backend persisted
      const saved = (res.data as { data?: { modules?: { program_module_id?: number }[] } })?.data
      const savedIds = saved?.modules?.map(m => m.program_module_id ?? 0).filter(Boolean) ?? []
      setCohortModuleIds(new Set(savedIds.length > 0 ? savedIds : selectedModules.map(m => m.id)))
      setSelectedModuleIds(new Set())
      setSelectedLessonIds(new Set())
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      setMode('read')
      setExpandedModuleId(null)
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const selectedModuleCount = selectedModuleIds.size

  // ── READ MODE ─────────────────────────────────────────────────────────────────
  if (mode === 'read') {
    const assignedModules = allModules.filter(m => cohortModuleIds.has(m.id))
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0 bg-white">
          <div>
            <p className="text-[13px] font-semibold text-[#111827] font-display">
              {(loading || parentLoading) ? '…' : `${cohortModuleIds.size} module${cohortModuleIds.size !== 1 ? 's' : ''} assigned to this cohort`}
            </p>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">Click &ldquo;Edit Curriculum&rdquo; to change assignments</p>
          </div>
          <div className="flex items-center gap-3">
            {success && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#027a48] font-body">
                <CheckmarkCircle01Icon size={12} color="#027a48" strokeWidth={1.5} /> Saved
              </p>
            )}
            <button onClick={enterEditMode} disabled={entering || loading}
              className="flex items-center gap-2 h-9 px-4 border border-[#e5e7eb] rounded-[8px] text-[12px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors disabled:opacity-50">
              {entering
                ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />
                : <PencilEdit01Icon size={13} color="#374151" strokeWidth={1.5} />}
              Edit Curriculum
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          {(loading || parentLoading) ? (
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
              <button onClick={enterEditMode} disabled={entering}
                className="mt-5 flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors disabled:opacity-50">
                {entering
                  ? <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />
                  : <PencilEdit01Icon size={13} color="white" strokeWidth={1.5} />}
                Edit Curriculum
              </button>
            </div>
          ) : (
            assignedModules.map((m, idx) => {
              const isOpen    = readExpandedId === m.id
              const lessons   = getLessons(m.id)
              const resources = m.resources ?? []
              return (
                <div key={m.id} className="border-b border-[#f3f4f6] last:border-0">
                  <button onClick={async () => {
                    if (readExpandedId === m.id) { setReadExpandedId(null); return }
                    setReadExpandedId(m.id)
                    await fetchLessons(m)
                  }} className="w-full flex items-center gap-3 px-6 py-4 hover:bg-[#f9fafb] transition-colors text-left">
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
                      <span className="text-[11px] text-[#4b5563] font-body">
                        {loadingModuleId === m.id ? '…' : `${lessons.length}L · ${resources.length}R`}
                      </span>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-4 pt-1 bg-[#fafafa] border-t border-[#f3f4f6]">
                      {loadingModuleId === m.id ? (
                        <div className="pl-9 py-3">
                          <div className="h-3 bg-[#e5e7eb] rounded animate-pulse w-1/3" />
                        </div>
                      ) : (
                        <>
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
                        </>
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

  // ── EDIT MODE — single dual panel ─────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel: programme pool */}
      <div className="w-[320px] flex-shrink-0 border-r border-[#f3f4f6] flex flex-col">
        <div className="px-5 py-4 border-b border-[#f3f4f6] bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <DatabaseIcon size={14} color="#4b5563" strokeWidth={1.5} />
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#4b5563] font-display">Programme Pool</p>
          </div>
          <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
            {effectiveProgramId
              ? `${allModules.length} module${allModules.length !== 1 ? 's' : ''} available — tick to include`
              : 'No programme linked to this cohort'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#fafafa]">
          {(loading || parentLoading) ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-5 py-3.5 border-b border-[#f3f4f6] bg-white">
                <div className="w-5 h-5 rounded bg-[#e5e7eb] animate-pulse flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="h-3.5 bg-[#e5e7eb] rounded animate-pulse w-3/4 mb-1.5" />
                  <div className="h-3 bg-[#e5e7eb] rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))
          ) : !effectiveProgramId ? (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-[#4b5563] font-body">Link a programme to this cohort to see the module pool</p>
            </div>
          ) : allModules.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-[#4b5563] font-body">No modules in programme</p>
            </div>
          ) : (
            allModules.map(m => {
              const state      = getModuleState(m.id)
              const isExpanded = expandedModuleId === m.id
              const isLoading  = loadingModuleId === m.id
              const lessons    = getLessons(m.id)
              return (
                <div key={m.id} className="border-b border-[#f3f4f6] last:border-0 bg-white">
                  <div className={`flex items-center gap-2.5 px-4 py-3 transition-colors ${
                    state !== 'none' ? 'bg-[#fef9f9]' : 'hover:bg-[#f9fafb]'
                  }`}>
                    {/* 3-state checkbox */}
                    <button
                      onClick={() => toggleModule(m)}
                      className={`w-5 h-5 rounded-[5px] border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        state === 'full'
                          ? 'bg-[#d51520] border-[#d51520]'
                          : state === 'partial'
                          ? 'bg-white border-[#d51520]'
                          : 'border-[#d1d5db] bg-white hover:border-[#9ca3af]'
                      }`}
                    >
                      {state === 'full' && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {state === 'partial' && (
                        <div className="w-2.5 h-[2px] bg-[#d51520] rounded-full" />
                      )}
                    </button>
                    {/* Title — click to toggle */}
                    <button onClick={() => toggleModule(m)} className="flex-1 min-w-0 text-left">
                      <p className={`text-[13px] font-semibold font-display leading-tight truncate ${
                        state !== 'none' ? 'text-[#d51520]' : 'text-[#111827]'
                      }`}>{m.title}</p>
                      {m.description && (
                        <p className="text-[11px] text-[#6b7280] font-body mt-0.5 truncate">{m.description}</p>
                      )}
                    </button>
                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleExpand(m)}
                      className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
                    >
                      {isLoading
                        ? <Loading01Icon size={13} className="animate-spin" color="#6b7280" strokeWidth={2} />
                        : isExpanded
                        ? <ArrowDown01Icon  size={13} color="#6b7280" strokeWidth={2} />
                        : <ArrowRight01Icon size={13} color="#9ca3af" strokeWidth={2} />
                      }
                    </button>
                  </div>
                  {/* Expanded lessons */}
                  {isExpanded && (
                    <div className="bg-[#f9fafb] border-t border-[#f3f4f6] px-4 py-2">
                      {isLoading ? (
                        <div className="py-3 pl-11">
                          <div className="h-3 bg-[#e5e7eb] rounded animate-pulse w-1/2 mb-2" />
                          <div className="h-3 bg-[#e5e7eb] rounded animate-pulse w-2/3" />
                        </div>
                      ) : lessons.length === 0 ? (
                        <p className="text-[12px] text-[#9ca3af] font-body py-3 pl-11">No lessons in this module</p>
                      ) : (
                        <div className="py-1">
                          {lessons.map(l => {
                            const checked = selectedLessonIds.has(l.id)
                            return (
                              <button key={l.id} onClick={() => toggleLesson(l.id, m.id)}
                                className="w-full flex items-center gap-2.5 py-2 px-1 rounded-[6px] hover:bg-[#f0f0f2] transition-colors text-left group">
                                <div className={`w-4 h-4 rounded-[4px] border-2 flex-shrink-0 flex items-center justify-center transition-all ml-8 ${
                                  checked ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white group-hover:border-[#9ca3af]'
                                }`}>
                                  {checked && (
                                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  )}
                                </div>
                                <VideoReplayIcon size={11} color={checked ? '#d51520' : '#9ca3af'} strokeWidth={1.5} className="flex-shrink-0" />
                                <span className={`flex-1 text-[12px] font-medium font-body truncate min-w-0 ${checked ? 'text-[#d51520]' : 'text-[#374151]'}`}>
                                  {l.title}
                                </span>
                                {l.content_type && (
                                  <span className="text-[10px] text-[#9ca3af] font-body flex-shrink-0">
                                    {l.content_type}{l.duration ? ` · ${l.duration}m` : ''}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right panel: cohort curriculum preview */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <BookOpen01Icon size={14} color="#d51520" strokeWidth={1.5} />
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#d51520] font-display">Cohort Curriculum</p>
            </div>
            <p className="text-[12px] text-[#6b7280] font-body">
              {selectedModuleCount} module{selectedModuleCount !== 1 ? 's' : ''} · {selectedLessonIds.size} lesson{selectedLessonIds.size !== 1 ? 's' : ''} selected
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body max-w-[200px] truncate">
                <AlertCircleIcon size={12} color="#d51520" strokeWidth={1.5} />{error}
              </p>
            )}
            <button onClick={() => { setMode('read'); setExpandedModuleId(null); setSelectedModuleIds(new Set()); setSelectedLessonIds(new Set()); load() }}
              className="h-9 px-4 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button onClick={saveCurriculum} disabled={saving}
              className="h-9 px-4 rounded-[8px] bg-[#d51520] text-[12px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center gap-2 transition-colors">
              {saving && <Loading01Icon size={12} className="animate-spin" strokeWidth={2} />}
              Save Curriculum
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {selectedModuleCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                <BookOpen01Icon size={24} color="#d1d5db" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No modules selected</p>
              <p className="text-[13px] text-[#6b7280] font-body max-w-[280px]">
                Tick modules and lessons from the programme pool on the left
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {allModules.filter(m => getModuleState(m.id) !== 'none').map((m, idx) => {
                const lessons       = getLessons(m.id)
                const selectedForMe = lessons.filter(l => selectedLessonIds.has(l.id))
                const state         = getModuleState(m.id)
                return (
                  <div key={m.id} className={`rounded-[10px] border px-4 py-3.5 transition-colors ${
                    state === 'full' ? 'border-[#fecdca] bg-[#fef2f2]' : 'border-[#e5e7eb] bg-[#f9fafb]'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-white font-display">{idx + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold font-display truncate ${
                          state === 'full' ? 'text-[#d51520]' : 'text-[#111827]'
                        }`}>{m.title}</p>
                        <p className="text-[11px] text-[#6b7280] font-body mt-0.5">
                          {selectedForMe.length} of {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} included
                        </p>
                      </div>
                      {state === 'partial' && (
                        <span className="text-[9px] font-bold font-display px-1.5 py-0.5 rounded-[4px] uppercase bg-[#fffbeb] text-[#b45309] border border-[#fde68a] flex-shrink-0">
                          Partial
                        </span>
                      )}
                      {state === 'full' && (
                        <CheckmarkCircle01Icon size={14} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                      )}
                    </div>
                    {state === 'partial' && selectedForMe.length > 0 && (
                      <div className="mt-2.5 pt-2.5 border-t border-[#e5e7eb] pl-9 flex flex-col gap-1">
                        {selectedForMe.map(l => (
                          <div key={l.id} className="flex items-center gap-2">
                            <VideoReplayIcon size={11} color="#9ca3af" strokeWidth={1.5} className="flex-shrink-0" />
                            <span className="text-[11px] text-[#374151] font-body truncate">{l.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Add Facilitator Modal ─────────────────────────────────────────────────────
interface AdminUserRaw    { id?: number; userId?: number; name?: string; full_name?: string; firstName?: string; first_name?: string; lastName?: string; last_name?: string; email?: string; role?: string; expertise_area?: string }
interface AdminUserResult { id: number; name: string; email: string; role?: string }

function AddFacilitatorModal({ cohortId, onClose, onAdded }: { cohortId: string; onClose: () => void; onAdded: () => void }) {
  const [query, setQuery]         = useState('')
  const [allExperts, setAllExperts] = useState<AdminUserResult[]>([])
  const [loadingExperts, setLoadingExperts] = useState(true)
  const [selected, setSelected]   = useState<AdminUserResult | null>(null)
  const [role, setRole]           = useState<'INSTRUCTOR' | 'ADMIN'>('INSTRUCTOR')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    async function loadExperts() {
      try {
        const res = await apiClient.get('/experts?page=1&size=20')
        const raw = res.data
        const inner = raw?.data ?? raw
        const arr: AdminUserRaw[] = Array.isArray(inner)
          ? inner
          : Array.isArray(inner?.content)  ? inner.content
          : Array.isArray(inner?.experts)  ? inner.experts
          : Array.isArray(inner?.data)     ? inner.data
          : []
        const list: AdminUserResult[] = arr
          .map(u => {
            const id = u.id ?? u.userId ?? 0
            const firstName = u.firstName ?? u.first_name ?? ''
            const lastName  = u.lastName  ?? u.last_name  ?? ''
            const fullName  = `${firstName} ${lastName}`.trim()
            const name = (u.name ?? u.full_name ?? fullName) || u.email || ''
            return { id, name, email: u.email ?? '', role: u.role }
          })
          .filter(u => u.id !== 0)
        setAllExperts(list)
      } catch { setAllExperts([]) } finally { setLoadingExperts(false) }
    }
    loadExperts()
  }, [])

  const results = query.trim()
    ? allExperts.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      )
    : allExperts

  function onQueryChange(v: string) {
    setQuery(v)
    setSelected(null)
  }

  async function handleAdd() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      await apiClient.post(`/admin/cohorts/${cohortId}/facilitators`, { user_id: selected.id, role })
      onAdded()
      onClose()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[480px] min-h-[520px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-bold text-[#111827] font-display">Add Facilitator</h3>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">Assign an instructor or admin to this cohort</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* User search */}
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Search user</label>
            <div className="relative">
              <Search01Icon className="absolute left-3 top-1/2 -translate-y-1/2" size={14} color="#9ca3af" strokeWidth={1.5} />
              <input
                type="text" value={query} onChange={e => onQueryChange(e.target.value)}
                placeholder="Name or email…"
                className="w-full h-10 pl-9 pr-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10"
              />
              {loadingExperts && <Loading01Icon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" color="#9ca3af" strokeWidth={2} />}

              {/* Results dropdown — absolutely positioned so it overlays content below */}
              {results.length > 0 && !selected && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white border border-[#e5e7eb] rounded-[8px] shadow-[0px_4px_8px_rgba(16,24,40,0.10)] overflow-hidden"
                  style={{ maxHeight: '320px', overflowY: 'auto' }}>
                  {results.map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault() // prevent input blur before click fires
                        setSelected(u)
                        setQuery(u.name)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#f9fafb] transition-colors text-left border-b border-[#f3f4f6] last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-[#d51520] font-display">{getInitials(u.name)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111827] font-body truncate">{u.name}</p>
                        <p className="text-[11px] text-[#4b5563] font-body truncate">{u.email}</p>
                      </div>
                      {u.role && (
                        <span className="text-[10px] font-semibold text-[#4b5563] bg-[#f3f4f6] px-2 py-0.5 rounded-full font-display flex-shrink-0">{u.role}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected user chip */}
            {selected && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#fef2f2] border border-[#fecdca] rounded-[8px]">
                <div className="w-7 h-7 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white font-display">{getInitials(selected.name ?? selected.email)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#111827] font-body truncate">{selected.name ?? selected.email}</p>
                  <p className="text-[11px] text-[#4b5563] font-body truncate">{selected.email}</p>
                </div>
                <button onClick={() => { setSelected(null); setQuery('') }} className="text-[#d51520] hover:text-[#b81119]">
                  <Cancel01Icon size={13} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>

          {/* Role picker */}
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Role</label>
            <div className="flex gap-2">
              {(['INSTRUCTOR', 'ADMIN'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold font-display border transition-colors ${
                    role === r
                      ? 'bg-[#fef2f2] border-[#fecdca] text-[#d51520]'
                      : 'bg-white border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
                  }`}>
                  {r === 'INSTRUCTOR' ? 'Instructor' : 'Admin'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex gap-2">
          <button onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
            Cancel
          </button>
          <button onClick={handleAdd} disabled={!selected || saving}
            className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Add Facilitator
          </button>
        </div>
      </div>
    </>
  )
}

// ── Certificate-related shared types ─────────────────────────────────────────
interface AdminCertificateDef {
  id: number
  title?: string; status?: string
  template_url?: string; templateUrl?: string
  cohort_id?: number; cohortId?: number
  program_id?: number; programId?: number
  certificate_type_id?: number; certificateTypeId?: number
  metadata?: { signatories?: string[] }
}
interface CertTypeItem {
  id: number
  name?: string; title?: string
  description?: string; status?: string
  template_url?: string; templateUrl?: string
}
interface SimpleStudent { userId: number; name: string; email: string }

// ── Generate Certificates Modal ───────────────────────────────────────────────

function GenerateCertificatesModal({
  cohortId, programId, rows, initialCertMap, onClose, onDone,
}: {
  cohortId: string
  programId: number | null
  rows: PersonRow[]
  initialCertMap: Map<string, number>
  onClose: () => void
  onDone: (newMap: Map<string, number>) => void
}) {
  const [certMap, setCertMap]         = useState<Map<string, number>>(new Map(initialCertMap))
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [issuing, setIssuing]         = useState(false)
  const [error, setError]             = useState('')
  const [doneCount, setDoneCount]     = useState<number | null>(null)
  const [certDefs, setCertDefs]       = useState<AdminCertificateDef[]>([])
  const [certLoading, setCertLoading] = useState(true)
  const [selectedCertId, setSelectedCertId] = useState<number | null>(null)

  const selectedCert = certDefs.find(c => c.id === selectedCertId) ?? null

  // Fetch all certificate definitions for this cohort on mount
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('cohort_id', cohortId)
    if (programId) params.set('program_id', String(programId))
    apiClient.get(`/admin/certificates?${params}`)
      .then(res => {
        const raw = res.data?.data ?? res.data
        const list: AdminCertificateDef[] = Array.isArray(raw) ? raw : (raw ? [raw] : [])
        setCertDefs(list)
        // Auto-select when there is exactly one certificate
        if (list.length === 1) setSelectedCertId(list[0].id)
      })
      .catch(() => { /* cert def fetch failed — admin can still proceed if backend allows */ })
      .finally(() => setCertLoading(false))
  }, [cohortId, programId])

  // Only students who don't already have a cert are selectable
  const selectable = rows.filter(r => r.userId && !certMap.has(r.email))
  const allSelected = selectable.length > 0 && selectable.every(r => selected.has(r.email))

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectable.map(r => r.email)))
    }
  }

  function toggleRow(email: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(email)) next.delete(email); else next.add(email)
      return next
    })
  }

  async function handleIssue() {
    const targets = rows.filter(r => selected.has(r.email) && r.userId && !certMap.has(r.email))
    if (targets.length === 0) return
    setIssuing(true); setError('')
    try {
      await apiClient.post('/admin/user-certificates/issue', {
        ...(selectedCert?.id                                                              ? { certificate_id: selectedCert.id }  : {}),
        cohort_id:  Number(cohortId),
        user_ids:   targets.map(r => r.userId!),
        ...(selectedCert?.template_url ?? selectedCert?.templateUrl                      ? { file_url: selectedCert.template_url ?? selectedCert.templateUrl } : {}),
      })
      const newMap = new Map(certMap)
      // Mark each issued student in the local map so rows re-render as "already issued"
      targets.forEach(r => { if (!newMap.has(r.email)) newMap.set(r.email, 1) })
      setCertMap(newMap)
      setDoneCount(targets.length)
      onDone(newMap)
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setIssuing(false)
    }
  }

  const newSelectionCount = Array.from(selected).filter(e => !certMap.has(e)).length

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={doneCount !== null ? onClose : undefined} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[540px] max-h-[80vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-[15px] font-bold text-[#111827] font-display">Generate Certificates</h3>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
              Select students to issue a certificate of completion
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* Certificate picker — shown when multiple certs exist for this cohort */}
        {!certLoading && certDefs.length > 1 && doneCount === null && (
          <div className="px-6 py-4 border-b border-[#f3f4f6] bg-[#fafafa] flex-shrink-0">
            <p className="text-[11px] font-semibold text-[#374151] font-display uppercase tracking-wider mb-2">
              Select Certificate to Issue
            </p>
            <div className="flex flex-col gap-2">
              {certDefs.map(cd => (
                <button
                  key={cd.id}
                  onClick={() => setSelectedCertId(cd.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[8px] border text-left transition-colors ${
                    selectedCertId === cd.id
                      ? 'border-[#d51520] bg-[#fef2f2]'
                      : 'border-[#e5e7eb] bg-white hover:border-[#d1d5db]'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    selectedCertId === cd.id ? 'border-[#d51520]' : 'border-[#d1d5db]'
                  }`}>
                    {selectedCertId === cd.id && <div className="w-2 h-2 rounded-full bg-[#d51520]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#111827] font-display truncate">
                      {cd.title ?? `Certificate #${cd.id}`}
                    </p>
                    {cd.status && (
                      <p className="text-[11px] text-[#6b7280] font-body">{cd.status}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty cert state */}
        {!certLoading && certDefs.length === 0 && doneCount === null && (
          <div className="px-6 py-4 border-b border-[#fef2f2] bg-[#fef2f2] flex-shrink-0 flex items-center gap-2">
            <AlertCircleIcon size={14} color="#d51520" strokeWidth={1.5} />
            <p className="text-[12px] text-[#d51520] font-body">
              No certificate template configured for this cohort. Create one under the programme settings first.
            </p>
          </div>
        )}

        {/* Success state */}
        {doneCount !== null ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#ecfdf3] flex items-center justify-center mb-4">
              <CheckmarkCircle01Icon size={28} color="#16a34a" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-bold text-[#111827] font-display mb-1">
              {doneCount} certificate{doneCount !== 1 ? 's' : ''} issued
            </p>
            <p className="text-[13px] text-[#4b5563] font-body mb-6">
              Selected students can now view and download their certificate.
            </p>
            <button onClick={onClose}
              className="h-10 px-6 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Select All bar */}
            <div className="px-6 py-3 border-b border-[#f3f4f6] flex items-center justify-between flex-shrink-0 bg-[#fafafa]">
              <button
                onClick={toggleAll}
                disabled={selectable.length === 0}
                className="flex items-center gap-2.5 text-[13px] font-semibold text-[#374151] font-display hover:text-[#d51520] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center transition-all ${
                  allSelected ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'
                }`}>
                  {allSelected && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                Select All ({selectable.length} eligible)
              </button>
              {newSelectionCount > 0 && (
                <span className="text-[11px] font-semibold text-[#d51520] font-display">
                  {newSelectionCount} selected
                </span>
              )}
            </div>

            {/* Student list */}
            <div className="flex-1 overflow-y-auto">
              {rows.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-[#9ca3af] font-body">
                  No students in this cohort
                </div>
              ) : rows.map(row => {
                const alreadyIssued = certMap.has(row.email)
                const isChecked     = alreadyIssued || selected.has(row.email)
                const canToggle     = !alreadyIssued && !!row.userId
                return (
                  <button
                    key={row.key}
                    onClick={() => canToggle && toggleRow(row.email)}
                    disabled={!canToggle}
                    className={`w-full flex items-center gap-3.5 px-6 py-3.5 border-b border-[#f3f4f6] text-left transition-colors ${
                      alreadyIssued ? 'bg-[#f9fafb] cursor-default' : canToggle ? 'hover:bg-[#fef2f2] cursor-pointer' : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      isChecked ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'
                    }`}>
                      {isChecked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="w-9 h-9 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                      <span className="text-[13px] font-bold text-[#d51520] font-display">{getInitials(row.name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{row.name}</p>
                      <p className="text-[12px] text-[#4b5563] font-body truncate">{row.email}</p>
                    </div>
                    {alreadyIssued && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Certificate01Icon size={12} color="#16a34a" strokeWidth={1.5} />
                        <span className="text-[10px] font-semibold text-[#16a34a] font-display">Issued</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            {error && (
              <div className="px-6 py-2 bg-[#fef2f2] border-t border-[#fecdca]">
                <p className="text-[12px] text-[#d51520] font-body flex items-center gap-1.5">
                  <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}
                </p>
              </div>
            )}
            <div className="px-6 py-4 border-t border-[#f3f4f6] flex gap-2 flex-shrink-0">
              <button onClick={onClose}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
                Cancel
              </button>
              <button onClick={handleIssue} disabled={newSelectionCount === 0 || issuing || (certDefs.length > 1 && selectedCertId === null)}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {issuing && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Issue {newSelectionCount > 0 ? `${newSelectionCount} ` : ''}Certificate{newSelectionCount !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}

// ── Tab: Certificates ─────────────────────────────────────────────────────────
function CertificatesTab({ cohortId, programId }: { cohortId: string; programId: number | null }) {
  const [certTypes, setCertTypes]               = useState<CertTypeItem[]>([])
  const [certDefs, setCertDefs]                 = useState<AdminCertificateDef[]>([])
  const [members, setMembers]                   = useState<SimpleStudent[]>([])
  const [issuedUserIds, setIssuedUserIds]       = useState<Set<number>>(new Set())
  const [selectedTypeId, setSelectedTypeId]     = useState<number | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [loadingInit, setLoadingInit]           = useState(true)
  const [loadingIssued, setLoadingIssued]       = useState(false)
  const [issuing, setIssuing]                   = useState(false)
  const [error, setError]                       = useState('')
  const [successCount, setSuccessCount]         = useState<number | null>(null)

  const certDef = certDefs.find(d =>
    (d.certificate_type_id ?? d.certificateTypeId) === selectedTypeId
  ) ?? null

  const issuedMembers   = members.filter(m => issuedUserIds.has(m.userId))
  const unissuedMembers = members.filter(m => !issuedUserIds.has(m.userId))
  const allUnissuedSelected = unissuedMembers.length > 0 && unissuedMembers.every(m => selectedStudents.has(m.userId))

  // Load cert types + cert defs + members on mount
  useEffect(() => {
    async function init() {
      setLoadingInit(true)
      try {
        const [typesRes, defsRes, membRes, enrollRes] = await Promise.allSettled([
          apiClient.get('/admin/certificate-types?size=100'),
          apiClient.get(`/admin/certificates?cohort_id=${cohortId}${programId ? `&program_id=${programId}` : ''}`),
          apiClient.get(`/admin/cohorts/${cohortId}/members?size=100`),
          apiClient.get(`/admin/cohort-enrollments?cohort_id=${cohortId}&size=100`),
        ])

        if (typesRes.status === 'fulfilled') {
          const raw = typesRes.value.data?.data ?? typesRes.value.data
          const inner = raw?.data ?? raw
          const list: CertTypeItem[] = Array.isArray(inner) ? inner : Array.isArray(inner?.content) ? inner.content : []
          setCertTypes(list)
          if (list.length > 0) setSelectedTypeId(list[0].id)
        }

        if (defsRes.status === 'fulfilled') {
          const raw = defsRes.value.data?.data ?? defsRes.value.data
          const list: AdminCertificateDef[] = Array.isArray(raw) ? raw : (raw ? [raw] : [])
          setCertDefs(list)
        }

        // Merge members + enrollments into a unified student list (deduplicated by email)
        const seen = new Set<string>()
        const students: SimpleStudent[] = []
        const addStudent = (uid: number | undefined, u: { name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email?: string } | undefined) => {
          if (!uid || !u?.email || seen.has(u.email)) return
          seen.add(u.email)
          const fn = u.firstName ?? u.first_name ?? ''
          const ln = u.lastName  ?? u.last_name  ?? ''
          const fullNameStr = `${fn} ${ln}`.trim()
          const name = (u.name ?? fullNameStr) || u.email
          students.push({ userId: uid, name, email: u.email })
        }
        if (membRes.status === 'fulfilled') {
          const d = unwrap<{ members?: Member[] }>(membRes.value.data)
          ;(Array.isArray(d?.members) ? d.members : []).forEach(m => addStudent(m.user?.id, m.user))
        }
        if (enrollRes.status === 'fulfilled') {
          const d = unwrap<{ enrollments?: Enrollment[] }>(enrollRes.value.data)
          ;(Array.isArray(d?.enrollments) ? d.enrollments : []).forEach(e => addStudent(e.user?.id, e.user))
        }
        setMembers(students)
      } finally { setLoadingInit(false) }
    }
    init()
  }, [cohortId, programId])

  // Load issued certs when the selected cert def changes
  useEffect(() => {
    if (!certDef) { setIssuedUserIds(new Set()); return }
    setLoadingIssued(true)
    setSelectedStudents(new Set())
    apiClient.get(`/admin/user-certificates?cohort_id=${cohortId}&certificate_id=${certDef.id}&size=200`)
      .then(res => {
        const raw = res.data?.data ?? res.data
        const inner = raw?.data ?? raw
        const list: AdminCertificate[] = Array.isArray(inner)              ? inner
          : Array.isArray(inner?.certificates)                             ? inner.certificates
          : Array.isArray(inner?.userCertificates)                         ? inner.userCertificates
          : Array.isArray(inner?.content)                                  ? inner.content
          : []
        setIssuedUserIds(new Set(list.map(c => c.user?.id ?? c.user_id ?? 0).filter(Boolean)))
      })
      .catch(() => setIssuedUserIds(new Set()))
      .finally(() => setLoadingIssued(false))
  }, [cohortId, certDef])

  async function handleIssue() {
    if (!selectedTypeId || selectedStudents.size === 0) return
    setIssuing(true); setError('')
    try {
      let defId = certDef?.id
      if (!defId) {
        const createRes = await apiClient.post('/admin/certificates', {
          certificate_type_id: selectedTypeId, cohort_id: Number(cohortId),
          ...(programId ? { program_id: programId } : {}), status: 'ACTIVE',
        })
        const created = createRes.data?.data ?? createRes.data
        defId = created?.id
        if (created) setCertDefs(prev => [...prev, created as AdminCertificateDef])
      }
      if (!defId) throw new Error('Could not get certificate definition')
      const targetIds = Array.from(selectedStudents)
      await apiClient.post('/admin/user-certificates/issue', {
        certificate_id: defId, cohort_id: Number(cohortId), user_ids: targetIds,
      })
      setIssuedUserIds(prev => { const s = new Set(prev); targetIds.forEach(id => s.add(id)); return s })
      setSelectedStudents(new Set())
      setSuccessCount(targetIds.length)
    } catch (e) { setError(getApiError(e)) } finally { setIssuing(false) }
  }

  function toggleStudent(uid: number) {
    setSelectedStudents(prev => { const n = new Set(prev); if (n.has(uid)) { n.delete(uid) } else { n.add(uid) }; return n })
  }
  function toggleAll() {
    setSelectedStudents(allUnissuedSelected ? new Set() : new Set(unissuedMembers.map(m => m.userId)))
  }

  const selectedTypeName = certTypes.find(t => t.id === selectedTypeId)?.name
    ?? certTypes.find(t => t.id === selectedTypeId)?.title
    ?? 'Certificate'

  if (loadingInit) return (
    <div className="p-8 flex flex-col gap-4">
      {[120, 200, 160].map((w, i) => <div key={i} className="h-8 bg-[#f3f4f6] rounded-[8px] animate-pulse" style={{ width: w }} />)}
    </div>
  )

  if (certTypes.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center px-6">
      <div className="w-16 h-16 rounded-[12px] bg-[#f9fafb] flex items-center justify-center mb-4">
        <Certificate01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
      </div>
      <p className="text-[15px] font-bold text-[#111827] font-display mb-2">No certificate types found</p>
      <p className="text-[13px] text-[#4b5563] font-body max-w-[320px]">
        Create certificate types first in <span className="font-semibold text-[#111827]">Certificates → Certificate Types</span> in the sidebar.
      </p>
    </div>
  )

  return (
    <div className="p-8 flex flex-col gap-6 max-w-[760px]">
      {/* Type selector */}
      <div className="flex items-center gap-3">
        <label className="text-[12px] font-semibold text-[#374151] font-display shrink-0">Certificate type</label>
        <select value={selectedTypeId ?? ''} onChange={e => { setSelectedTypeId(Number(e.target.value)); setSuccessCount(null); setError('') }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
          {certTypes.map(t => <option key={t.id} value={t.id}>{t.name ?? t.title ?? `Type #${t.id}`}</option>)}
        </select>
        <span className="text-[12px] text-[#9ca3af] font-body">{issuedMembers.length} of {members.length} issued</span>
      </div>

      {successCount !== null && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#ecfdf3] border border-[#a7f3d0] rounded-[8px]">
          <CheckmarkCircle01Icon size={16} color="#16a34a" strokeWidth={1.5} />
          <p className="text-[13px] font-semibold text-[#027a48] font-display">{successCount} certificate{successCount !== 1 ? 's' : ''} issued successfully</p>
          <button onClick={() => setSuccessCount(null)} className="ml-auto text-[#027a48] hover:text-[#015c37]"><Cancel01Icon size={14} strokeWidth={2} /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[#fef2f2] border border-[#fecdca] rounded-[8px]">
          <AlertCircleIcon size={14} color="#d51520" strokeWidth={1.5} />
          <p className="text-[13px] text-[#d51520] font-body">{error}</p>
        </div>
      )}

      {/* Already issued */}
      {issuedMembers.length > 0 && (
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f3f4f6] bg-[#f9fafb]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display">
              Issued — {issuedMembers.length} student{issuedMembers.length !== 1 ? 's' : ''}
            </p>
          </div>
          {loadingIssued
            ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="px-5 py-3 border-b border-[#f3f4f6]"><div className="h-4 w-48 bg-[#f3f4f6] rounded animate-pulse" /></div>)
            : issuedMembers.map(m => (
              <div key={m.userId} className="flex items-center gap-3 px-5 py-3 border-b border-[#f3f4f6] last:border-0 bg-[#fafafa]">
                <div className="w-8 h-8 rounded-full bg-[#ecfdf3] flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-bold text-[#027a48] font-display">{getInitials(m.name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{m.name}</p>
                  <p className="text-[11px] text-[#4b5563] font-body">{m.email}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Certificate01Icon size={12} color="#16a34a" strokeWidth={1.5} />
                  <span className="text-[10px] font-semibold text-[#027a48] font-display">Issued</span>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* Not yet issued */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[#f3f4f6] bg-[#f9fafb] flex items-center justify-between">
          <button onClick={toggleAll} disabled={unissuedMembers.length === 0}
            className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#6b7280] font-display hover:text-[#d51520] transition-colors disabled:opacity-40">
            <div className={`w-4 h-4 rounded-[4px] border-2 flex items-center justify-center transition-all ${allUnissuedSelected ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'}`}>
              {allUnissuedSelected && <svg width="8" height="6" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            Not issued — {unissuedMembers.length} student{unissuedMembers.length !== 1 ? 's' : ''}
          </button>
          {selectedStudents.size > 0 && (
            <span className="text-[11px] font-semibold text-[#d51520] font-display">{selectedStudents.size} selected</span>
          )}
        </div>
        {unissuedMembers.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-[#9ca3af] font-body">All students have received this certificate.</p>
          </div>
        ) : unissuedMembers.map(m => (
          <button key={m.userId} onClick={() => toggleStudent(m.userId)}
            className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-[#f3f4f6] last:border-0 text-left transition-colors ${selectedStudents.has(m.userId) ? 'bg-[#fef2f2]' : 'hover:bg-[#fafafa]'}`}>
            <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-all ${selectedStudents.has(m.userId) ? 'bg-[#d51520] border-[#d51520]' : 'border-[#d1d5db] bg-white'}`}>
              {selectedStudents.has(m.userId) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <div className="w-8 h-8 rounded-full bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-[#d51520] font-display">{getInitials(m.name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{m.name}</p>
              <p className="text-[11px] text-[#4b5563] font-body">{m.email}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Issue footer */}
      {selectedStudents.size > 0 && (
        <div className="sticky bottom-0 bg-white border border-[#eaecf0] rounded-[10px] shadow-[0px_4px_8px_rgba(16,24,40,0.10)] px-5 py-4 flex items-center justify-between gap-4">
          <p className="text-[13px] font-body text-[#374151]">
            Issue <span className="font-semibold text-[#111827]">{selectedTypeName}</span> to <span className="font-semibold text-[#111827]">{selectedStudents.size}</span> student{selectedStudents.size !== 1 ? 's' : ''}
          </p>
          <button onClick={handleIssue} disabled={issuing}
            className="flex items-center gap-2 h-10 px-5 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] disabled:opacity-50 transition-colors">
            {issuing && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Issue {selectedStudents.size} Certificate{selectedStudents.size !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Tab: People (merged Members + Enrollments) ────────────────────────────────
function PeopleTab({ cohortId, programId }: { cohortId: string; programId: number | null }) {
  const router                            = useRouter()
  const [rows, setRows]                   = useState<PersonRow[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectedPerson, setSelectedPerson] = useState<PersonRow | null>(null)
  const [showAddFacilitator, setShowAddFacilitator] = useState(false)
  const [showGenCerts, setShowGenCerts]   = useState(false)
  // email → certificate id for issued certs (used by Generate Certificates modal)
  const [certMap, setCertMap]             = useState<Map<string, number>>(new Map())

  const loadPeople = useCallback(async () => {
    setLoading(true)
    try {
      const [membRes, enrollRes, certRes] = await Promise.allSettled([
        apiClient.get(`/admin/cohorts/${cohortId}/members?size=100`),
        apiClient.get(`/admin/cohort-enrollments?cohort_id=${cohortId}&size=100`),
        apiClient.get(`/admin/user-certificates?cohort_id=${cohortId}&size=100`),
      ])

        const members: Member[] = membRes.status === 'fulfilled'
          ? (() => { const d = unwrap<{ members?: Member[] }>(membRes.value.data); return Array.isArray(d?.members) ? d.members : [] })()
          : []

        const enrollments: Enrollment[] = enrollRes.status === 'fulfilled'
          ? (() => { const d = unwrap<{ enrollments?: Enrollment[] }>(enrollRes.value.data); return Array.isArray(d?.enrollments) ? d.enrollments : [] })()
          : []

        // Build email → certId map from admin certificates
        if (certRes.status === 'fulfilled') {
          const cd = unwrap<{ certificates?: AdminCertificate[]; data?: AdminCertificate[] } | AdminCertificate[]>(certRes.value.data)
          const certs: AdminCertificate[] = Array.isArray(cd)
            ? cd
            : ((cd as { certificates?: AdminCertificate[] })?.certificates ?? [])
          const map = new Map<string, number>()
          certs.forEach(c => { if (c.user?.email && c.id) map.set(c.user.email, c.id) })
          setCertMap(map)
        }

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
          userId:           e.user?.id ?? null,
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
            userId:           m.user?.id ?? null,
          }))

        setRows([...enrollmentRows, ...memberOnlyRows])
      } catch { setRows([]) } finally { setLoading(false) }
  }, [cohortId])

  useEffect(() => { loadPeople() }, [loadPeople])

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
      {showAddFacilitator && (
        <AddFacilitatorModal
          cohortId={cohortId}
          onClose={() => setShowAddFacilitator(false)}
          onAdded={() => { setShowAddFacilitator(false); loadPeople() }}
        />
      )}
      {showGenCerts && (
        <GenerateCertificatesModal
          cohortId={cohortId}
          programId={programId}
          rows={rows}
          initialCertMap={certMap}
          onClose={() => setShowGenCerts(false)}
          onDone={(newMap) => { setCertMap(newMap); setShowGenCerts(false) }}
        />
      )}
      <div className="px-6 pt-4 pb-2 flex items-center justify-between">
        <p className="text-[12px] text-[#4b5563] font-body">{rows.length} member{rows.length !== 1 ? 's' : ''} in this cohort</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGenCerts(true)}
            className="flex items-center gap-2 h-9 px-4 bg-white border border-[#e5e7eb] text-[#374151] rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#f9fafb] transition-colors">
            <Certificate01Icon size={14} color="#374151" strokeWidth={1.5} />
            Generate Certificates
          </button>
          <button onClick={() => setShowAddFacilitator(true)}
            className="flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
            <UserAdd01Icon size={14} color="white" strokeWidth={1.5} />
            Add Facilitator
          </button>
        </div>
      </div>
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
                onClick={() => r.userId ? router.push(`/admin/users/${r.userId}`) : setSelectedPerson(r)}
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

// ── Tab: Payments ─────────────────────────────────────────────────────────────
interface PaymentOverviewStudent {
  user_id?: number; userId?: number
  name?: string; email?: string
  plan_status?: string; planStatus?: string
  amount_paid?: number; amountPaid?: number
  amount_outstanding?: number; amountOutstanding?: number
  next_due_date?: string; nextDueDate?: string
  payment_mode?: string; paymentMode?: string
}

interface PaymentOverview {
  total_enrolled?: number; totalEnrolled?: number
  total_revenue?: number; totalRevenue?: number
  total_outstanding?: number; totalOutstanding?: number
  students?: PaymentOverviewStudent[]
  enrollments?: PaymentOverviewStudent[]
}

function fmt(n: number) {
  return `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const PAY_STATUS: Record<string, string> = {
  ACTIVE:    'bg-[#ecfdf3] text-[#027a48]',
  COMPLETED: 'bg-[#f3f4f6] text-[#4b5563]',
  SUSPENDED: 'bg-amber-50 text-amber-700',
  DEFAULTED: 'bg-[#fef2f2] text-[#d51520]',
  PAID:      'bg-[#ecfdf3] text-[#027a48]',
}

function PaymentsTab({ cohortId }: { cohortId: string }) {
  const [overview, setOverview]   = useState<PaymentOverview | null>(null)
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState<string | null>(null)
  const router                    = useRouter()

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null)
      try {
        const res = await apiClient.get(`/admin/cohorts/${cohortId}/payment-overview`)
        const raw = res.data
        setOverview((raw?.data ?? raw) as PaymentOverview)
      } catch (e) { setError(getApiError(e)) } finally { setLoading(false) }
    }
    load()
  }, [cohortId])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loading01Icon size={22} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
    </div>
  )

  if (error) return (
    <div className="m-6 flex items-center gap-3 bg-[#fef2f2] border border-[#fecdca] rounded-[10px] p-4">
      <AlertCircleIcon size={16} color="#d51520" strokeWidth={1.5} />
      <p className="text-[13px] text-[#d51520] font-body">{error}</p>
    </div>
  )

  if (!overview) return null

  const students = overview.students ?? overview.enrollments ?? []
  const totalEnrolled    = overview.total_enrolled    ?? overview.totalEnrolled    ?? students.length
  const totalRevenue     = overview.total_revenue     ?? overview.totalRevenue     ?? 0
  const totalOutstanding = overview.total_outstanding ?? overview.totalOutstanding ?? 0

  return (
    <div className="px-6 py-5">
      {/* Summary stat row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Enrolled',   value: String(totalEnrolled),     icon: <Invoice01Icon  size={18} color="#7c3aed" strokeWidth={1.5} />, tint: '#f5f3ff', accent: '#7c3aed' },
          { label: 'Revenue Collected', value: fmt(totalRevenue),        icon: <Payment01Icon  size={18} color="#0d9488" strokeWidth={1.5} />, tint: '#f0fdfa', accent: '#0d9488' },
          { label: 'Outstanding',       value: fmt(totalOutstanding),    icon: <AlertCircleIcon size={18} color="#d97706" strokeWidth={1.5} />, tint: '#fffbeb', accent: '#d97706' },
        ].map(({ label, value, icon, tint }) => (
          <div key={label} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">{label}</p>
              <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: tint }}>
                {icon}
              </div>
            </div>
            <p className="text-[24px] font-bold text-[#111827] font-display leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Student payment table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#f3f4f6]">
          <p className="text-[13px] font-semibold text-[#111827] font-display">Per-Student Breakdown</p>
        </div>
        {students.length === 0 ? (
          <div className="py-14 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-[10px] bg-[#f3f4f6] flex items-center justify-center mb-3">
              <Payment01Icon size={22} color="#9ca3af" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">No payment data yet</p>
            <p className="text-[12px] text-[#9ca3af] font-body">Payment data will appear once students complete a payment.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb]">
                {['Student', 'Payment Mode', 'Status', 'Paid', 'Outstanding', 'Next Due'].map(h => (
                  <th key={h} className={`px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display ${
                    h === 'Paid' || h === 'Outstanding' ? 'text-right' : 'text-left'
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const uid = s.user_id ?? s.userId
                const status = s.plan_status ?? s.planStatus ?? '—'
                return (
                  <tr
                    key={i}
                    onClick={() => uid && router.push(`/admin/users/${uid}`)}
                    className={`border-b border-[#f3f4f6] transition-colors ${uid ? 'cursor-pointer hover:bg-[#fafafa]' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{s.name ?? '—'}</p>
                      {s.email && <p className="text-[11px] text-[#6b7280] font-body mt-0.5">{s.email}</p>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] text-[#374151] font-body">{(s.payment_mode ?? s.paymentMode ?? 'FULL').replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {status !== '—'
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-display ${PAY_STATUS[status.toUpperCase()] ?? 'bg-[#f3f4f6] text-[#4b5563]'}`}>{status}</span>
                        : <span className="text-[12px] text-[#d1d5db] font-body">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-[13px] font-semibold text-[#111827] font-display">{fmt(s.amount_paid ?? s.amountPaid ?? 0)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-[13px] font-semibold font-display ${(s.amount_outstanding ?? s.amountOutstanding ?? 0) > 0 ? 'text-[#d51520]' : 'text-[#9ca3af]'}`}>
                        {fmt(s.amount_outstanding ?? s.amountOutstanding ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] text-[#6b7280] font-body">
                        {(s.next_due_date ?? s.nextDueDate)
                          ? new Date((s.next_due_date ?? s.nextDueDate)!).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const TABS = ['Curriculum', 'People', 'Reviews', 'Payments', 'Certificates'] as const
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
        const pId = c?.programId ?? c?.program_id ?? c?.programmeId ?? c?.programme_id ?? c?.program?.id ?? c?.programme?.id ?? null
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

  const programId = cohort?.programId ?? cohort?.program_id ?? cohort?.programmeId ?? cohort?.programme_id ?? cohort?.program?.id ?? cohort?.programme?.id ?? null

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
            {tab === 'Payments'      && <Payment01Icon    size={14} strokeWidth={1.5} />}
            {tab === 'Certificates'  && <Certificate01Icon size={14} strokeWidth={1.5} />}
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content — all three stay mounted so CurriculumTab state survives tab switches.
          display:contents makes the wrapper transparent to layout; display:none hides it. */}
      <div
        className="flex-1 bg-white"
        style={activeTab === 'Curriculum' ? { display: 'flex', flexDirection: 'column', overflow: 'hidden' } : { overflowY: 'auto' }}
      >
        <div style={activeTab === 'Curriculum' ? { display: 'contents' } : { display: 'none' }}>
          <CurriculumTab cohortId={cohortId} programId={programId} parentLoading={loading} onProgramIdResolved={id => setCohort(prev => prev ? { ...prev, program_id: id } : prev)} />
        </div>
        <div style={activeTab === 'People' ? { display: 'contents' } : { display: 'none' }}>
          <PeopleTab cohortId={cohortId} programId={programId} />
        </div>
        <div style={activeTab === 'Reviews' ? { display: 'contents' } : { display: 'none' }}>
          <ReviewsTab cohortId={cohortId} />
        </div>
        <div style={activeTab === 'Payments' ? { display: 'contents' } : { display: 'none' }}>
          <PaymentsTab cohortId={cohortId} />
        </div>
        <div style={activeTab === 'Certificates' ? { display: 'contents' } : { display: 'none' }}>
          <CertificatesTab cohortId={cohortId} programId={programId} />
        </div>
      </div>
    </div>
  )
}
