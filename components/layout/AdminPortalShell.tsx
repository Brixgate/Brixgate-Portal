'use client'

import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminPortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F7F8FA] overflow-x-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}
