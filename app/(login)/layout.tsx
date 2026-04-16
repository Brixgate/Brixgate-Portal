import AuthShell from '@/components/auth/AuthShell'

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell
      gradient="linear-gradient(225deg, #6B21A870 0%, #172435 40%)"
      imageSrc="/images/Man sign.png"
      imageAlt="Student"
      title={`Build Skills That Power\nGlobal Careers`}
      subtitle="We build and certify professionals who deliver with capability, character, and conviction AI-ready, trusted, and globally relevant."
    >
      {children}
    </AuthShell>
  )
}
