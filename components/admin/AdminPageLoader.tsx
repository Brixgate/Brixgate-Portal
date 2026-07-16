'use client'

import Image from 'next/image'

export default function AdminPageLoader() {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-5">
        <Image
          src="/images/Logo red.png"
          alt="Loading…"
          width={48}
          height={56}
          priority
          className="animate-bounce"
          style={{ animationDuration: '1s', animationTimingFunction: 'cubic-bezier(0.28,0.84,0.42,1)' }}
        />
        <p className="text-[12px] font-medium text-[#4b5563] font-body tracking-wide">Loading…</p>
      </div>
    </div>
  )
}
