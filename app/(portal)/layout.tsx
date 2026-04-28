import { AuthProvider } from '@/lib/auth-context'
import PortalShell from '@/components/layout/PortalShell'

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  )
}
