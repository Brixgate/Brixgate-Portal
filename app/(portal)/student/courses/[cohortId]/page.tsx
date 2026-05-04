'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import { getProgramImage } from '@/lib/program-images'
import {
  ArrowLeft01Icon,
  Download01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  Video01Icon,
  FileEditIcon,
  BookOpen01Icon,
  Loading01Icon,
  UserCircleIcon,
  Calendar01Icon,
} from 'hugeicons-react'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiCohortSummary {
  cohortId: number
  cohortTitle: string
  role: string
  membershipStatus: string
}

interface ApiProgram {
  id: number
  title: string
  subtitle?: string
  level?: string
  autoPercentCompletion?: number
  myCohorts?: ApiCohortSummary[]
}

interface ApiProgramsResponse {
  programs: ApiProgram[]
}

interface ApiResource {
  id: number
  title?: string
  type?: string
  link?: string
  status?: string
  createdAt?: string
}

interface ApiResourcesResponse {
  cohortId: number
  resources: ApiResource[]
}

interface ApiMember {
  id: number
  role: string
  joinedAt?: string
  user: {
    id: number
    name: string
    title?: string
    profileImageUrl?: string
  }
}

interface ApiMembersResponse {
  members: ApiMember[]
}

// ── File config ───────────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, React.ElementType> = {
  PDF:          File01Icon,
  PRESENTATION: PresentationBarChart01Icon,
  VIDEO:        Video01Icon,
  LECTURE:      Video01Icon,
  ARTICLE:      FileEditIcon,
  IMAGE:        File01Icon,
}
const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  PDF:          { bg: '#FEF2F2', text: '#D51520' },
  PRESENTATION: { bg: '#FFF7ED', text: '#EA580C' },
  VIDEO:        { bg: '#F5F3FF', text: '#7C3AED' },
  LECTURE:      { bg: '#F5F3FF', text: '#7C3AED' },
  ARTICLE:      { bg: '#F0FDF4', text: '#16A34A' },
  IMAGE:        { bg: '#F0F9FF', text: '#0EA5E9' },
}

