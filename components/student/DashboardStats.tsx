import { BookOpen01Icon, Clock01Icon, FireIcon, ArrowUpRight01Icon } from 'hugeicons-react'
import { MOCK_DASHBOARD_STATS, MOCK_SESSIONS } from '@/lib/mock-data'

interface StatCardProps {
  label: string
  value: string | number
  sub: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  trend?: string
  trendColor?: string
  trendBg?: string
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendColor = '#16a34a',
  trendBg = '#ecfdf3',
}: StatCardProps) {
  return (
    <div className="bg-white rounded-[12px] border border-[#f0f0f2] shadow-[0px_1px_2px_rgba(16,24,40,0.05)] p-4 xl:p-5 flex flex-col gap-3 xl:gap-4 hover:shadow-[0px_4px_12px_rgba(16,24,40,0.08)] transition-shadow duration-200">
      {/* Icon + trend row */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={22} color={iconColor} strokeWidth={1.5} />
        </div>
        {trend && (
          <div
            className="flex items-center gap-0.5 text-[10px] xl:text-[11px] font-semibold px-1.5 xl:px-2 py-0.5 xl:py-1 rounded-full font-display whitespace-nowrap"
            style={{ color: trendColor, background: trendBg }}
          >
            <ArrowUpRight01Icon size={10} color={trendColor} strokeWidth={2.5} />
            {trend}
          </div>
        )}
      </div>

      {/* Metric */}
      <div>
        <p className="text-[32px] xl:text-[42px] font-bold text-[#111827] font-display leading-none tracking-tight">
          {value}
        </p>
      </div>

      {/* Labels */}
      <div className="flex flex-col gap-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#9ca3af] font-display leading-tight">
          {label}
        </p>
        <p className="text-[11px] text-[#6b7280] font-body leading-snug">{sub}</p>
      </div>
    </div>
  )
}

export default function DashboardStats() {
  const completedSessions = MOCK_SESSIONS.filter((s) => s.status === 'completed').length
  const totalHours = completedSessions * 2

  return (
    <div className="grid grid-cols-3 gap-4 min-w-0">
      <StatCard
        label="Enrolled"
        value={MOCK_DASHBOARD_STATS.programsEnrolled}
        sub="Active courses"
        icon={BookOpen01Icon}
        iconBg="#f0ebff"
        iconColor="#7c3aed"
        trend="+1 this month"
        trendColor="#7c3aed"
        trendBg="#f5f3ff"
      />
      <StatCard
        label="Hours"
        value={totalHours}
        sub="From live sessions"
        icon={Clock01Icon}
        iconBg="#fffbeb"
        iconColor="#d97706"
        trend="+4 this week"
        trendColor="#d97706"
        trendBg="#fffbeb"
      />
      <StatCard
        label="Streak"
        value="12"
        sub="Keep the momentum"
        icon={FireIcon}
        iconBg="#fef2f2"
        iconColor="#d51520"
        trend="Personal best"
        trendColor="#d51520"
        trendBg="#fef2f2"
      />
    </div>
  )
}
