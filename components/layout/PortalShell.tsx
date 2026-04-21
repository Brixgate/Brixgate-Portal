'use client'

import { SidebarProvider } from '@/lib/sidebar-context'
import Sidebar from './Sidebar'
import NavigationProgress from './NavigationProgress'

export default function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <NavigationProgress />
      <div className="flex h-screen bg-[#F7F8FA] overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
