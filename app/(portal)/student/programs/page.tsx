'use client'

import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import { getProgramImage } from '@/lib/program-images'
import Link from 'next/link'
import {
  BookOpen01Icon,
  UserGroupIcon,
  UserGroup02Icon,
  ArrowRight01Icon,
  Loading01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { apiClient, unwrap } from '@/lib/api-client'
import TeamFeature from '@/components/teams/TeamFeature'
import axios from 'axios'

// ── API shape (matches /users/me/programs Swagger spec) ──────────────────────
interface ApiCohortSummary {
  // camelCase (Swagger) — also read snake_case fallbacks at runtime
  cohortId?: number
  cohortTitle?: string
  role?: string
  membershipStatus?: string
}

interface ApiProgram {
  id: number
  title: string
  subtitle?: string
  description?: string
  slug?: string
  level?: string
  category?: string
  format?: string
  autoPercentCompletion?: number
  modulesCount?: number
  lessonsCount?: number
  enrolledStudentsCount?: number
  myCohorts?: ApiCohortSummary[]
}

// ── Defensive field readers (handles camelCase + snake_case from API) ─────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortId(c: any): number   { return c?.cohortId   ?? c?.cohort_id   ?? 0  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortTitle(c: any): string { return c?.cohortTitle ?? c?.cohort_title ?? '' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readMyCohorts(p: any): ApiCohortSummary[] { return p?.myCohorts ?? p?.my_cohorts ?? [] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readEnrollment(c: any) {
  const e = c?.cohortEnrollment ?? c?.cohort_enrollment ?? null
  if (!e) return null
  return {
    id:               e.id as number,
    enrollmentType:   (e.enrollmentType ?? e.enrollment_type ?? 'INDIVIDUAL') as string,
    seatsPurchased:   (e.seatsPurchased  ?? e.seats_purchased  ?? 1)  as number,
    seatsUsed:        (e.seatsUsed       ?? e.seats_used        ?? 1)  as number,
    buyerIsParticipant: (e.buyerIsParticipant ?? e.buyer_is_participant ?? true) as boolean,
  }
}

interface ApiProgramsResponse {
  programs: ApiProgram[]
  pagination?: {
    page: number
    size: number
    totalElements: number
    totalPages: number
  }
}

// ── Normalised row ────────────────────────────────────────────────────────────
interface ProgramRow {
  programId: number
  cohortId: number
  title: string
  subtitle: string
  level: string
  format: string
  progress: number
  cohortName: string
  cohortLabel: string
  enrolled: number
  membershipStatus: string
  role: string
  modulesCount: number
  lessonsCount: number
  // enrollment plan
  enrollmentId: number | null
  enrollmentType: string        // 'INDIVIDUAL' | 'TEAM'
  seatsPurchased: number
  seatsUsed: number
  isTeamLead: boolean           // has cohort_enrollment payload = is the buyer
  buyerIsParticipant: boolean
}

function normalise(raw: ApiProgram): ProgramRow {
  const cohorts    = readMyCohorts(raw)
  const cohort     = cohorts[0] ?? null
  const title      = raw.title ?? 'Untitled Programme'
  const cohortName = readCohortTitle(cohort)
  const cohortLabel = cohortName
    .replace(`${title} — `, '')
    .replace(`${title} - `, '')
    || cohortName
  const enrollment = readEnrollment(cohort)

  return {
    programId: raw.id,
    cohortId:  readCohortId(cohort),
    title,
    subtitle: raw.subtitle ?? raw.description ?? '',
    level:    raw.level ?? 'INTERMEDIATE',
    format:   raw.format ?? '',
    progress: raw.autoPercentCompletion ?? 0,
    cohortName,
    cohortLabel,
    enrolled:         raw.enrolledStudentsCount ?? 0,
    membershipStatus: (cohort as Record<string, unknown>)?.['membershipStatus'] as string ?? (cohort as Record<string, unknown>)?.['membership_status'] as string ?? '',
    role:             (cohort as Record<string, unknown>)?.['role'] as string ?? '',
    modulesCount:     raw.modulesCount ?? 0,
    lessonsCount:     raw.lessonsCount ?? 0,
    enrollmentId:        enrollment?.id ?? null,
    enrollmentType:      enrollment?.enrollmentType ?? 'INDIVIDUAL',
    seatsPurchased:      enrollment?.seatsPurchased ?? 1,
    seatsUsed:           enrollment?.seatsUsed ?? 1,
    isTeamLead:          enrollment !== null && enrollment.enrollmentType === 'TEAM',
    buyerIsParticipant:  enrollment?.buyerIsParticipant ?? true,
  }
}

