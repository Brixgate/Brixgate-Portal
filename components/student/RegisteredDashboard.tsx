'use client'

import Link from 'next/link'
import { ArrowRight01Icon, GridIcon } from 'hugeicons-react'
import { BRIXGATE_WEBSITE, enrollUrl, suggestedProgrammes } from '@/lib/registered-programmes'

export default function RegisteredDashboard() {
  const suggested = suggestedProgrammes(3)

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome banner */}
      <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center gap-6">
        <div className="w-14 h-14 rounded-[12px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
          <GridIcon size={26} color="#d51520" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-bold text-[#111827] font-display mb-1">
            Welcome to Brixgate
          </h2>
          <p className="text-[14px] text-[#4b5563] font-body leading-relaxed max-w-[480px]">
            Your account is active. Pick a programme below and enrol to unlock your full dashboard — live sessions, resources, and your certificate.
          </p>
        </div>
        <a
          href={`${BRIXGATE_WEBSITE}/programme`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-[#d51520] text-white text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#b81119] transition-colors flex-shrink-0"
        >
          View all programmes
          <ArrowRight01Icon size={14} color="white" strokeWidth={2} />
        </a>
      </div>

      {/* Suggested programmes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[15px] font-semibold text-[#111827] font-display">
            Programmes for you
          </p>
          <Link
            href="/student/programs"
            className="text-[13px] font-medium text-[#d51520] font-display hover:underline"
          >
            See all
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggested.map((prog) => (
            <div
              key={prog.slug}
              className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col hover:shadow-[0px_4px_12px_rgba(16,24,40,0.10)] transition-shadow"
            >
              {/* Thumbnail */}
              <div
                className="h-[120px] bg-[#1a1d2e] bg-cover bg-center relative flex-shrink-0"
                style={{ backgroundImage: `url(${prog.image})` }}
              >
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute top-3 left-3">
                  <span className="bg-[#d51520] text-white text-[9px] font-semibold px-2 py-0.5 rounded-full font-display uppercase tracking-wide">
                    Professional
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col flex-1 p-4">
                <p className="text-[14px] font-semibold text-[#111827] font-display leading-snug mb-1">
                  {prog.title}
                </p>
                <p className="text-[12px] text-[#4b5563] font-body leading-[1.5] line-clamp-2 mb-4 flex-1">
                  {prog.subtitle}
                </p>
                <a
                  href={enrollUrl(prog)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#d51520] text-white text-[12px] font-medium font-display px-4 py-2 rounded-[8px] hover:bg-[#b81119] transition-colors"
                >
                  Enrol Now
                  <ArrowRight01Icon size={12} color="white" strokeWidth={2} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Foundations strip */}
      <div className="bg-[#1a1d2e] rounded-[10px] p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 font-display mb-1">
            AI Foundations
          </p>
          <p className="text-[16px] font-semibold text-white font-display mb-1">
            New to AI? Start here.
          </p>
          <p className="text-[13px] text-white/70 font-body leading-relaxed max-w-[360px]">
            Beginner-friendly programmes that build real AI skills from the ground up — no prior experience needed.
          </p>
        </div>
        <a
          href={`${BRIXGATE_WEBSITE}/foundations`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-[#1a1d2e] text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
        >
          Explore Foundations
          <ArrowRight01Icon size={14} color="#1a1d2e" strokeWidth={2} />
        </a>
      </div>
    </div>
  )
}
