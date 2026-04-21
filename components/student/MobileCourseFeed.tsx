import Link from 'next/link'
import { MOCK_ENROLLMENTS } from '@/lib/mock-data'
import { getProgramImage } from '@/lib/program-images'
import {
  ArrowRight01Icon,
  BookOpen01Icon,
  Clock01Icon,
  UserGroupIcon,
} from 'hugeicons-react'

export default function MobileCourseFeed() {
  const enrollments = MOCK_ENROLLMENTS

  if (enrollments.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="w-14 h-14 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mb-4">
          <BookOpen01Icon size={26} color="#d51520" strokeWidth={1.5} />
        </div>
        <p className="text-[16px] font-bold text-[#111827] font-display mb-1">
          No programmes yet
        </p>
        <p className="text-[13px] text-[#6b7280] font-body max-w-[260px] leading-relaxed mb-5">
          Browse Brixgate&apos;s AI programmes and join a cohort to start learning.
        </p>
        <Link
          href="/student/programs"
          className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
        >
          Browse Programmes
          <ArrowRight01Icon size={14} color="white" strokeWidth={2} />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">
        Continue Learning
      </p>

      {/* Horizontal scroll row of course cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
        {enrollments.map((enrollment) => {
          const program = enrollment.cohort.program
          const thumbImage = getProgramImage(program.title)
          const cohortLabel = enrollment.cohort.name.replace(`${program.title} — `, '')

          return (
            <div
              key={enrollment.id}
              className="bg-white rounded-[12px] border border-[#f0f0f2] overflow-hidden shadow-[0px_1px_3px_rgba(16,24,40,0.06)] flex-shrink-0 w-[240px] snap-start"
            >
              {/* Thumbnail */}
              <div
                className="h-[110px] bg-cover bg-center relative"
                style={{ backgroundImage: `url(${thumbImage})` }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute top-2.5 left-2.5 bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                  Active
                </div>
                {/* Progress ring */}
                <div className="absolute bottom-2.5 right-2.5">
                  <div className="relative w-9 h-9">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="14" fill="none"
                        stroke="#d51520" strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - enrollment.progress / 100)}`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white font-display">
                      {enrollment.progress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-3">
                <p className="text-[13px] font-semibold text-[#111827] font-display leading-snug mb-0.5 line-clamp-2">
                  {program.title}
                </p>
                <p className="text-[11px] text-[#9ca3af] font-body mb-2.5 truncate">
                  {cohortLabel}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1 text-[11px] text-[#9ca3af] font-body">
                    <Clock01Icon size={10} color="#9ca3af" strokeWidth={1.5} />
                    <span>{program.duration}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#9ca3af] font-body">
                    <UserGroupIcon size={10} color="#9ca3af" strokeWidth={1.5} />
                    <span>{enrollment.cohort.enrolled} students</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="h-1 bg-[#f3f4f6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#d51520] rounded-full"
                      style={{ width: `${enrollment.progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-[#9ca3af] font-body mt-0.5">{enrollment.progress}% complete</p>
                </div>

                <Link
                  href={`/student/courses/${enrollment.cohortId}`}
                  className="flex items-center justify-center gap-1.5 bg-[#d51520] text-white text-[12px] font-medium font-display py-2 rounded-[7px] hover:bg-[#b81119] transition-colors"
                >
                  Continue
                  <ArrowRight01Icon size={12} color="white" strokeWidth={2} />
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mt-1">
        <Link
          href="/student/resources"
          className="bg-white border border-[#f0f0f2] rounded-[10px] p-4 flex flex-col gap-1.5 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Resources</span>
          <span className="text-[13px] font-semibold text-[#111827] font-display">Session Materials</span>
        </Link>
        <Link
          href="/student/notifications"
          className="bg-white border border-[#f0f0f2] rounded-[10px] p-4 flex flex-col gap-1.5 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]"
        >
          <span className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Notifications</span>
          <span className="text-[13px] font-semibold text-[#111827] font-display">Updates & Alerts</span>
        </Link>
      </div>
    </div>
  )
}
