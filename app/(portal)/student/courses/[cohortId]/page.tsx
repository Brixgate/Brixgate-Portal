'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import {
  ArrowLeft01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  Video01Icon,
  FileEditIcon,
  BookOpen01Icon,
  Loading01Icon,
  Time01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Link01Icon,
  Download01Icon,
} from 'hugeicons-react'

// ── API shapes — programmes (secondary lookup for header) ─────────────────────
interface ApiCohortSummary {
  cohortId?: number
  cohortTitle?: string
}
interface ApiProgram {
  id: number
  title: string
  level?: string
  autoPercentCompletion?: number
  myCohorts?: ApiCohortSummary[]
}
interface ApiProgramsResponse { programs: ApiProgram[] }

// Defensive readers (camelCase per Swagger + snake_case fallback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rc = (c: any): number => c?.cohortId ?? c?.cohort_id ?? 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rt = (c: any): string => c?.cohortTitle ?? c?.cohort_title ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rm = (p: any): any[]  => p?.myCohorts  ?? p?.my_cohorts  ?? []

// ── API shapes — resources ────────────────────────────────────────────────────
interface ApiResource {
  id: number
  title?: string
  type?: string
  link?: string
  createdAt?: string
  // module association — present if backend links resources to a specific module
  moduleId?: number
  cohortModuleId?: number
}
interface ApiResourcesResponse {
  cohortId?: number
  resources: ApiResource[]
}

// ── API shapes — modules (primary, camelCase per Swagger) ─────────────────────
interface CohortLesson {
  id: number
  title: string
  contentType: string
  contentUrl?: string
  duration: number        // minutes
  orderIndex: number
  visibilityStatus?: string
  releaseDate?: string
  expiresAt?: string
  createdBy?: string
}
interface CohortModule {
  id: number
  title: string
  description?: string
  duration: string        // e.g. "1 Week"
  orderIndex: number
  moduleStatus?: string
  visibilityStatus?: string
  releaseDate?: string
  createdBy?: string
  lessons: CohortLesson[]
}
interface CohortModulesResponse {
  cohortId: number
  modules: CohortModule[]
}

// ── Selected item discriminated union ────────────────────────────────────────
type SelectedItem =
  | { kind: 'module'; data: CohortModule; index: number }
  | { kind: 'lesson'; data: CohortLesson; moduleTitle: string; moduleIndex: number; lessonIndex: number }

// ── Content-type config ───────────────────────────────────────────────────────
const CONTENT_ICONS: Record<string, React.ElementType> = {
  VIDEO:        Video01Icon,
  LECTURE:      Video01Icon,
  PDF:          File01Icon,
  PRESENTATION: PresentationBarChart01Icon,
  ARTICLE:      FileEditIcon,
  IMAGE:        File01Icon,
}
const CONTENT_COLOURS: Record<string, { bg: string; text: string }> = {
  VIDEO:        { bg: '#F5F3FF', text: '#7C3AED' },
  LECTURE:      { bg: '#F5F3FF', text: '#7C3AED' },
  PDF:          { bg: '#FEF2F2', text: '#D51520' },
  PRESENTATION: { bg: '#FFF7ED', text: '#EA580C' },
  ARTICLE:      { bg: '#F0FDF4', text: '#16A34A' },
  IMAGE:        { bg: '#F0F9FF', text: '#0EA5E9' },
}

