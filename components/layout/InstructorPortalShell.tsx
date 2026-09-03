'use client'

import { SidebarProvider } from '@/lib/sidebar-context'
import InstructorSidebar from '@/components/instructor/InstructorSidebar'
import InstructorTopNav from '@/components/instructor/InstructorTopNav'
import NavigationProgress from './NavigationProgress'

export default function InstructorPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <NavigationProgress />
      <div className="flex h-screen bg-[#F7F8FA] overflow-x-hidden">
        <InstructorSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <InstructorTopNav />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
