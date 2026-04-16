import TopNav from '@/components/layout/TopNav'
import { MOCK_ENROLLMENTS } from '@/lib/mock-data'
import { getProgramImage } from '@/lib/program-images'
import Link from 'next/link'
import {
  BookOpen01Icon,
  UserGroupIcon,
  Clock01Icon,
  ArrowRight01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'

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
      <span className="absolute text-[10px] font-bold text-[#111827] font-display">{value}%</span>
    </div>
  )
}

export default function ProgramsPage() {
  const enrolledCohorts = MOCK_ENROLLMENTS.map((e) => ({
    enrollment: e,
    cohort: e.cohort,
    program: e.cohort.program,
  }))

  return (
    <>
      <TopNav title="My Programs" />

      <div className="px-8 pb-10">
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
            Enrolled ({enrolledCohorts.length})
          </p>

          {enrolledCohorts.length === 0 ? (
            <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
              <EmptyState
                icon={BookOpen01Icon}
                title="No programmes yet"
                description="You haven&apos;t enrolled in any programme yet."
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-5">
              {enrolledCohorts.map(({ enrollment, cohort, program }) => (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-[148px] bg-[#1a1d2e] bg-cover bg-center relative flex-shrink-0"
                    style={{ backgroundImage: `url(${getProgramImage(program.title)})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute top-3 left-3 bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                      {program.category === 'beginner' ? 'Beginner' : 'Professional'}
                    </div>
                    {/* Progress ring overlay */}
                    <div className="absolute bottom-3 right-3">
                      <ProgressRing value={enrollment.progress} />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-5">
                    <p className="text-[15px] font-semibold text-[#111827] font-display leading-snug mb-0.5">
                      {program.title}
                    </p>
                    <p className="text-[12px] text-[#6b7280] font-body mb-4">
                      {cohort.name}
                    </p>

                    {/* Meta */}
                    <div className="flex flex-col gap-1.5 mb-4">
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                        <Clock01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
                        <span>{program.duration}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                        <UserGroupIcon size={12} color="#9ca3af" strokeWidth={1.5} />
                        <span>{cohort.enrolled} students</span>
                      </div>
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
                          style={{ width: `${enrollment.progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-[#9ca3af] font-body mt-1">
                        {enrollment.progress}% complete
                      </p>
                    </div>

                    {/* CTAs — pushed to bottom */}
                    <div className="flex gap-2 mt-auto">
                      <Link
                        href={`/student/courses/${enrollment.cohortId}`}
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
