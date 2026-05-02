'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Notification01Icon, Delete02Icon } from 'hugeicons-react'
import { cn } from '@/lib/utils'
import { apiClient, unwrap } from '@/lib/api-client'

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

const TYPE_COLORS: Record<string, string> = {
  resource:     '#2563eb',
  session:      '#0d9488',
  certificate:  '#d97706',
  announcement: '#922bf7',
  enrollment:   '#d51520',
}

const TYPE_BG: Record<string, string> = {
  resource:     '#dbeafe',
  session:      '#ccfbf1',
  certificate:  '#fff6de',
  announcement: '#ecd9ff',
  enrollment:   '#fef2f2',
}

export default function NotificationDropdown() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notif[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Fetch on first open
  useEffect(() => {
    if (!open || fetched) return
    setLoading(true)
    apiClient.get('/users/me/notifications')
      .then((res) => {
        const data = unwrap<ApiNotification[]>(res.data)
        const mapped = (Array.isArray(data) ? data : [])
          .map(mapNotif)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
        setNotifications(mapped)
        setFetched(true)
      })
      .catch(() => { setNotifications([]); setFetched(true) })
      .finally(() => setLoading(false))
  }, [open, fetched])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function markAllRead() {
    apiClient.post('/notifications/mark-all-read').catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  function dismissOne(id: string) {
    apiClient.patch(`/notifications/${id}/read`).catch(() => {})
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative w-[44px] h-[44px] flex items-center justify-center rounded-full border transition-colors',
          open
            ? 'bg-[#fef2f2] border-[#fecaca] text-[#d51520]'
            : 'bg-[#f9fafb] border-[#e5e7eb] text-[#374151] hover:bg-[#f3f4f6]'
        )}
        aria-label="Notifications"
      >
        <Notification01Icon size={20} color="currentColor" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute top-[9px] right-[9px] w-2 h-2 rounded-full bg-[#d51520] ring-[1.5px] ring-white" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="fixed lg:absolute left-4 right-4 top-[72px] lg:left-auto lg:right-0 lg:top-[calc(100%+8px)] lg:w-[380px] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.14)] border border-[#f3f4f6] z-50 overflow-hidden"
          style={{ animation: 'fadeInDown 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#f3f4f6]">
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-bold text-[#111827] font-display">Notifications</p>
              {unreadCount > 0 && (
                <span className="text-[12px] font-semibold text-[#d51520] bg-[#fef2f2] border border-[#fecaca] rounded-full px-2.5 py-0.5 font-display">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[13px] text-[#d51520] font-semibold font-display hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-14 gap-2 text-[#9ca3af]">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#9ca3af" strokeWidth="4" />
                  <path className="opacity-75" fill="#9ca3af" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-[13px] font-body">Loading…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-[10px] bg-[#f7f8fa] flex items-center justify-center mb-3">
                  <Notification01Icon size={22} color="#9ca3af" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">
                  You&apos;re all caught up
                </p>
                <p className="text-[13px] text-[#9ca3af] font-body">No notifications right now.</p>
              </div>
            ) : (
              notifications.map((n, i) => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-5 py-3.5 group transition-colors hover:bg-[#f9fafb]',
                    !n.isRead && 'bg-[#fefefe]',
                    i < notifications.length - 1 && 'border-b border-[#f3f4f6]'
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: TYPE_BG[n.type] ?? '#f7f8fa' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: TYPE_COLORS[n.type] ?? '#9ca3af' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[14px] leading-snug text-[#111827] font-display',
                      !n.isRead ? 'font-bold' : 'font-semibold'
                    )}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[13px] text-[#6b7280] font-body mt-1 line-clamp-2 leading-snug">
                        {n.body}
                      </p>
                    )}
                    <p className="text-[12px] text-[#9ca3af] font-body mt-1.5 font-medium">
                      {new Date(n.createdAt).toLocaleDateString('en-NG', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <button
                    onClick={() => dismissOne(n.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#d1d5db] hover:text-[#9ca3af] transition-all flex-shrink-0 mt-0.5"
                    aria-label="Dismiss"
                  >
                    <Delete02Icon size={15} color="currentColor" strokeWidth={1.5} />
                  </button>

                  {!n.isRead && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[#d51520] flex-shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {!loading && notifications.length > 0 && (
            <div className="px-5 py-3 border-t border-[#f3f4f6] text-center">
              <button
                onClick={() => { setOpen(false); router.push('/student/notifications') }}
                className="text-[13px] text-[#d51520] font-medium font-display hover:underline"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