// ── Status / role badge helpers ───────────────────────────────────────────────
function statusStyle(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':   return 'bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]'
    case 'PENDING':  return 'bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]'
    case 'INACTIVE': return 'bg-[#F2F4F7] text-[#344054] border border-[#EAECF0]'
    default:         return 'bg-[#F2F4F7] text-[#344054] border border-[#EAECF0]'
  }
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'Active', PENDING: 'Pending', INACTIVE: 'Inactive',
  }
  return map[status.toUpperCase()] ?? status
}

function roleLabel(role: string): string | null {
  const map: Record<string, string> = {
    TEAM_LEAD: 'Team Lead', INSTRUCTOR: 'Instructor', ADMIN: 'Admin',
  }
  return map[role.toUpperCase()] ?? null
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced',
  }
  return map[level.toUpperCase()] ?? level
}

function formatDisplay(format: string): string {
  const map: Record<string, string> = {
    BOOTCAMP: 'Bootcamp', WORKSHOP: 'Workshop', COURSE: 'Course',
  }
  return map[format.toUpperCase()] ?? ''
}

// ── Progress ring ─────────────────────────────────────────────────────────────
function ProgressRing({ value }: { value: number }) {
  const r = 20
  const circumference = 2 * Math.PI * r
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative w-[48px] h-[48px] flex items-center justify-center flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#f3f4f6" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          stroke="#d51520"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white font-display">{value}%</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProgramsPage() {
  const [programs, setPrograms]   = useState<ProgramRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [teamProgram, setTeamProgram] = useState<ProgramRow | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/users/me/programs')
        const data = unwrap<ApiProgramsResponse>(res.data)
        const list = Array.isArray(data?.programs) ? data.programs : []
        const rows = list.map(normalise)
        setPrograms(rows)
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          // Not logged in — show empty state, not an error
          setPrograms([])
        } else {
          setError('Unable to load programmes. Please try again.')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <TopNav title="My Programs" />

      <div className="px-4 md:px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
            My Programs
          </h1>
          <p className="text-[14px] text-[#6b7280] font-body mt-1">
            Track your progress across all enrolled programmes.
          </p>
        </div>

        {/* Enrolled Programs */}
        <section>
          <p className="text-[13px] font-semibold text-[#374151] font-display uppercase tracking-widest mb-4">
            Enrolled ({loading ? '—' : programs.length})
          </p>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-2 text-[#9ca3af]">
              <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[13px] font-body">Loading your programmes…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-8 text-center">
              <p className="text-[14px] text-[#d51520] font-body">{error}</p>
              <button
                onClick={() => { setError(null); setLoading(true) }}
                className="mt-4 text-[13px] text-[#d51520] font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && programs.length === 0 && (
            <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
              <EmptyState
                icon={BookOpen01Icon}
                title="No programmes yet"
                description="You haven't enrolled in any programme yet."
              />
            </div>
          )}

          {/* Grid */}
          {!loading && !error && programs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {programs.map((p) => (
                <div
                  key={p.programId}
                  className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-[148px] bg-[#1a1d2e] bg-cover bg-center relative flex-shrink-0"
                    style={{ backgroundImage: `url(${getProgramImage(p.title)})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    {/* Level + format badges */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span className="bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                        {levelLabel(p.level)}
                      </span>
                      {formatDisplay(p.format) && (
                        <span className="bg-white/20 backdrop-blur-sm text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                          {formatDisplay(p.format)}
                        </span>
                      )}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <ProgressRing value={p.progress} />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-5">

                    {/* Title + enrollment status */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[15px] font-semibold text-[#111827] font-display leading-snug flex-1">
                        {p.title}
                      </p>
                      {p.membershipStatus && (
                        <span className={`text-[10px] font-semibold font-display px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${statusStyle(p.membershipStatus)}`}>
                          {statusLabel(p.membershipStatus)}
                        </span>
                      )}
                    </div>

                    {/* Subtitle / description */}
                    {p.subtitle && (
                      <p className="text-[12px] text-[#6b7280] font-body leading-[1.5] mb-2 line-clamp-2">
                        {p.subtitle}
                      </p>
                    )}

                    {/* Cohort name + role badge + team badge */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <p className="text-[11px] text-[#9ca3af] font-body truncate">
                        {p.cohortLabel || p.cohortName || '—'}
                      </p>
                      {roleLabel(p.role) && (
                        <span className="text-[10px] font-semibold font-display text-[#1a1d2e] bg-[#eaebf0] px-2 py-0.5 rounded-full flex-shrink-0">
                          {roleLabel(p.role)}
                        </span>
                      )}
                      {p.enrollmentType === 'TEAM' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold font-display text-[#b45309] bg-[#fffbeb] border border-[#fde68a] px-2 py-0.5 rounded-full flex-shrink-0">
                          <UserGroup02Icon size={10} color="#b45309" strokeWidth={2} />
                          Team {p.seatsUsed}/{p.seatsPurchased}
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      {(p.modulesCount > 0 || p.lessonsCount > 0) && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                          <BookOpen01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
                          <span>
                            {p.modulesCount > 0 && `${p.modulesCount} module${p.modulesCount !== 1 ? 's' : ''}`}
                            {p.modulesCount > 0 && p.lessonsCount > 0 && ' · '}
                            {p.lessonsCount > 0 && `${p.lessonsCount} lesson${p.lessonsCount !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                      )}
                      {p.enrolled > 0 && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                          <UserGroupIcon size={12} color="#9ca3af" strokeWidth={1.5} />
                          <span>{p.enrolled} enrolled</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-[#9ca3af] font-body">Progress</span>
                        <span className="text-[11px] font-semibold text-[#d51520] font-display">{p.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden w-full">
                        <div
                          className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="flex gap-2 mt-auto flex-wrap">
                      <Link
                        href={`/student/courses/${p.cohortId}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#d51520] text-white text-[12px] font-medium font-display px-4 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
                      >
                        View Course
                        <ArrowRight01Icon size={13} color="white" strokeWidth={2} />
                      </Link>
                      {p.isTeamLead && (
                        <button
                          onClick={() => setTeamProgram(p)}
                          className="inline-flex items-center justify-center gap-1.5 border border-[#fde68a] bg-[#fffbeb] text-[#b45309] text-[12px] font-medium font-display px-3 py-2.5 rounded-[8px] hover:bg-[#fef9c3] transition-colors flex-shrink-0"
                        >
                          <UserGroup02Icon size={13} color="#b45309" strokeWidth={2} />
                          Teams
                        </button>
                      )}
                      <Link
                        href="/student/resources"
                        className="flex-1 inline-flex items-center justify-center border border-[#e5e7eb] text-[#374151] text-[12px] font-medium font-display px-4 py-2.5 rounded-[8px] hover:bg-[#f9fafb] transition-colors"
                      >
                        Resources
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {teamProgram && (
        <TeamFeature onClose={() => setTeamProgram(null)} />
      )}
    </>
  )
}
