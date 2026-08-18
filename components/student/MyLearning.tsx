'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  BookOpen01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  FolderZipIcon,
  FileEditIcon,
  Video01Icon,
  ArrowRight01Icon,
  Download01Icon,
  Loading01Icon,
  UserGroupIcon,
  UserGroup02Icon,
} from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'
import { getProgramImage } from '@/lib/program-images'
import { cn } from '@/lib/utils'

// ── API shapes (matches Swagger spec, camelCase) ──────────────────────────────
interface ApiCohortSummary {
  cohortId?: number
  cohortTitle?: string
  role?: string
  membershipStatus?: string
}

interface ApiProgram {
  id: number
  title?: string
  subtitle?: string
  description?: string
  level?: string
  format?: string
  autoPercentCompletion?: number
  enrolledStudentsCount?: number
  modulesCount?: number
  lessonsCount?: number
  myCohorts?: ApiCohortSummary[]
}

// ── Defensive field readers (camelCase + snake_case fallback) ─────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rId    = (c: unknown) => (c as Record<string, unknown>)?.['cohortId']    as number ?? (c as Record<string, unknown>)?.['cohort_id']    as number ?? 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rTitle = (c: unknown) => (c as Record<string, unknown>)?.['cohortTitle'] as string ?? (c as Record<string, unknown>)?.['cohort_title'] as string ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rRole  = (c: unknown) => (c as Record<string, unknown>)?.['role']        as string ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rStatus = (c: unknown) => (c as Record<string, unknown>)?.['membershipStatus'] as string ?? (c as Record<string, unknown>)?.['membership_status'] as string ?? ''
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rCohorts = (p: unknown) => ((p as Record<string, unknown>)?.['myCohorts'] ?? (p as Record<string, unknown>)?.['my_cohorts'] ?? []) as unknown[]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rEnrollment(c: unknown) {
  const e = (c as Record<string, unknown>)?.['cohortEnrollment'] ?? (c as Record<string, unknown>)?.['cohort_enrollment'] ?? null
  if (!e) return null
  const rec = e as Record<string, unknown>
  return {
    enrollmentType:  (rec['enrollmentType']  ?? rec['enrollment_type']  ?? 'INDIVIDUAL') as string,
    seatsPurchased:  (rec['seatsPurchased']  ?? rec['seats_purchased']  ?? 1) as number,
    seatsUsed:       (rec['seatsUsed']       ?? rec['seats_used']       ?? 1) as number,
  }
}

interface ApiProgramsResponse {
  programs: ApiProgram[]
}

interface ApiResource {
  id: number
  title?: string
  type?: string   // PDF, VIDEO, ARTICLE, PRESENTATION, LECTURE, IMAGE
  link?: string
  status?: string
  createdAt?: string
}

interface ApiResourcesResponse {
  cohortId: number
  resources: ApiResource[]
}

const TABS = ['My Programs', 'Resources', 'Certifications']

// ── File type config ─────────────────────────────────────────────────────────
function inferFileType(type: string) {
  const t = type.toUpperCase()
  if (t === 'PDF')                    return 'pdf'
  if (t === 'PRESENTATION')           return 'pptx'
  if (t === 'VIDEO' || t === 'LECTURE') return 'mp4'
  if (t === 'ARTICLE')                return 'docx'
  return 'pdf'
}

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:  File01Icon,
  pptx: PresentationBarChart01Icon,
  zip:  FolderZipIcon,
  docx: FileEditIcon,
  mp4:  Video01Icon,
}
const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#FEF2F2', text: '#D51520' },
  pptx: { bg: '#FFF7ED', text: '#EA580C' },
  zip:  { bg: '#F0F9FF', text: '#0EA5E9' },
  docx: { bg: '#F0FDF4', text: '#16A34A' },
  mp4:  { bg: '#F5F3FF', text: '#7C3AED' },
}

