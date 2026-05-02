import Link from 'next/link'
import Image from 'next/image'

const CHATGPT_IMG = '/images/ChatGPT%20Icon.png'

/*
  Claude "A" mark — Anthropic's brand mark approximated as inline SVG.
  Replace with the real exported SVG from Figma once available.
*/
function ClaudeMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Anthropic-style "A" with the diagonal stroke */}
      <rect width="32" height="32" rx="8" fill="#CC785C" />
      <path
        d="M18.8 8L24 22H21.2L19.8 18H12.2L10.8 22H8L13.2 8H18.8ZM16 10.8L13.1 16.4H18.9L16 10.8Z"
        fill="white"
      />
    </svg>
  )
}

const glassStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.12)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 24px rgba(0,0,0,0.15)',
}

const TOOLS = [
  {
    name: 'ChatGPT',
    desc: 'Communicate with and direct AI models',
    iconBg: 'rgba(255,255,255,0.9)',
    renderIcon: () => (
      <Image
        src={CHATGPT_IMG}
        alt="ChatGPT"
        width={32}
        height={32}
        className="w-8 h-8 object-contain"
      />
    ),
  },
  {
    name: 'Claude AI',
    desc: 'Build applications and systems with AI',
    iconBg: 'rgba(204,120,92,0.25)',
    renderIcon: () => <ClaudeMark size={32} />,
  },
]

export default function PromoBanner() {
  return (
    <div
      className="rounded-[10px] p-6 flex items-center justify-between gap-6 overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #542186 19%, rgba(73,9,135,0.9) 29%, #922bf7 100%)',
      }}
    >
      {/* Ambient orb */}
      <div
        className="absolute top-[-40px] left-[35%] w-[180px] h-[180px] rounded-full pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.07)', filter: 'blur(50px)' }}
      />

      {/* Left — text + CTA */}
      <div className="flex flex-col gap-3 min-w-0 shrink flex-1 lg:max-w-[300px] relative z-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60 font-display mb-1.5">
            AI Co-Pilot Programme
          </p>
          <p className="text-[19px] font-bold text-white font-display leading-snug">
            Meet Your New Co-Pilot
          </p>
          <p className="text-[12px] text-white/75 font-body leading-relaxed mt-1.5">
            AI won&apos;t replace you — it will empower you. Learn to work alongside
            the tools that are reshaping every industry.
          </p>
        </div>
        <Link
          href="/student/programs"
          className="inline-flex items-center justify-center bg-white text-[#542186] text-[12px] font-semibold font-display px-4 py-2 rounded-[8px] hover:bg-white/90 transition-colors w-fit shadow-sm"
        >
          View our Courses
        </Link>
      </div>

      {/* Right — AI tool cards (hidden on mobile) */}
      <div className="hidden lg:flex gap-3 shrink-0 relative z-10">
        {TOOLS.map((tool, i) => (
          <div
            key={tool.name}
            className={`rounded-[12px] p-4 flex flex-col gap-3 w-[170px] xl:w-[195px] 2xl:w-[215px] ${
              i === 1 ? 'hidden xl:flex' : 'flex'
            }`}
            style={glassStyle}
          >
            <div
              className="w-11 h-11 rounded-[10px] flex items-center justify-center overflow-hidden"
              style={{ background: tool.iconBg }}
            >
              {tool.renderIcon()}
            </div>
            <div>
              <p className="text-[14px] font-semibold text-white font-display leading-none mb-1">
                {tool.name}
              </p>
              <p className="text-[11px] text-white/65 font-body leading-snug">
                {tool.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
