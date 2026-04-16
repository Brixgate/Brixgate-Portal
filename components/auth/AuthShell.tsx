import Image from 'next/image'

interface AuthShellProps {
  children: React.ReactNode
  gradient: string
  imageSrc: string
  imageAlt?: string
  logoSrc?: string
  title: string
  subtitle: string
}

export default function AuthShell({
  children,
  gradient,
  imageSrc,
  imageAlt = 'Student',
  logoSrc = '/images/logo3.png',
  title,
  subtitle,
}: AuthShellProps) {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-[38px]"
      style={{ background: '#0D1724' }}
    >
      <div
        className="w-full grid grid-cols-[5fr_7fr] gap-[24px]"
        style={{ minHeight: '700px' }}
      >
        {/* ── LEFT PANEL ── */}
        <div
          className="relative flex flex-col overflow-hidden rounded-[20px] shadow-2xl"
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

          {/* Bottom: image + flags side by side */}
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
                width={395}
                height={495}
                className="object-contain object-bottom"
              />
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="bg-white flex flex-col overflow-y-auto rounded-[20px] shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  )
}