function ResourceRow({ resource }: { resource: ApiResource }) {
  const type = inferFileType(resource.type ?? '')
  const FileIcon = FILE_ICONS[type] ?? File01Icon
  const colours = FILE_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const dateStr = resource.createdAt ?? ''
  const uploaded = dateStr
    ? new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
    : ''

  return (
    <div className="flex items-center gap-3 py-2.5 hover:bg-[#f9fafb] rounded-[6px] px-2 transition-colors group">
      <div
        className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
        style={{ background: colours.bg }}
      >
        <FileIcon size={14} color={colours.text} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-[#111827] font-body truncate leading-snug">
          {resource.title ?? 'Resource'}
        </p>
        <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
          {(resource.type ?? '').toUpperCase()}{uploaded ? ` · ${uploaded}` : ''}
        </p>
      </div>
      {resource.link && (
        <a
          href={resource.link}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-[#4b5563] hover:text-[#374151]"
          aria-label="Download"
        >
          <Download01Icon size={14} strokeWidth={1.5} />
        </a>
      )}
    </div>
  )
}

// ── Badge helpers ─────────────────────────────────────────────────────────────
function statusStyle(s: string) {
  switch (s.toUpperCase()) {
    case 'ACTIVE':   return 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
    case 'PENDING':  return 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
    default:         return 'bg-[#F2F4F7] text-[#344054] border border-[#EAECF0]'
  }
}
function statusLabel(s: string) {
  return { ACTIVE: 'Active', PENDING: 'Pending', INACTIVE: 'Inactive' }[s.toUpperCase()] ?? s
}
function roleLabel(r: string): string | null {
  return { TEAM_LEAD: 'Team Lead', INSTRUCTOR: 'Instructor' }[r.toUpperCase()] ?? null
}
function levelLabel(l: string) {
  return { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced' }[l.toUpperCase()] ?? l
}
function formatDisplay(f: string) {
  return { BOOTCAMP: 'Bootcamp', WORKSHOP: 'Workshop', COURSE: 'Course' }[f.toUpperCase()] ?? ''
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ program }: { program: ApiProgram }) {
  const title        = program.title ?? 'Untitled Programme'
  const subtitle     = program.subtitle ?? program.description ?? ''
  const cohorts      = rCohorts(program)
  const cohort       = cohorts[0] ?? null
  const cohortId     = rId(cohort) || program.id
  const cohortName   = rTitle(cohort)
  const cohortLabel  = cohortName.replace(`${title} — `, '').replace(`${title} - `, '') || cohortName
  const membership   = rStatus(cohort)
  const role         = rRole(cohort)
  const modulesCount = program.modulesCount ?? 0
  const lessonsCount = program.lessonsCount ?? 0
  const enrolled     = program.enrolledStudentsCount ?? 0
  const enrollment   = rEnrollment(cohort)
  const isTeam       = enrollment?.enrollmentType === 'TEAM'

  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow">
      {/* Thumbnail */}
      <div
        className="h-[148px] bg-[#1a1d2e] bg-cover bg-center relative flex-shrink-0"
        style={{ backgroundImage: `url(${getProgramImage(title)})` }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          <span className="bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
            {levelLabel(program.level ?? 'INTERMEDIATE')}
          </span>
          {formatDisplay(program.format ?? '') && (
            <span className="bg-white/20 backdrop-blur-sm text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
              {formatDisplay(program.format ?? '')}
            </span>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-5">
        {/* Title + enrollment status */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[15px] font-semibold text-[#111827] font-display leading-snug flex-1">
            {title}
          </p>
          {membership && (
            <span className={`text-[10px] font-semibold font-display px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${statusStyle(membership)}`}>
              {statusLabel(membership)}
            </span>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-[12px] text-[#4b5563] font-body leading-[1.5] mb-2 line-clamp-2">
            {subtitle}
          </p>
        )}

        {/* Cohort + role badge + team pill */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <p className="text-[11px] text-[#4b5563] font-body truncate">
            {cohortLabel || cohortName || '—'}
          </p>
          {roleLabel(role) && (
            <span className="text-[10px] font-semibold font-display text-[#1a1d2e] bg-[#eaebf0] px-2 py-0.5 rounded-full flex-shrink-0">
              {roleLabel(role)}
            </span>
          )}
          {isTeam && enrollment && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold font-display text-[#b45309] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded-full flex-shrink-0">
              <UserGroup02Icon size={10} color="#b45309" strokeWidth={2} />
              Team {enrollment.seatsUsed}/{enrollment.seatsPurchased}
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          {(modulesCount > 0 || lessonsCount > 0) && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#4b5563] font-body">
              <BookOpen01Icon size={12} color="#4b5563" strokeWidth={1.5} />
              <span>
                {modulesCount > 0 && `${modulesCount} module${modulesCount !== 1 ? 's' : ''}`}
                {modulesCount > 0 && lessonsCount > 0 && ' · '}
                {lessonsCount > 0 && `${lessonsCount} lesson${lessonsCount !== 1 ? 's' : ''}`}
              </span>
            </div>
          )}
          {enrolled > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-[#4b5563] font-body">
              <UserGroupIcon size={12} color="#4b5563" strokeWidth={1.5} />
              <span>{enrolled} enrolled</span>
            </div>
          )}
        </div>


        {/* CTAs */}
        <div className="flex gap-2 mt-auto">
          <Link
            href={`/student/courses/${cohortId}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#d51520] text-white text-[12px] font-medium font-display px-4 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
          >
            View Course
            <ArrowRight01Icon size={13} color="white" strokeWidth={2} />
          </Link>
          <Link
            href={`/student/resources?cohort=${cohortId}`}
            className="flex-1 inline-flex items-center justify-center border border-[#e5e7eb] text-[#374151] text-[12px] font-medium font-display px-4 py-2.5 rounded-[8px] hover:bg-[#f9fafb] transition-colors"
          >
            Resources
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MyLearning() {
  const [activeTab, setActiveTab] = useState('My Programs')

  const [programs, setPrograms]               = useState<ApiProgram[]>([])
  const [resources, setResources]             = useState<ApiResource[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(true)
  const [loadingResources, setLoadingResources] = useState(false)
  // Fetch programs on mount
  useEffect(() => {
    apiClient.get('/users/me/programs')
      .then((res) => {
        const data = unwrap<ApiProgramsResponse>(res.data)
        setPrograms(Array.isArray(data?.programs) ? data.programs : [])
      })
      .catch(() => setPrograms([]))
      .finally(() => setLoadingPrograms(false))
  }, [])

  // Fetch resources when Resources tab is activated — needs cohortId from programs
  useEffect(() => {
    if (activeTab !== 'Resources') return
    const firstProgram = programs[0]
    const firstCohort  = rCohorts(firstProgram)[0] ?? null
    const cohortId     = firstCohort ? rId(firstCohort) : (firstProgram?.id ?? 0)
    if (!cohortId) return

    setLoadingResources(true)
    apiClient.get(`/cohorts/${cohortId}/resources`)
      .then((res) => {
        const data = unwrap<ApiResourcesResponse>(res.data)
        const list = Array.isArray(data?.resources) ? data.resources : []
        setResources(list.slice(0, 4))
      })
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false))
  }, [activeTab, programs])

  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-0">
        <p className="text-[17px] font-semibold text-[#111827] font-display leading-none">My Learning</p>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex border-b border-[#e5e7eb] px-6">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className="flex flex-col items-center pb-0 mr-6 last:mr-0">
            <span className={cn('pb-2.5 text-[14px] font-display transition-colors', activeTab === tab ? 'font-semibold text-[#d51715]' : 'font-normal text-[#4b5563] hover:text-[#374151]')}>
              {tab}
            </span>
            <div className={cn('h-[2px] w-full rounded-t-full transition-colors', activeTab === tab ? 'bg-[#d51715]' : 'bg-transparent')} />
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">

        {/* My Programs */}
        {activeTab === 'My Programs' && (
          loadingPrograms ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[#4b5563]">
              <Loading01Icon size={16} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[13px] font-body">Loading programmes…</span>
            </div>
          ) : programs.length === 0 ? (
            <div className="w-full py-10 text-center">
              <BookOpen01Icon size={36} color="#d1d5db" className="mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[14px] font-semibold text-[#374151] font-display">No programmes yet</p>
              <p className="text-[13px] text-[#4b5563] font-body mt-1">Your enrolled programmes will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 max-w-[1200px]">
              {programs.map((p) => <CourseCard key={p.id} program={p} />)}
            </div>
          )
        )}

        {/* Resources */}
        {activeTab === 'Resources' && (
          loadingResources ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[#4b5563]">
              <Loading01Icon size={16} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[13px] font-body">Loading resources…</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="py-8 text-center">
              <File01Icon size={32} color="#d1d5db" className="mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-[14px] font-semibold text-[#374151] font-display">No resources yet</p>
              <p className="text-[13px] text-[#4b5563] font-body mt-1">Session materials will appear here once uploaded.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col -mx-2">
                {resources.map((r) => <ResourceRow key={r.id} resource={r} />)}
              </div>
              <div className="mt-3 pt-3 border-t border-[#f3f4f6]">
                <Link href="/student/resources" className="flex items-center justify-center gap-1.5 text-[13px] font-semibold text-[#d51520] font-display hover:underline">
                  View all resources
                  <ArrowRight01Icon size={13} color="#d51520" strokeWidth={2} />
                </Link>
              </div>
            </>
          )
        )}

        {/* Certifications */}
        {activeTab === 'Certifications' && (
          <div className="py-8 text-center">
            <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">Not yet unlocked</p>
            <p className="text-[13px] text-[#4b5563] font-body">Complete your programme to earn your certificate.</p>
            <Link href="/student/certificate" className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-semibold text-[#d51520] font-display hover:underline">
              View requirements
              <ArrowRight01Icon size={13} color="#d51520" strokeWidth={2} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
