import TopNav from '@/components/layout/TopNav'
import {
  MOCK_ENROLLMENTS,
  MOCK_PROGRAMS,
} from '@/lib/mock-data'
import { getProgramImage } from '@/lib/program-images'
import Link from 'next/link'
import {
  BookOpen01Icon,
  UserGroupIcon,
  Clock01Icon,
  CheckmarkCircle01Icon,
  ArrowRight01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'

function ProgressRing({ value }: { value: number }) {
  const r = 20
  const circumference = 2 * Math.PI * r
  const offset = circumference - (value / 100) * circumference

  return (
    <div className="relative w-[52px] h-[52px] flex items-center justify-center flex-shrink-0">
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

  const enrolledProgramIds = new Set(enrolledCohorts.map((e) => e.program.id))
  const availablePrograms = MOCK_PROGRAMS.filter((p) => !enrolledProgramIds.has(p.id))

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
                description="You haven't enrolled in any programme. Browse available programmes below to get started."
              />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {enrolledCohorts.map(({ enrollment, cohort, program }) => (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex"
                >
                  {/* Thumbnail */}
                  <div
                    className="w-[200px] flex-shrink-0 bg-[#1a1d2e] bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${getProgramImage(program.title)})` }}
                  >
                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute top-3 left-3 bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                      {program.category === 'beginner' ? 'Beginner' : 'Professional'}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-6 flex items-center gap-6">
                    {/* Info block */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[18px] font-semibold text-[#111827] font-display leading-snug mb-0.5">
                        {program.title}
                      </p>
                      <p className="text-[13px] text-[#6b7280] font-body mb-3">
                        {cohort.name}
                      </p>

                      <div className="flex items-center gap-5 text-[12px] text-[#6b7280] font-body">
                        <div className="flex items-center gap-1.5">
                          <Clock01Icon size={13} color="#9ca3af" strokeWidth={1.5} />
                          <span>{program.duration}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <UserGroupIcon size={13} color="#9ca3af" strokeWidth={1.5} />
                          <span>{cohort.enrolled} students</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BookOpen01Icon size={13} color="#9ca3af" strokeWidth={1.5} />
                          <span>12 sessions</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-4">
                        <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden w-full max-w-[320px]">
                          <div
                            className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                        <p className="text-[11px] text-[#9ca3af] font-body mt-1">
                          {enrollment.progress}% complete
                        </p>
                      </div>
                    </div>

                    {/* Progress ring */}
                    <ProgressRing value={enrollment.progress} />

                    {/* CTA */}
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <Link
                        href={`/student/courses/${enrollment.cohortId}`}
                        className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
                      >
                        Continue
                        <ArrowRight01Icon size={14} color="white" strokeWidth={2} />
                      </Link>
                      <Link
                        href="/student/resources"
                        className="inline-flex items-center justify-center border border-[#e5e7eb] text-[#374151] text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#f9fafb] transition-colors"
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

        {/* Available Programs */}
        {availablePrograms.length > 0 && (
          <section className="mt-10">
            <p className="text-[13px] font-semibold text-[#374151] font-display uppercase tracking-widest mb-4">
              Available Programmes
            </p>
            <div className="grid grid-cols-4 gap-4">
              {availablePrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow"
                >
                  <div
                    className="h-[110px] bg-[#1a1d2e] bg-cover bg-center relative"
                    style={{ backgroundImage: `url(${getProgramImage(prog.title)})` }}
                  >
                    <div className="h-full w-full bg-black/30" />
                    <div className="absolute top-2.5 left-2.5 bg-white/20 backdrop-blur-sm text-white text-[9px] font-medium px-2 py-0.5 rounded-full font-display">
                      {prog.category === 'beginner' ? 'Beginner' : 'Professional'}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-[13px] font-semibold text-[#111827] font-display leading-snug mb-1">
                      {prog.title}
                    </p>
                    <p className="text-[11px] text-[#9ca3af] font-body leading-snug line-clamp-2 mb-3">
                      {prog.subtitle}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-[#6b7280] font-body">{prog.duration}</span>
                      <span className="text-[12px] font-bold text-[#111827] font-display">
                        ₦{prog.price.toLocaleString('en-NG')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
