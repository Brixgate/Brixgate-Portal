import { Download, Video, BookOpen } from 'lucide-react'

interface ActivityItem {
  id: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  title: string
  meta: string
  time: string
}

const RECENT_ACTIVITIES: ActivityItem[] = [
  {
    id: '1',
    icon: Download,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    title: 'Downloaded "Week 3 — Prompt Engineering Slides"',
    meta: 'AI in Software Engineering',
    time: 'Today, 2:14 PM',
  },
  {
    id: '2',
    icon: Video,
    iconBg: '#CCFBF1',
    iconColor: '#0D9488',
    title: 'Attended Session 04 — Advanced Prompting Techniques',
    meta: 'AI in Software Engineering',
    time: 'Thu 10 Apr 2026',
  },
  {
    id: '3',
    icon: Download,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    title: 'Downloaded "Week 2 — LLM Architecture Notes"',
    meta: 'AI in Software Engineering',
    time: 'Wed 9 Apr 2026',
  },
  {
    id: '4',
    icon: BookOpen,
    iconBg: '#ECD9FF',
    iconColor: '#7C3AED',
    title: 'Enrolled in AI in Cyber Security & Intelligence',
    meta: 'Cohort 1.1',
    time: 'Mon 7 Apr 2026',
  },
]

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <h3 className="text-[15px] font-semibold text-[#111827] font-[var(--font-dm-sans)]">
          Recent Activity
        </h3>
      </div>
      <div className="h-px bg-[#F3F4F6]" />

      {/* Activity feed */}
      <div className="p-4 space-y-1">
        {RECENT_ACTIVITIES.map((activity) => (
          <div key={activity.id} className="flex items-start gap-3 px-2 py-2.5 rounded-[8px] hover:bg-[#F9FAFB] transition-colors">
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: activity.iconBg }}
            >
              <activity.icon
                className="w-[15px] h-[15px]"
                style={{ color: activity.iconColor }}
                strokeWidth={2}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#111827] leading-snug">{activity.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-[#9CA3AF]">{activity.meta}</span>
                <span className="text-[12px] text-[#D1D5DB]">·</span>
                <span className="text-[12px] text-[#9CA3AF]">{activity.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
