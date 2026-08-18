'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SidebarProvider } from '@/lib/sidebar-context'
import { useAuth } from '@/lib/auth-context'
import { useSessionTimeout } from '@/lib/use-session-timeout'
import Sidebar from './Sidebar'
import NavigationProgress from './NavigationProgress'

function PortalShellInner({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth()
  const router     = useRouter()

  const handleTimeout = useCallback(async () => {
    await logout()
    router.replace('/login?reason=session_expired')
  }, [logout, router])

  useSessionTimeout(handleTimeout)

  return (
    <SidebarProvider>
      <NavigationProgress />
      <div className="flex h-screen bg-[#F7F8FA] overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1440px] mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default function PortalShell({ children }: { children: React.ReactNode }) {
  return <PortalShellInner>{children}</PortalShellInner>
}
