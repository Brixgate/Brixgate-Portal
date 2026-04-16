import Link from 'next/link'
import { MOCK_ENROLLMENTS } from '@/lib/mock-data'
import { getProgramImage } from '@/lib/program-images'
import { ArrowRight01Icon, BookOpen01Icon } from 'hugeicons-react'

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

      {enrollments.map((enrollment) => {
        const program = enrollment.cohort.program
        const thumbImage = getProgramImage(program.title)

        return (
          <div
            key={enrollment.id}
            className="bg-white rounded-[12px] border border-[#f0f0f2] overflow-hidden shadow-[0px_1px_3px_rgba(16,24,40,0.06)]"
          >
            {/* Thumbnail */}
            <div
              className="h-[120px] bg-cover bg-center relative"
              style={{ backgroundImage: `url(${thumbImage})` }}
            >
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute top-3 left-3 bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display">
                Active
              </div>
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-white text-[14px] font-semibold font-display leading-snug">
                  {program.title}
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="px-4 py-4">
              <p className="text-[12px] text-[#9ca3af] font-body mb-3 truncate">
                {enrollment.cohort.name}
              </p>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-[#9ca3af] font-body">Progress</span>
                  <span className="text-[12px] font-bold text-[#111827] font-display">
                    {enrollment.progress}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                    style={{ width: `${enrollment.progress}%` }}
                  />
                </div>
              </div>

              <Link
                href="/student/programs"
                className="flex items-center justify-center gap-2 bg-[#d51520] text-white text-[13px] font-medium font-display py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
              >
                Continue Learning
                <ArrowRight01Icon size={14} color="white" strokeWidth={2} />
              </Link>
            </div>
          </div>
        )
      })}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <Link
          href="/student/resources"
          className="bg-white border border-[#f0f0f2] rounded-[10px] p-4 flex flex-col gap-2 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Resources</span>
          <span className="text-[13px] font-semibold text-[#111827] font-display">Session Materials</span>
        </Link>
        <Link
          href="/student/notifications"
          className="bg-white border border-[#f0f0f2] rounded-[10px] p-4 flex flex-col gap-2 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">Notifications</span>
          <span className="text-[13px] font-semibold text-[#111827] font-display">Updates & Alerts</span>
        </Link>
      </div>
    </div>
  )
}
