'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  File01Icon,
  Video01Icon,
  CheckmarkCircle01Icon,
  Notification01Icon,
  Award01Icon,
  Loading01Icon,
  Megaphone01Icon,
  InformationCircleIcon,
  CreditCardIcon,
  UserGroupIcon,
  Certificate01Icon,
  MailAtSign01Icon,
  Settings01Icon,
  Invoice01Icon,
  CheckmarkBadge01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'
import { cn } from '@/lib/utils'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiNotification {
  id: number | string
  title?: string
  message?: string
  type?: string
  is_read?: boolean; isRead?: boolean
  created_at?: string; createdAt?: string
  reference_type?: string; referenceType?: string
  reference_id?: number; referenceId?: number
}

interface ApiAnnouncement {
  id: number | string
  title?: string
  content?: string
  visibility?: string
  status?: string
  created_at?: string; createdAt?: string
  program_id?: number; programId?: number
  cohort_id?: number; cohortId?: number
}

// ── Normalised types ──────────────────────────────────────────────────────────
interface Notif {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface Announcement {
  id: string
  title: string
  content: string
  createdAt: string
}

function mapNotification(n: ApiNotification): Notif {
  return {
    id:        String(n.id),
    title:     n.title ?? 'Notification',
    message:   n.message ?? '',
    type:      (n.type ?? 'SYSTEM').toLowerCase(),
    isRead:    n.is_read ?? n.isRead ?? false,
    createdAt: n.created_at ?? n.createdAt ?? new Date().toISOString(),
  }
}

function mapAnnouncement(a: ApiAnnouncement): Announcement {
  return {
    id:        String(a.id),
    title:     a.title ?? 'Announcement',
    content:   a.content ?? '',
    createdAt: a.created_at ?? a.createdAt ?? new Date().toISOString(),
  }
}

// ── Notification type → icon/colour map ───────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; bg: string; color: string }> = {
  payment:      { icon: CreditCardIcon,          bg: '#fffbeb', color: '#d97706' },
  course:       { icon: File01Icon,              bg: '#fef2f2', color: '#d51520' },
  cohort:       { icon: UserGroupIcon,           bg: '#eff6ff', color: '#3b82f6' },
  assignment:   { icon: Invoice01Icon,           bg: '#f5f3ff', color: '#7c3aed' },
  certificate:  { icon: Certificate01Icon,       bg: '#ecfdf3', color: '#16a34a' },
  invite:       { icon: MailAtSign01Icon,        bg: '#fff7ed', color: '#ea580c' },
  system:       { icon: Settings01Icon,          bg: '#f9fafb', color: '#6b7280' },
  announcement: { icon: Notification01Icon,      bg: '#f5f3ff', color: '#7c3aed' },
  quiz:         { icon: CheckmarkBadge01Icon,    bg: '#ecfdf3', color: '#059669' },
  schedule:     { icon: Video01Icon,             bg: '#eff6ff', color: '#3b82f6' },
  enrollment:   { icon: CheckmarkCircle01Icon,   bg: '#ecfdf3', color: '#16a34a' },
  award:        { icon: Award01Icon,             bg: '#fffbeb', color: '#d97706' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function shortDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1)  return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24)  return `${diffHrs}h ago`
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' })
}

function extractList<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    for (const key of keys) {
      const val = (data as Record<string, unknown>)[key]
      if (Array.isArray(val)) return val as T[]
    }
    // unwrap one more level (e.g. { data: { notifications: [] } })
    const inner = (data as Record<string, unknown>).data
    if (inner && typeof inner === 'object') {
      for (const key of keys) {
        const val = (inner as Record<string, unknown>)[key]
        if (Array.isArray(val)) return val as T[]
      }
      if (Array.isArray(inner)) return inner as T[]
    }
  }
  return []
}

// ── Sub-components ────────────────────────────────────────────────────────────
function NotifRow({
  n,
  onMarkRead,
}: {
  n: Notif
  onMarkRead: (id: string) => void
}) {
  const config = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system
  const Icon = config.icon
  return (
    <div
      className={cn(
        'flex items-start gap-3 py-3 border-b border-[#f7f8fa] last:border-0 cursor-pointer rounded-[6px] px-1 -mx-1 transition-colors',
        !n.isRead ? 'hover:bg-[#fef9f9]' : 'hover:bg-[#f9fafb]',
      )}
      onClick={() => { if (!n.isRead) onMarkRead(n.id) }}
    >
      <div
        className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: config.bg }}
      >
        <Icon size={14} color={config.color} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <p className={cn(
            'text-[13px] font-display leading-snug flex-1',
            n.isRead ? 'font-medium text-[#374151]' : 'font-semibold text-[#111827]',
          )}>
            {n.title}
          </p>
          {!n.isRead && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#d51520] flex-shrink-0 mt-1.5" />
          )}
        </div>
        {n.message && (
          <p className="text-[12px] text-[#4b5563] font-body mt-0.5 line-clamp-2 leading-[1.5]">
            {n.message}
          </p>
        )}
        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">{shortDate(n.createdAt)}</p>
      </div>
    </div>
  )
}

