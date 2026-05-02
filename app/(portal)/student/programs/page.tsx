'use client'

import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import { getProgramImage } from '@/lib/program-images'
import Link from 'next/link'
import {
  BookOpen01Icon,
  UserGroupIcon,
  Clock01Icon,
  ArrowRight01Icon,
  Loading01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { apiClient, unwrap } from '@/lib/api-client'
import axios from 'axios'

// ── API shape ─────────────────────────────────────────────────────────────────
interface ApiCohort {
  id: number
  name: string
  enrolled?: number
  start_date?: string
  end_date?: string
}

interface ApiEnrollment {
  id: number
  progress?: number
  enrolled_at?: string
  cohort_id?: number
  cohort?: ApiCohort
}

interface ApiProgram {
  id: number
  title: string
  slug?: string
  category?: string
  duration?: string
  enrollment?: ApiEnrollment
  // Sometimes programs come with nested enrollment, sometimes as flat enrollments
  progress?: number
  cohort?: ApiCohort
  cohort_id?: number
  enrolled_at?: string
}

// ── Normalised row ────────────────────────────────────────────────────────────
interface ProgramRow {
  enrollmentId: number
  cohortId: number
  title: string
  category: string
  duration: string
  progress: number
  cohortName: string
  cohortLabel: string
  enrolled: number
  enrolledAt: string
  endDate: string
  startDate: string
}

function normalise(raw: ApiProgram): ProgramRow {
  const enrollment = raw.enrollment
  const cohort = enrollment?.cohort ?? raw.cohort ?? null

  const title = raw.title ?? 'Untitled Programme'
  const cohortName = cohort?.name ?? 'Cohort'
  const cohortLabel = cohortName.replace(`${title} — `, '').replace(`${title} - `, '')

  return {
    enrollmentId: enrollment?.id ?? raw.id,
    cohortId: enrollment?.cohort_id ?? cohort?.id ?? raw.cohort_id ?? 0,
    title,
    category: raw.category ?? 'professional',
    duration: raw.duration ?? '12 weeks',
    progress: enrollment?.progress ?? raw.progress ?? 0,
    cohortName,
    cohortLabel,
    enrolled: cohort?.enrolled ?? 0,
    enrolledAt: enrollment?.enrolled_at ?? raw.enrolled_at ?? '',
    endDate: cohort?.end_date ?? '',
    startDate: cohort?.start_date ?? '',
  }
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
  const [programs, setPrograms] = useState<ProgramRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/users/me/programs')
        const data = unwrap<ApiProgram[]>(res.data)
        const rows = (Array.isArray(data) ? data : []).map(normalise)
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
                  key={p.enrollmentId}
                  className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-[148px] bg-[#1a1d2e] bg-cover bg-center relative flex-shrink-0"
                    style={{ backgroundImage: `url(${getProgramImage(p.title)})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute top-3 left-3 bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                      {p.category === 'beginner' ? 'Beginner' : 'Professional'}
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <ProgressRing value={p.progress} />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-5">
                    <p className="text-[15px] font-semibold text-[#111827] font-display leading-snug mb-0.5">
                      {p.title}
                    </p>
                    <p className="text-[12px] text-[#6b7280] font-body mb-4">
                      {p.cohortLabel}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-col gap-1.5 mb-4">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                        <Clock01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
                        <span>{p.duration}</span>
                      </div>
                      {p.enrolled > 0 && (
                        <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                          <UserGroupIcon size={12} color="#9ca3af" strokeWidth={1.5} />
                          <span>{p.enrolled} students</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                        <BookOpen01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
                        <span>12 sessions</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-5">
                      <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden w-full">
                        <div
                          className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                          style={{ width: `${p.progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#9ca3af] font-body mt-1">
                        {p.progress}% complete
                      </p>
                    </div>

                    {/* CTAs */}
                    <div className="flex gap-2 mt-auto">
                      <Link
                        href={`/student/courses/${p.cohortId}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#d51520] text-white text-[12px] font-medium font-display px-4 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
                      >
                        Continue
                        <ArrowRight01Icon size={13} color="white" strokeWidth={2} />
                      </Link>
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
    </>
  )
}
