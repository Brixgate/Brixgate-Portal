import Image from 'next/image'

interface AuthShellProps {
  children: React.ReactNode
  gradient: string
  imageSrc: string
  imageAlt?: string
  logoSrc?: string
  title: string
  subtitle: string
  /** Column ratio e.g. "4fr 8fr" or "5fr 7fr" */
  gridCols?: string
  imageWidth?: number
  imageHeight?: number
}

export default function AuthShell({
  children,
  gradient,
  imageSrc,
  imageAlt = 'Student',
  logoSrc = '/images/logo3.png',
  title,
  subtitle,
  gridCols = '5fr 7fr',
  imageWidth = 395,
  imageHeight = 495,
}: AuthShellProps) {
  // Normalise: callers used to pass "4fr_8fr" (underscores) — support both formats
  const gridTemplate = gridCols.replace(/_/g, ' ')

  return (
    <div
      className="min-h-screen w-full flex items-start justify-center p-5 lg:p-[38px]"
      style={{ background: '#0D1724' }}
    >
      {/*
       * Grid container:
       *   mobile  → 1 column (left panel hidden, right panel fills width)
       *   lg+     → two columns driven by the CSS variable --auth-cols
       *
       * We use a CSS variable instead of a dynamic Tailwind class because
       * Tailwind JIT only scans static strings — template literals produce
       * classes that are never compiled.
       */}
      <div
        className="w-full grid grid-cols-1 lg:[grid-template-columns:var(--auth-cols)] gap-5 lg:gap-6"
        style={
          {
            '--auth-cols': gridTemplate,
            minHeight: 'calc(100vh - 76px)',
          } as React.CSSProperties
        }
      >
        {/* ── LEFT PANEL — hidden on mobile, shown lg+ ── */}
        <div
          className="hidden lg:flex relative flex-col overflow-hidden rounded-[20px] shadow-2xl"
          style={{ background: gradient }}
        >
          {/* Logo + tagline */}
          <div className="relative z-10 flex flex-col gap-5 px-8 pt-[120px]">
            <Image
              src={logoSrc}
              alt="Brixgate"
              width={36}
              height={36}
              className="object-contain brightness-0 invert"
            />
            <div>
              <h2 className="text-white font-display font-semibold text-[32px] leading-[1.35] mb-3 whitespace-pre-line">
                {title}
              </h2>
              <p className="text-white font-body text-[16px] leading-[1.65]">
                {subtitle}
              </p>
            </div>
          </div>

          {/* Bottom: flags + person image */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between z-10">
            <div className="mb-8 px-5">
              <Image
                src="/images/Flags Container.png"
                alt="Global community"
                width={110}
                height={28}
                className="object-contain"
              />
            </div>
            <div className="self-end">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={imageWidth}
                height={imageHeight}
                className="object-contain object-bottom"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL — full width on mobile, right column on lg+ ── */}
        <div className="bg-white flex flex-col overflow-y-auto rounded-[20px] shadow-2xl min-h-screen lg:min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}
