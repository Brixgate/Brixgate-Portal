import AuthShell from '@/components/auth/AuthShell'

export default function AuthCompactLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell
      gradient="linear-gradient(225deg, #D5152070 0%, #172435 40%)"
      imageSrc="/images/bag lady.png"
      imageAlt="Student"
      title={`Building the Next\nGeneration of AI-Driven\nRoles.`}
      subtitle="We build and certify professionals who deliver with capability, character, and conviction, AI-ready, trusted, and globally relevant."
      imageWidth={240}
      imageHeight={320}
    >
      {children}
    </AuthShell>
  )
}
