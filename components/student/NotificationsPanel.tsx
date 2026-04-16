import { MOCK_NOTIFICATIONS } from '@/lib/mock-data'
import type { Notification } from '@/lib/types/index'
import {
  File01Icon,
  Video01Icon,
  CheckmarkCircle01Icon,
  Notification01Icon,
  Award01Icon,
} from 'hugeicons-react'
import Link from 'next/link'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  resource:     { icon: File01Icon,             bg: '#fef2f2', color: '#d51520' },
  session:      { icon: Video01Icon,            bg: '#eff6ff', color: '#3b82f6' },
  enrollment:   { icon: CheckmarkCircle01Icon,  bg: '#ecfdf3', color: '#16a34a' },
  certificate:  { icon: Award01Icon,            bg: '#fffbeb', color: '#d97706' },
  announcement: { icon: Notification01Icon,     bg: '#f5f3ff', color: '#7c3aed' },
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Africa/Lagos',
  }) + ' WAT'
}

function NotifRow({ n }: { n: Notification }) {
  const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.announcement
  const Icon = config.icon

  return (
    <div className="flex items-start gap-3 py-2.5 group">
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: config.bg }}
      >
        <Icon size={14} color={config.color} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <p
            className={`text-[13px] font-display leading-snug flex-1 truncate ${
              n.isRead ? 'font-medium text-[#374151]' : 'font-semibold text-[#111827]'
            }`}
          >
            {n.title}
          </p>
          {!n.isRead && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#d51520] flex-shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5 leading-none">
          {formatShortDate(n.createdAt)}
        </p>
      </div>
    </div>
  )
}

export default function NotificationsPanel() {
  const notifications = MOCK_NOTIFICATIONS.slice(0, 4)
  const unread = notifications.filter((n) => !n.isRead).length

  return (
    <div className="bg-white rounded-[10px] p-5 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[16px] font-semibold text-[#111827] font-display leading-none">
          Notifications
        </p>
        {unread > 0 && (
          <span className="text-[10px] font-bold text-white bg-[#d51520] w-5 h-5 rounded-full flex items-center justify-center font-display">
            {unread}
          </span>
        )}
      </div>

      <div className="divide-y divide-[#f7f8fa]">
        {notifications.map((n) => (
          <NotifRow key={n.id} n={n} />
        ))}
        {notifications.length === 0 && (
          <p className="text-[12px] text-[#9ca3af] font-body text-center py-6">
            No notifications yet.
          </p>
        )}
      </div>

      <Link
        href="/student/notifications"
        className="block text-center text-[12px] font-medium text-[#d51520] font-display mt-3 hover:underline"
      >
        View all
      </Link>
    </div>
  )
}
