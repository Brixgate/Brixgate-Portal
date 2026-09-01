'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Notification01Icon,
  Invoice01Icon,
  BookOpen01Icon,
  UserGroup02Icon,
  Award01Icon,
  UserAdd01Icon,
  Settings01Icon,
  Calendar01Icon,
  ClipboardIcon,
  MessageQuestionIcon,
  Megaphone01Icon,
  Tick01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { Notification } from '@/components/layout/NotificationBell'
import TopNav from '@/components/layout/TopNav'

type FilterType = 'ALL' | 'UNREAD' | Notification['type']

const TYPE_FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All',          value: 'ALL'          },
  { label: 'Unread',       value: 'UNREAD'       },
  { label: 'Schedule',     value: 'SCHEDULE'     },
  { label: 'Assignment',   value: 'ASSIGNMENT'   },
  { label: 'Certificate',  value: 'CERTIFICATE'  },
  { label: 'Announcement', value: 'ANNOUNCEMENT' },
  { label: 'Payment',      value: 'PAYMENT'      },
  { label: 'Course',       value: 'COURSE'       },
  { label: 'System',       value: 'SYSTEM'       },
]

function typeConfig(type: Notification['type']) {
  switch (type) {
    case 'PAYMENT':      return { Icon: Invoice01Icon,       bg: '#FFFBEB', color: '#D97706', label: 'Payment'      }
    case 'COURSE':       return { Icon: BookOpen01Icon,      bg: '#F0F9FF', color: '#0EA5E9', label: 'Course'       }
    case 'COHORT':       return { Icon: UserGroup02Icon,     bg: '#F5F3FF', color: '#7C3AED', label: 'Cohort'       }
    case 'ASSIGNMENT':   return { Icon: ClipboardIcon,       bg: '#FFF7ED', color: '#EA580C', label: 'Assignment'   }
    case 'CERTIFICATE':  return { Icon: Award01Icon,         bg: '#F0FDFA', color: '#0D9488', label: 'Certificate'  }
    case 'INVITE':       return { Icon: UserAdd01Icon,       bg: '#F5F3FF', color: '#7C3AED', label: 'Invite'       }
    case 'ANNOUNCEMENT': return { Icon: Megaphone01Icon,       bg: '#FEF3F2', color: '#D92D20', label: 'Announcement' }
    case 'QUIZ':         return { Icon: MessageQuestionIcon, bg: '#F0F9FF', color: '#0EA5E9', label: 'Quiz'         }
    case 'SCHEDULE':     return { Icon: Calendar01Icon,      bg: '#ECFDF3', color: '#12B76A', label: 'Schedule'     }
    default:             return { Icon: Settings01Icon,      bg: '#F9FAFB', color: '#4B5563', label: 'System'       }
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: days > 365 ? 'numeric' : undefined })
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<FilterType>('ALL')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)

  const PAGE_SIZE = 20

  const load = useCallback(async (p = 1, f: FilterType = filter) => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | boolean> = { page: p, size: PAGE_SIZE }
      if (f === 'UNREAD') {
        params.is_read = false
      } else if (f !== 'ALL') {
        params.type = f
      }
      const res = await apiClient.get('/users/me/notifications', { params })
      const data = unwrap<{ notifications: Notification[]; total?: number }>(res.data)
      setNotifications(data?.notifications ?? [])
      setTotal(data?.total ?? (data?.notifications?.length ?? 0))
      setPage(p)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load(1, filter)
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  async function markOneRead(id: number) {
    if (markingId === id) return
    setMarkingId(id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    try {
      await apiClient.patch(`/users/me/notifications/${id}/read`)
    } catch {
      load(page, filter)
    } finally {
      setMarkingId(null)
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await apiClient.patch('/users/me/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const totalPages  = Math.ceil(total / PAGE_SIZE)

  return (
    <>
      <TopNav title="Notifications" />

      <div className="p-6 lg:p-10 max-w-[800px]">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-[32px]">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-[14px] text-[#4b5563] font-body mt-0.5">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 h-9 rounded-[8px] border border-[#e5e7eb] bg-white text-[13px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] transition-colors disabled:opacity-50"
            >
              <Tick01Icon size={14} strokeWidth={2} />
              {markingAll ? 'Marking…' : 'Mark all as read'}
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {TYPE_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'h-8 px-4 rounded-full text-[13px] font-medium transition-colors',
                filter === value
                  ? 'bg-[#d51520] text-white'
                  : 'bg-white border border-[#e5e7eb] text-[#4b5563] hover:bg-[#f9fafb]'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div className="bg-white rounded-[10px] border border-[#e5e7eb] overflow-hidden">
          {loading ? (
            <div className="divide-y divide-[#f3f4f6]">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-6 py-4">
                  <div className="w-10 h-10 rounded-[8px] bg-[#f3f4f6] animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-[#f3f4f6] rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-[#f3f4f6] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-[12px] bg-[#fef2f2] flex items-center justify-center mb-1">
                <Notification01Icon size={22} color="#d51520" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#111827] font-display">Failed to load</p>
              <p className="text-[13px] text-[#4b5563] font-body">{error}</p>
              <button
                onClick={() => load(1, filter)}
                className="mt-3 px-4 h-9 rounded-[8px] bg-[#d51520] text-white text-[13px] font-medium"
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-2">
              <div className="w-14 h-14 rounded-[12px] bg-[#f9fafb] flex items-center justify-center mb-2">
                <Notification01Icon size={26} color="#9ca3af" strokeWidth={1.5} />
              </div>
              <p className="text-[15px] font-semibold text-[#374151] font-display">No notifications</p>
              <p className="text-[13px] text-[#4b5563] font-body text-center max-w-[280px]">
                {filter === 'UNREAD'
                  ? "You're all caught up — no unread notifications."
                  : filter !== 'ALL'
                  ? `No ${filter.toLowerCase()} notifications yet.`
                  : "You'll be notified here about your sessions, assignments, and more."}
              </p>
              {filter !== 'ALL' && (
                <button
                  onClick={() => setFilter('ALL')}
                  className="mt-3 px-4 h-9 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb]"
                >
                  View all
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#f3f4f6]">
              {notifications.map(n => {
                const { Icon, bg, color, label } = typeConfig(n.type)
                return (
                  <div
                    key={n.id}
                    className={cn(
                      'flex items-start gap-4 px-6 py-4 transition-colors',
                      n.is_read ? 'bg-white' : 'bg-[#fffbfb]',
                      !n.is_read && 'cursor-pointer hover:bg-[#fef9f9]',
                      n.is_read && 'cursor-default'
                    )}
                    onClick={() => { if (!n.is_read) markOneRead(n.id) }}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: bg }}>
                      <Icon size={18} color={color} strokeWidth={1.5} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn(
                              'text-[14px] leading-[20px] font-display',
                              n.is_read ? 'font-medium text-[#374151]' : 'font-semibold text-[#111827]'
                            )}>
                              {n.title}
                            </p>
                            <span className="text-[11px] px-2 py-0.5 rounded-full font-body"
                              style={{ background: bg, color }}>
                              {label}
                            </span>
                          </div>
                          <p className="text-[13px] text-[#4b5563] font-body leading-[18px] mt-1">
                            {n.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[12px] text-[#9ca3af] font-body whitespace-nowrap">
                            {formatDate(n.created_at)}
                          </span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#d51520] flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#f3f4f6] flex items-center justify-between">
              <p className="text-[13px] text-[#4b5563] font-body">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => load(page - 1, filter)}
                  disabled={page === 1}
                  className="px-3 h-8 rounded-[6px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => load(page + 1, filter)}
                  disabled={page >= totalPages}
                  className="px-3 h-8 rounded-[6px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