function ResourceCard({ resource }: { resource: ApiResource }) {
  const type = (resource.type ?? 'PDF').toUpperCase()
  const Icon = FILE_ICONS[type] ?? File01Icon
  const colours = FILE_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const date = resource.createdAt
    ? new Date(resource.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="flex items-center gap-4 p-4 border border-[#f3f4f6] rounded-[10px] hover:bg-[#f9fafb] transition-colors group">
      <div
        className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{ background: colours.bg }}
      >
        <Icon size={18} color={colours.text} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#111827] font-display truncate">
          {resource.title ?? 'Resource'}
        </p>
        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
          {type}{date ? ` · ${date}` : ''}
        </p>
      </div>
      {resource.link && (
        <a
          href={resource.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
        >
          <Download01Icon size={13} color="#374151" strokeWidth={1.5} />
          Open
        </a>
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
  const [programLevel, setProgramLevel] = useState('')
  const [cohortTitle, setCohortTitle]   = useState('')
  const [progress, setProgress]         = useState(0)
  const [instructor, setInstructor]     = useState<{ name: string; initials: string; title?: string } | null>(null)
  const [resources, setResources]       = useState<ApiResource[]>([])

  useEffect(() => {
    async function load() {
      try {
        // 1. Find the program that contains this cohortId
        const programsRes = await apiClient.get('/users/me/programs')
        const programsData = unwrap<ApiProgramsResponse>(programsRes.data)
        const programs = programsData?.programs ?? []

        const program = programs.find((p) =>
          p.myCohorts?.some((c) => String(c.cohortId) === String(cohortId))
        )

        if (!program) {
          setNotFound(true)
          setLoading(false)
          return
        }

        const cohort = program.myCohorts?.find((c) => String(c.cohortId) === String(cohortId))
        setProgramTitle(program.title)
        setProgramLevel(program.level ?? '')
        setCohortTitle(cohort?.cohortTitle ?? '')
        setProgress(program.autoPercentCompletion ?? 0)

        // 2. Fetch resources and instructor in parallel
        const [resourcesRes, membersRes] = await Promise.allSettled([
          apiClient.get(`/cohorts/${cohortId}/resources`),
          apiClient.get(`/cohorts/${cohortId}/members`, { params: { role: 'INSTRUCTOR', size: 5 } }),
        ])

        if (resourcesRes.status === 'fulfilled') {
          const rData = unwrap<ApiResourcesResponse>(resourcesRes.value.data)
          setResources(Array.isArray(rData?.resources) ? rData.resources : [])
        }

        if (membersRes.status === 'fulfilled') {
          const mData = unwrap<ApiMembersResponse>(membersRes.value.data)
          const firstInstructor = mData?.members?.[0]
          if (firstInstructor) {
            const name = firstInstructor.user.name ?? ''
            const parts = name.trim().split(/\s+/)
            const initials = parts.map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase()
            setInstructor({ name, initials, title: firstInstructor.user.title })
          }
        }
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cohortId])

  // ── Loading ──
  if (loading) {
    return (
      <>
        <TopNav title="Course" breadcrumbs={['My Programs']} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-[#9ca3af]">
          <Loading01Icon size={22} className="animate-spin" strokeWidth={1.5} />
          <span className="text-[13px] font-body">Loading course…</span>
        </div>
      </>
    )
  }

  // ── Not found ──
  if (notFound) {
    return (
      <>
        <TopNav title="Course" breadcrumbs={['My Programs']} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
          <BookOpen01Icon size={36} color="#d1d5db" strokeWidth={1.5} />
          <p className="text-[14px] font-semibold text-[#374151] font-display">Course not found</p>
          <p className="text-[13px] text-[#9ca3af] font-body">This course may not be linked to your account yet.</p>
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

  const cohortLabel = cohortTitle
    .replace(`${programTitle} — `, '')
    .replace(`${programTitle} - `, '')

  return (
    <>
      <TopNav title={programTitle} breadcrumbs={['My Programs']} />

      <div className="px-4 lg:px-8 pb-10">

        {/* Back + header */}
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
              {programTitle}
            </h1>
            <p className="text-[13px] text-[#6b7280] font-body mt-0.5">
              {cohortLabel || cohortTitle}
              {programLevel && ` · ${programLevel.charAt(0) + programLevel.slice(1).toLowerCase()}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Left: Course thumbnail + progress + content notice ── */}
          <div className="flex flex-col gap-5">

            {/* Thumbnail + meta */}
            <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
              <div
                className="h-[200px] bg-[#1a1d2e] bg-cover bg-center relative"
                style={{ backgroundImage: `url(${getProgramImage(programTitle)})` }}
              >
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute bottom-0 left-0 right-0 px-6 py-5">
                  <p className="text-white text-[18px] font-bold font-display leading-snug">{programTitle}</p>
                  <p className="text-white/70 text-[13px] font-body mt-0.5">{cohortLabel || cohortTitle}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 py-5 border-b border-[#f3f4f6]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-medium text-[#374151] font-body">Your Progress</span>
                  <span className="text-[13px] font-bold text-[#d51520] font-display">{progress}%</span>
                </div>
                <div className="h-2 bg-[#f3f4f6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Meta row */}
              <div className="px-6 py-4 flex items-center gap-6 flex-wrap">
                {instructor && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#1a1d2e] flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-white font-display">{instructor.initials}</span>
                    </div>
                    <div>
                      <p className="text-[11px] text-[#9ca3af] font-body">Instructor</p>
                      <p className="text-[13px] font-semibold text-[#374151] font-display">{instructor.name}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar01Icon size={14} color="#9ca3af" strokeWidth={1.5} />
                  <div>
                    <p className="text-[11px] text-[#9ca3af] font-body">Cohort</p>
                    <p className="text-[13px] font-semibold text-[#374151] font-display">{cohortLabel || cohortTitle}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Session content notice */}
            <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-6">
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-14 h-14 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mb-4">
                  <BookOpen01Icon size={24} color="#d51520" strokeWidth={1.5} />
                </div>
                <p className="text-[15px] font-semibold text-[#111827] font-display mb-1">
                  Session content is being set up
                </p>
                <p className="text-[13px] text-[#6b7280] font-body max-w-[380px]">
                  Your instructor is preparing the course materials. Session topics, notes, and assignments will appear here once they&apos;re uploaded.
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: Resources ── */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[#f3f4f6] flex items-center justify-between">
                <p className="text-[15px] font-semibold text-[#111827] font-display">Course Resources</p>
                <span className="text-[11px] text-[#9ca3af] font-body">{resources.length} file{resources.length !== 1 ? 's' : ''}</span>
              </div>

              {resources.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <UserCircleIcon size={28} color="#d1d5db" strokeWidth={1.5} className="mb-2" />
                  <p className="text-[13px] font-semibold text-[#374151] font-display">No resources yet</p>
                  <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">
                    Resources will be uploaded here by your instructor.
                  </p>
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-3">
                  {resources.map((r) => (
                    <ResourceCard key={r.id} resource={r} />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
