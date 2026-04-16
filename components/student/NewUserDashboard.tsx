import Link from 'next/link'
import { BookOpen01Icon, ArrowRight01Icon } from 'hugeicons-react'
import { MOCK_PROGRAMS } from '@/lib/mock-data'
import { getProgramImage } from '@/lib/program-images'

export default function NewUserDashboard() {
  const programs = MOCK_PROGRAMS.slice(0, 4)

  return (
    <div className="flex flex-col gap-6">
      {/* Hero empty state */}
      <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] px-10 py-14 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-[14px] bg-[#fef2f2] flex items-center justify-center mb-5">
          <BookOpen01Icon size={30} color="#d51520" strokeWidth={1.5} />
        </div>
        <h2 className="text-[22px] font-bold text-[#111827] font-display mb-2">
          You&apos;re not enrolled in any programme yet
        </h2>
        <p className="text-[14px] text-[#6b7280] font-body max-w-[400px] leading-relaxed mb-6">
          Browse Brixgate&apos;s AI programmes and join a cohort to start learning.
          Your dashboard will unlock once you&apos;re enrolled.
        </p>
        <Link
          href="/student/programs"
          className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[14px] font-medium font-display px-6 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors"
        >
          Browse Programmes
          <ArrowRight01Icon size={16} color="white" strokeWidth={2} />
        </Link>
      </div>

      {/* Programme suggestions */}
      <div>
        <p className="text-[15px] font-semibold text-[#111827] font-display mb-4">
          Available Programmes
        </p>
        <div className="grid grid-cols-4 gap-4">
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow"
            >
              <div
                className="h-[100px] bg-[#1a1d2e] bg-cover bg-center"
                style={{ backgroundImage: `url(${getProgramImage(prog.title)})` }}
              >
                <div className="h-full w-full bg-black/30" />
              </div>
              <div className="p-4">
                <p className="text-[13px] font-semibold text-[#111827] font-display leading-snug mb-1">
                  {prog.title}
                </p>
                <p className="text-[12px] text-[#9ca3af] font-body leading-snug line-clamp-2">
                  {prog.subtitle}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-[#6b7280] font-body">{prog.duration}</span>
                  <Link
                    href="/student/programs"
                    className="text-[12px] font-semibold text-[#d51520] font-display hover:underline"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promo banner still shown to new users */}
      <div
        className="rounded-[10px] p-6 flex items-center justify-between overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, #542186 19%, rgba(73,9,135,0.9) 29%, #922bf7 100%)',
        }}
      >
        <div className="flex flex-col gap-2 max-w-[400px]">
          <p className="text-[18px] font-semibold text-white font-display">
            Meet Your New Co-Pilot
          </p>
          <p className="text-[12px] text-white/80 font-body leading-[18px]">
            AI won&apos;t replace you; it will empower you. Enrol in a programme today to get started.
          </p>
          <Link
            href="/student/programs"
            className="inline-flex items-center justify-center bg-[#d51715] text-white text-[12px] font-medium font-display px-4 py-2 rounded-[8px] hover:bg-[#b81119] transition-colors w-fit mt-1"
          >
            View our Courses
          </Link>
        </div>
      </div>
    </div>
  )
}
