import AdminPortalShell from '@/components/layout/AdminPortalShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminPortalShell>{children}</AdminPortalShell>
}
