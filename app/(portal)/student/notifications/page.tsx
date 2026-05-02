'use client'

import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import {
  Notification01Icon,
  File01Icon,
  UserGroupIcon,
  Award01Icon,
  Megaphone01Icon,
  CheckmarkCircle01Icon,
  Loading01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { apiClient, unwrap } from '@/lib/api-client'

// ── API shape ────────────────────────────────────────────────────────────────
interface ApiNotification {
  id: number | string
  title?: string
  body?: string
  message?: string
  type?: string
  is_read?: boolean
  isRead?: boolean
  created_at?: string
  createdAt?: string
}

interface Notif {
  id: string
  title: string
  body: string
  type: string
  isRead: boolean
  createdAt: string
}

function mapNotif(n: ApiNotification): Notif {
  return {
    id: String(n.id),
    title: n.title ?? n.message ?? 'Notification',
    body: n.body ?? n.message ?? '',
    type: n.type ?? 'announcement',
    isRead: n.is_read ?? n.isRead ?? false,
    createdAt: n.created_at ?? n.createdAt ?? new Date().toISOString(),
  }
}

// ── Type config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  resource:     { icon: File01Icon,            bg: '#FEF2F2', color: '#D51520' },
  session:      { icon: UserGroupIcon,         bg: '#F0F9FF', color: '#0EA5E9' },
  enrollment:   { icon: CheckmarkCircle01Icon, bg: '#ECFDF3', color: '#16A34A' },
  certificate:  { icon: Award01Icon,           bg: '#FFFBEB', color: '#D97706' },
  announcement: { icon: Megaphone01Icon,       bg: '#F5F3FF', color: '#7C3AED' },
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Lagos',
  }) + ' WAT'
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notif
  onMarkRead: (id: string) => void
}) {
  const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.announcement
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-4 px-6 py-5 border-b border-[#f3f4f6] last:border-b-0 transition-colors',
        !notification.isRead ? 'bg-[#fefefe]' : 'bg-white'
      )}
    >
      <div
        className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: config.bg }}
      >
        <Icon size={18} color={config.color} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p
                className={cn(
                  'text-[14px] font-display leading-snug',
                  notification.isRead ? 'font-medium text-[#374151]' : 'font-semibold text-[#111827]'
                )}
              >
                {notification.title}
              </p>
              {!notification.isRead && (
                <span className="w-2 h-2 rounded-full bg-[#d51520] flex-shrink-0" />
              )}
            </div>
            {notification.body && (
              <p className="text-[13px] text-[#6b7280] font-body leading-relaxed">
                {notification.body}
              </p>
            )}
            <p className="text-[11px] text-[#9ca3af] font-body mt-1.5">
              {formatDate(notification.createdAt)}
            </p>
          </div>

          {!notification.isRead && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="text-[12px] text-[#d51520] font-medium font-display flex-shrink-0 hover:underline mt-0.5"
            >
              Mark read
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get('/users/me/notifications')
      .then((res) => {
        const data = unwrap<ApiNotification[]>(res.data)
        const mapped = (Array.isArray(data) ? data : [])
          .map(mapNotif)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setNotifications(mapped)
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  function markRead(id: string) {
    // Optimistic update — fire-and-forget API call
    apiClient.patch(`/notifications/${id}/read`).catch(() => {})
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
  }

  function markAllRead() {
    apiClient.post('/notifications/mark-all-read').catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <>
      <TopNav title="Notifications" />

      <div className="px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
              Notifications
            </h1>
            <p className="text-[14px] text-[#6b7280] font-body mt-1">
              {loading
                ? 'Loading…'
                : unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>

          {!loading && unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[13px] font-medium font-display text-[#d51520] hover:underline"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] flex items-center justify-center py-16 gap-2 text-[#9ca3af]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[14px] font-body">Loading notifications…</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={Notification01Icon}
              title="No notifications"
              description="You're all caught up. Notifications about sessions, resources, and announcements will appear here."
            />
          </div>
        ) : (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
            {/* Unread section */}
            {unreadCount > 0 && (
              <>
                <div className="px-6 py-3 bg-[#f9fafb] border-b border-[#f3f4f6]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">
                    Unread
                  </p>
                </div>
                {notifications
                  .filter((n) => !n.isRead)
                  .map((n) => (
                    <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
                  ))}
              </>
            )}

            {/* Read section */}
            {notifications.some((n) => n.isRead) && (
              <>
                <div className="px-6 py-3 bg-[#f9fafb] border-b border-[#f3f4f6] border-t border-t-[#f3f4f6]">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">
                    Earlier
                  </p>
                </div>
                {notifications
                  .filter((n) => n.isRead)
                  .map((n) => (
                    <NotificationRow key={n.id} notification={n} onMarkRead={markRead} />
                  ))}
              </>
            )}
          </div>
        )}
      </div>
    </>
  )
}