function AnnouncementRow({ a }: { a: Announcement }) {
  return (
    <div className="py-3 border-b border-[#f7f8fa] last:border-0">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#fef3f2]">
          <Megaphone01Icon size={13} color="#d51520" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#111827] font-display leading-snug">
            {a.title}
          </p>
          {a.content && (
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5 line-clamp-2 leading-[1.5]">
              {a.content}
            </p>
          )}
          <p className="text-[11px] text-[#9ca3af] font-body mt-1">{shortDate(a.createdAt)}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
      <div className="w-10 h-10 rounded-[10px] bg-[#f9fafb] flex items-center justify-center mb-1">
        <InformationCircleIcon size={20} color="#d1d5db" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] font-semibold text-[#374151] font-display">Nothing here yet</p>
      <p className="text-[12px] text-[#9ca3af] font-body max-w-[180px]">{label}</p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NotificationsPanel() {
  const [activeTab, setActiveTab] = useState<'Announcements' | 'Notifications'>('Announcements')

  const [notifications,   setNotifications]   = useState<Notif[]>([])
  const [announcements,   setAnnouncements]   = useState<Announcement[]>([])
  const [loadingNotifs,   setLoadingNotifs]   = useState(true)
  const [loadingAnnounce, setLoadingAnnounce] = useState(true)
  const [markingAll,      setMarkingAll]      = useState(false)

  // Fetch notifications
  useEffect(() => {
    apiClient.get('/users/me/notifications?size=30')
      .then(res => {
        const data = unwrap<unknown>(res.data)
        const list = extractList<ApiNotification>(data, ['notifications', 'items', 'content'])
        setNotifications(
          list
            .map(mapNotification)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        )
      })
      .catch(() => setNotifications([]))
      .finally(() => setLoadingNotifs(false))
  }, [])

  // Fetch announcements
  useEffect(() => {
    apiClient.get('/users/me/announcements?size=20')
      .then(res => {
        const data = unwrap<unknown>(res.data)
        const list = extractList<ApiAnnouncement>(data, ['announcements', 'items', 'content'])
        setAnnouncements(
          list
            .filter(a => (a.status ?? 'PUBLISHED').toUpperCase() === 'PUBLISHED')
            .map(mapAnnouncement)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 15)
        )
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoadingAnnounce(false))
  }, [])

  // Mark one notification as read
  const markRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
    apiClient.patch(`/users/me/notifications/${id}/read`).catch(() => {
      // revert optimistic update on failure
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: false } : n)
      )
    })
  }, [])

  // Mark all as read
  const markAllRead = useCallback(async () => {
    if (markingAll) return
    setMarkingAll(true)
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try {
      await apiClient.patch('/users/me/notifications/read-all')
    } catch {
      // revert on failure
      setNotifications(prev => prev.map(n => ({ ...n, isRead: false })))
    } finally {
      setMarkingAll(false)
    }
  }, [markingAll])

  const unreadCount = notifications.filter(n => !n.isRead).length
  const TABS = ['Announcements', 'Notifications'] as const

  return (
    <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between">
          <p className="text-[16px] font-semibold text-[#111827] font-display leading-none">Updates</p>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold text-white bg-[#d51520] w-5 h-5 rounded-full flex items-center justify-center font-display">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex border-b border-[#e5e7eb] px-5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex flex-col items-center pb-0 mr-5 last:mr-0"
          >
            <span className={cn(
              'pb-2.5 text-[13px] font-display transition-colors',
              activeTab === tab
                ? 'font-semibold text-[#d51715]'
                : 'font-normal text-[#4b5563] hover:text-[#374151]',
            )}>
              {tab}
              {tab === 'Notifications' && unreadCount > 0 && (
                <span className="ml-1.5 text-[9px] font-bold text-white bg-[#d51520] px-1 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </span>
            <div className={cn(
              'h-[2px] w-full rounded-t-full transition-colors',
              activeTab === tab ? 'bg-[#d51715]' : 'bg-transparent',
            )} />
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-1" style={{ maxHeight: 480 }}>

        {/* Announcements tab */}
        {activeTab === 'Announcements' && (
          loadingAnnounce ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[#4b5563]">
              <Loading01Icon size={14} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[12px] font-body">Loading…</span>
            </div>
          ) : announcements.length === 0 ? (
            <EmptyState label="Announcements from your instructors will show up here." />
          ) : (
            <div>{announcements.map(a => <AnnouncementRow key={a.id} a={a} />)}</div>
          )
        )}

        {/* Notifications tab */}
        {activeTab === 'Notifications' && (
          loadingNotifs ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[#4b5563]">
              <Loading01Icon size={14} className="animate-spin" strokeWidth={1.5} />
              <span className="text-[12px] font-body">Loading…</span>
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState label="You'll be notified about sessions, grades, and resources here." />
          ) : (
            <>
              {unreadCount > 0 && (
                <div className="flex justify-end pt-2 pb-1">
                  <button
                    onClick={markAllRead}
                    disabled={markingAll}
                    className="text-[11px] text-[#d51520] font-medium font-display hover:underline disabled:opacity-50"
                  >
                    {markingAll ? 'Marking…' : 'Mark all as read'}
                  </button>
                </div>
              )}
              <div>
                {notifications.map(n => (
                  <NotifRow key={n.id} n={n} onMarkRead={markRead} />
                ))}
              </div>
            </>
          )
        )}

      </div>
    </div>
  )
}
