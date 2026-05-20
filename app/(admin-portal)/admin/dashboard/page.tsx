'use client'

import { useState, useEffect } from 'react'
import {
  UserGroup02Icon, BookOpen01Icon, File01Icon, Invoice01Icon,
  Loading01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Pagination { totalElements: number }
interface PaginatedResponse { pagination: Pagination }

interface DashboardMetrics {
  users: number
  programs: number
  enrollments: number
  payments: number
  expertPending: number
  orgPending: number
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accentColor, accentBg, loading,
}: {
  label: string; value: string | number; sub: string
  icon: React.ElementType; accentColor: string; accentBg: string; loading: boolean
}) {
  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display">
          {label}
        </p>
        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
          style={{ background: accentBg }}>
          <Icon size={18} style={{ color: accentColor }} strokeWidth={1.5} />
        </div>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-16 bg-[#f3f4f6] rounded-[6px] animate-pulse" />
      ) : (
        <p className="mt-3 text-[30px] font-bold leading-none text-[#101828] font-display">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
      )}
      <p className="mt-1 text-[12px] text-[#98a2b3] font-body">{sub}</p>
    </div>
  )
}

// ── Placeholder chart data (real analytics endpoint not available) ─────────────
const enrollmentTrend = [
  { month: 'Jan', enrollments: 12 }, { month: 'Feb', enrollments: 19 },
  { month: 'Mar', enrollments: 27 }, { month: 'Apr', enrollments: 23 },
  { month: 'May', enrollments: 34 }, { month: 'Jun', enrollments: 41 },
]
const revenueTrend = [
  { month: 'Jan', revenue: 3000000 }, { month: 'Feb', revenue: 4750000 },
  { month: 'Mar', revenue: 6750000 }, { month: 'Apr', revenue: 5750000 },
  { month: 'May', revenue: 8500000 }, { month: 'Jun', revenue: 10250000 },
]

function formatRevenue(v: number) {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`
  return `₦${v}`
}

// ── Pipeline card ─────────────────────────────────────────────────────────────
function PipelineCard({
  label, count, loading, color,
}: { label: string; count: number; loading: boolean; color: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[#f3f4f6] last:border-0">
      <span className="text-[13px] text-[#374151] font-body">{label}</span>
      {loading
        ? <div className="h-5 w-8 bg-[#f3f4f6] rounded animate-pulse" />
        : (
          <span className="text-[13px] font-bold font-display px-2.5 py-0.5 rounded-full"
            style={{ background: color === 'red' ? '#fef2f2' : '#ecfdf3', color: color === 'red' ? '#d51520' : '#027a48' }}>
            {count}
          </span>
        )
      }
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    users: 0, programs: 0, enrollments: 0, payments: 0, expertPending: 0, orgPending: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, programsRes, enrollmentsRes, paymentsRes, expertRes, orgRes] =
          await Promise.allSettled([
            apiClient.get('/admin/users?page=1&size=1'),
            apiClient.get('/admin/programs?page=1&size=1'),
            apiClient.get('/admin/cohort-enrollments?page=1&size=1'),
            apiClient.get('/admin/payments?page=1&size=1'),
            apiClient.get('/admin/expert-applications?page=1&size=1&status=SUBMITTED'),
            apiClient.get('/admin/organization-requests?page=1&size=1&status=SUBMITTED'),
          ])

        const read = (res: PromiseSettledResult<{ data: unknown }>) => {
          if (res.status === 'rejected') return 0
          const d = unwrap<PaginatedResponse>(res.value.data)
          return d?.pagination?.totalElements ?? 0
        }

        setMetrics({
          users:         read(usersRes),
          programs:      read(programsRes),
          enrollments:   read(enrollmentsRes),
          payments:      read(paymentsRes),
          expertPending: read(expertRes),
          orgPending:    read(orgRes),
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-[24px] font-bold text-[#111827] font-display leading-[32px]">
          Dashboard
        </h1>
        <p className="text-[14px] text-[#6b7280] font-body mt-0.5">
          Overview of Brixgate operations
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Users"       value={metrics.users}       sub="all roles"            icon={UserGroup02Icon}  accentColor="#7c3aed" accentBg="#f5f3ff" loading={loading} />
        <StatCard label="Programmes"        value={metrics.programs}    sub="in the bank"          icon={BookOpen01Icon}   accentColor="#ea580c" accentBg="#fff7ed" loading={loading} />
        <StatCard label="Enrollments"       value={metrics.enrollments} sub="across all cohorts"   icon={File01Icon}       accentColor="#0d9488" accentBg="#f0fdfa" loading={loading} />
        <StatCard label="Payments"          value={metrics.payments}    sub="total transactions"   icon={Invoice01Icon}    accentColor="#d97706" accentBg="#fffbeb" loading={loading} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[3fr_2fr] gap-6 mb-8">
        {/* Enrollment trend */}
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#f3f4f6]">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827] font-display">Enrollment Trend</h3>
              <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">New enrollments per month</p>
            </div>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={enrollmentTrend}>
                <defs>
                  <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d51520" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#d51520" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #f3f4f6', borderRadius: 8, fontSize: 12 }}
                  cursor={{ stroke: '#d51520', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="enrollments" stroke="#d51520" strokeWidth={2}
                  fill="url(#eGrad)" dot={false} activeDot={{ r: 4, fill: '#d51520' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue trend */}
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
          <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#f3f4f6]">
            <div>
              <h3 className="text-[15px] font-semibold text-[#111827] font-display">Revenue</h3>
              <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">Monthly revenue (NGN)</p>
            </div>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueTrend} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatRevenue} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: unknown) => [formatRevenue(v as number), 'Revenue']}
                  contentStyle={{ border: '1px solid #f3f4f6', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="revenue" fill="#d51520" radius={[4, 4, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pipeline */}
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
          <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
            <h3 className="text-[15px] font-semibold text-[#111827] font-display">Pipeline — Pending Review</h3>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">Items awaiting action</p>
          </div>
          <div className="px-6 py-4">
            <PipelineCard label="Expert Applications" count={metrics.expertPending} loading={loading} color="red" />
            <PipelineCard label="Organisation Requests" count={metrics.orgPending} loading={loading} color="red" />
          </div>
          <div className="px-6 pb-5">
            <a href="/admin/expert-applications"
              className="text-[12px] text-[#d51520] font-medium font-display hover:underline mr-4">
              View applications →
            </a>
            <a href="/admin/organization-requests"
              className="text-[12px] text-[#d51520] font-medium font-display hover:underline">
              View requests →
            </a>
          </div>
        </div>

        {/* Quick links */}
        <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
          <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
            <h3 className="text-[15px] font-semibold text-[#111827] font-display">Quick Actions</h3>
            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">Common admin tasks</p>
          </div>
          <div className="px-6 py-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Create User',       href: '/admin/users?create=1'    },
              { label: 'New Programme',     href: '/admin/programs?create=1' },
              { label: 'New Cohort',        href: '/admin/cohorts?create=1'  },
              { label: 'New Coupon',        href: '/admin/coupons?create=1'  },
            ].map((a) => (
              <a key={a.href} href={a.href}
                className="flex items-center justify-center h-10 rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium font-display text-[#374151] hover:bg-[#f9fafb] transition-colors">
                {a.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-full px-4 py-2 shadow-md text-[12px] text-[#6b7280] font-body">
          <Loading01Icon size={13} className="animate-spin text-[#d51520]" strokeWidth={2} />
          Loading metrics…
        </div>
      )}
    </div>
  )
}