function formatDuration(mins: number): string {
  if (!mins) return ''
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`
}

// ── Module accordion (left panel row) ────────────────────────────────────────
function ModuleAccordion({
  module, moduleIndex, isExpanded, selectedItem,
  onToggle, onSelectModule, onSelectLesson,
}: {
  module: CohortModule
  moduleIndex: number
  isExpanded: boolean
  selectedItem: SelectedItem | null
  onToggle: () => void
  onSelectModule: () => void
  onSelectLesson: (lesson: CohortLesson, lessonIndex: number) => void
}) {
  const lessonCount = module.lessons?.length ?? 0
  const isModuleSelected = selectedItem?.kind === 'module' && selectedItem.data.id === module.id

  return (
    <div className="border-b border-[#f3f4f6] last:border-b-0">
      {/* Module header row */}
      <button
        onClick={() => { onSelectModule(); onToggle() }}
        className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors ${
          isModuleSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
        }`}
      >
        {/* Module number badge */}
        <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isModuleSelected ? 'bg-[#D51520]' : 'bg-[#f3f4f6]'
        }`}>
          <span className={`text-[10px] font-bold font-display ${isModuleSelected ? 'text-white' : 'text-[#6b7280]'}`}>
            {String(moduleIndex).padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-semibold font-display leading-snug ${isModuleSelected ? 'text-[#D51520]' : 'text-[#111827]'}`}>
            {module.title}
          </p>
          <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
            {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
            {module.duration ? ` · ${module.duration}` : ''}
          </p>
        </div>

        <div className="flex-shrink-0 mt-1">
          {isExpanded
            ? <ArrowUp01Icon size={14} color="#9ca3af" strokeWidth={1.5} />
            : <ArrowDown01Icon size={14} color="#9ca3af" strokeWidth={1.5} />}
        </div>
      </button>

      {/* Lessons */}
      {isExpanded && lessonCount > 0 && (
        <div className="pb-1">
          {[...module.lessons]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((lesson, i) => {
              const type    = (lesson.contentType ?? 'PDF').toUpperCase()
              const Icon    = CONTENT_ICONS[type] ?? File01Icon
              const colours = CONTENT_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
              const isSelected =
                selectedItem?.kind === 'lesson' && selectedItem.data.id === lesson.id

              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson, i + 1)}
                  className={`w-full text-left flex items-center gap-3 pl-14 pr-5 py-3 transition-colors ${
                    isSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
                    style={{ background: isSelected ? colours.text + '20' : colours.bg }}
                  >
                    <Icon size={13} color={colours.text} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium font-body leading-snug truncate ${
                      isSelected ? 'text-[#D51520]' : 'text-[#374151]'
                    }`}>
                      {lesson.title}
                    </p>
                    {lesson.duration > 0 && (
                      <p className="text-[10px] text-[#9ca3af] font-body mt-0.5">
                        {formatDuration(lesson.duration)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ── Resource row (used inside detail panel) ───────────────────────────────────
const RES_ICONS: Record<string, React.ElementType> = {
  PDF:          File01Icon,
  PRESENTATION: PresentationBarChart01Icon,
  VIDEO:        Video01Icon,
  LECTURE:      Video01Icon,
  ARTICLE:      FileEditIcon,
  IMAGE:        File01Icon,
}
const RES_COLOURS: Record<string, { bg: string; text: string }> = {
  PDF:          { bg: '#FEF2F2', text: '#D51520' },
  PRESENTATION: { bg: '#FFF7ED', text: '#EA580C' },
  VIDEO:        { bg: '#F5F3FF', text: '#7C3AED' },
  LECTURE:      { bg: '#F5F3FF', text: '#7C3AED' },
  ARTICLE:      { bg: '#F0FDF4', text: '#16A34A' },
  IMAGE:        { bg: '#F0F9FF', text: '#0EA5E9' },
}

function ResourceRow({ resource }: { resource: ApiResource }) {
  const type    = (resource.type ?? 'PDF').toUpperCase()
  const Icon    = RES_ICONS[type] ?? File01Icon
  const colours = RES_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
  return (
    <div className="flex items-center gap-3 p-3 rounded-[8px] bg-[#f9fafb] border border-[#f3f4f6] group">
      <div
        className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
        style={{ background: colours.bg }}
      >
        <Icon size={14} color={colours.text} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#111827] font-body truncate">
          {resource.title ?? 'Resource'}
        </p>
        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
          {type.charAt(0) + type.slice(1).toLowerCase()}
        </p>
      </div>
      {resource.link && (
        <a
          href={resource.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#374151] font-body border border-[#e5e7eb] px-2.5 py-1.5 rounded-[6px] hover:bg-white transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          <Download01Icon size={11} color="#374151" strokeWidth={1.5} />
          Download
        </a>
      )}
    </div>
  )
}

// ── Detail panel (right) ──────────────────────────────────────────────────────
function DetailPanel({ item, resources }: { item: SelectedItem | null; resources: ApiResource[] }) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
        <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
          <BookOpen01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">
          Select a module or lesson
        </p>
        <p className="text-[13px] text-[#9ca3af] font-body max-w-[280px] leading-[1.6]">
          Click any module or lesson on the left to view its details here.
        </p>
      </div>
    )
  }

  // Module detail
  if (item.kind === 'module') {
    const { data: mod, index } = item
    const lessonCount = mod.lessons?.length ?? 0
    // Resources associated with this module (by moduleId / cohortModuleId),
    // falling back to all resources if none are module-scoped
    const moduleResources = resources.filter(
      (r) => r.moduleId === mod.id || r.cohortModuleId === mod.id
    )
    const hasModuleScoping = resources.some((r) => r.moduleId !== undefined || r.cohortModuleId !== undefined)
    const visibleResources = moduleResources.length > 0
      ? moduleResources
      : hasModuleScoping
        ? []                 // other modules have resources, this one just has none
        : resources          // flat list — show all under every module

    return (
      <div className="p-8">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">
            Module {String(index).padStart(2, '0')}
          </span>
          {mod.duration && (
            <span className="text-[11px] font-medium text-[#6b7280] font-body bg-[#f3f4f6] px-2.5 py-1 rounded-full">
              {mod.duration}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-[26px] font-bold text-[#111827] font-display leading-snug mb-4">
          {mod.title}
        </h2>

        {/* Description */}
        {mod.description ? (
          <p className="text-[15px] text-[#475467] font-body leading-[1.7] mb-6">
            {mod.description}
          </p>
        ) : (
          <p className="text-[14px] text-[#9ca3af] font-body leading-[1.6] mb-6 italic">
            No description provided for this module.
          </p>
        )}

        {/* Meta chips */}
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-full px-3 py-1.5">
            <BookOpen01Icon size={12} color="#6b7280" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[#374151] font-body">
              {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
            </span>
          </div>
          {mod.duration && (
            <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-full px-3 py-1.5">
              <Time01Icon size={12} color="#6b7280" strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-[#374151] font-body">{mod.duration}</span>
            </div>
          )}
          {mod.createdBy && (
            <span className="text-[12px] text-[#9ca3af] font-body">
              by {mod.createdBy}
            </span>
          )}
        </div>

        {/* Lessons in this module */}
        {lessonCount > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Lessons in this module
            </p>
            <div className="flex flex-col gap-2">
              {[...mod.lessons]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((lesson, i) => {
                  const type    = (lesson.contentType ?? 'PDF').toUpperCase()
                  const colours = CONTENT_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
                  const Icon    = CONTENT_ICONS[type] ?? File01Icon
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 rounded-[8px] bg-[#f9fafb] border border-[#f3f4f6]"
                    >
                      <div
                        className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
                        style={{ background: colours.bg }}
                      >
                        <Icon size={14} color={colours.text} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111827] font-body truncate">
                          {String(i + 1).padStart(2, '0')}. {lesson.title}
                        </p>
                        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                          {lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}

        {/* Module resources */}
        {visibleResources.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display mb-3">
              Resources
            </p>
            <div className="flex flex-col gap-2">
              {visibleResources.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Lesson detail
  const { data: lesson, moduleTitle, moduleIndex, lessonIndex } = item
  const type    = (lesson.contentType ?? 'PDF').toUpperCase()
  const Icon    = CONTENT_ICONS[type] ?? File01Icon
  const colours = CONTENT_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase()

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5 text-[12px] text-[#9ca3af] font-body">
        <span>Module {String(moduleIndex).padStart(2, '0')}</span>
        <ArrowRight01Icon size={11} color="#d1d5db" strokeWidth={1.5} />
        <span>Lesson {String(lessonIndex).padStart(2, '0')}</span>
      </div>

      {/* Content type icon */}
      <div
        className="w-16 h-16 rounded-[14px] flex items-center justify-center mb-6"
        style={{ background: colours.bg }}
      >
        <Icon size={28} color={colours.text} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h2 className="text-[26px] font-bold text-[#111827] font-display leading-snug mb-3">
        {lesson.title}
      </h2>

      {/* Module context */}
      <p className="text-[13px] text-[#9ca3af] font-body mb-6 leading-snug">
        From: <span className="text-[#6b7280] font-medium">{moduleTitle}</span>
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: colours.bg }}
        >
          <Icon size={12} color={colours.text} strokeWidth={1.5} />
          <span className="text-[12px] font-medium font-body" style={{ color: colours.text }}>
            {typeLabel}
          </span>
        </div>
        {lesson.duration > 0 && (
          <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-full px-3 py-1.5">
            <Time01Icon size={12} color="#6b7280" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[#374151] font-body">
              {formatDuration(lesson.duration)}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#f3f4f6] mb-8" />

      {/* Open button */}
      {lesson.contentUrl ? (
        <a
          href={lesson.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-[48px] px-6 bg-[#D51520] hover:bg-[#B81119] text-white text-[14px] font-semibold font-display rounded-[8px] transition-colors"
        >
          Open {typeLabel}
          <ArrowRight01Icon size={15} color="white" strokeWidth={2} />
        </a>
      ) : (
        <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] font-body">
          <Link01Icon size={14} color="#d1d5db" strokeWidth={1.5} />
          Content link not available yet.
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const cohortId = params.cohortId as string

  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const [programTitle, setProgramTitle] = useState('')
  const [cohortLabel, setCohortLabel]   = useState('')
  const [modules, setModules]           = useState<CohortModule[]>([])
  const [resources, setResources]       = useState<ApiResource[]>([])
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())

  // Set default selected item once modules load
  useEffect(() => {
    if (modules.length > 0 && !selectedItem) {
      const first = modules[0]
      setExpandedModules(new Set([first.id]))
      const sorted = [...(first.lessons ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
      if (sorted.length > 0) {
        setSelectedItem({ kind: 'lesson', data: sorted[0], moduleTitle: first.title, moduleIndex: 1, lessonIndex: 1 })
      } else {
        setSelectedItem({ kind: 'module', data: first, index: 1 })
      }
    }
  }, [modules]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function load() {
      try {
        // Primary: modules + resources in parallel
        const [modulesRes, resourcesRes] = await Promise.allSettled([
          apiClient.get(`/cohorts/${cohortId}/modules`),
          apiClient.get(`/cohorts/${cohortId}/resources`),
        ])

        if (modulesRes.status === 'fulfilled') {
          const modulesData = unwrap<CohortModulesResponse>(modulesRes.value.data)
          const list = Array.isArray(modulesData?.modules) ? modulesData.modules : []
          setModules([...list].sort((a, b) => a.orderIndex - b.orderIndex))
        }

        if (resourcesRes.status === 'fulfilled') {
          const d = unwrap<ApiResourcesResponse>(resourcesRes.value.data)
          setResources(Array.isArray(d?.resources) ? d.resources : [])
        }

        // Secondary: programme/cohort header info
        try {
          const programsRes  = await apiClient.get('/users/me/programs')
          const programsData = unwrap<ApiProgramsResponse>(programsRes.data)
          const programs = programsData?.programs ?? []
          const program  = programs.find((p) =>
            rm(p).some((c) => String(rc(c)) === String(cohortId))
          )
          if (program) {
            const cohort = rm(program).find((c: unknown) => String(rc(c)) === String(cohortId))
            setProgramTitle(program.title)
            const cn = rt(cohort)
            setCohortLabel(
              cn.replace(`${program.title} — `, '').replace(`${program.title} - `, '') || cn
            )
          }
        } catch {
          // Non-fatal — header just shows generic title
        }

        if (modulesRes.status === 'rejected') setNotFound(true)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cohortId])

  function toggleModule(id: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)

  // ── Loading ──
  if (loading) {
    return (
      <>
        <TopNav title="Course" breadcrumbs={['My Programs']} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-[#9ca3af]">
          <Loading01Icon size={22} className="animate-spin" strokeWidth={1.5} />
          <span className="text-[13px] font-body">Loading curriculum…</span>
        </div>
      </>
    )
  }

  // ── Not found ──
  if (notFound) {
    return (
      <>
        <TopNav title="Course" breadcrumbs={['My Programs']} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center">
            <BookOpen01Icon size={24} color="#d1d5db" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-semibold text-[#374151] font-display">No content yet</p>
          <p className="text-[13px] text-[#9ca3af] font-body max-w-[320px]">
            Your instructor is preparing the curriculum. Modules and lessons will appear here once they&apos;re published.
          </p>
          <button
            onClick={() => router.push('/student/programs')}
            className="mt-2 text-[13px] text-[#d51520] font-medium hover:underline"
          >
            ← Back to My Programs
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title={programTitle || 'Course'} breadcrumbs={['My Programs']} />

      <div className="px-4 lg:px-8 pb-10">

        {/* Header */}
        <div className="pt-6 pb-5 flex items-center gap-3">
          <button
            onClick={() => router.push('/student/programs')}
            className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
            aria-label="Back to programs"
          >
            <ArrowLeft01Icon size={16} color="#6b7280" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-[20px] lg:text-[24px] font-bold text-[#111827] font-display leading-tight">
              {programTitle || 'Course Curriculum'}
            </h1>
            <p className="text-[13px] text-[#6b7280] font-body mt-0.5">
              {cohortLabel && `${cohortLabel} · `}
              {modules.length} module{modules.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Curriculum grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6" style={{ minHeight: '580px' }}>

          {/* Left: Curriculum list */}
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#f3f4f6]">
              <p className="text-[14px] font-semibold text-[#111827] font-display">Course Curriculum</p>
              <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
                {modules.length} modules · {totalLessons} lessons
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {modules.map((mod, i) => (
                <ModuleAccordion
                  key={mod.id}
                  module={mod}
                  moduleIndex={i + 1}
                  isExpanded={expandedModules.has(mod.id)}
                  selectedItem={selectedItem}
                  onToggle={() => toggleModule(mod.id)}
                  onSelectModule={() =>
                    setSelectedItem({ kind: 'module', data: mod, index: i + 1 })
                  }
                  onSelectLesson={(lesson, li) =>
                    setSelectedItem({ kind: 'lesson', data: lesson, moduleTitle: mod.title, moduleIndex: i + 1, lessonIndex: li })
                  }
                />
              ))}
            </div>
          </div>

          {/* Right: Detail panel */}
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden overflow-y-auto">
            <DetailPanel item={selectedItem} resources={resources} />
          </div>

        </div>
      </div>
    </>
  )
}
