'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
} from 'hugeicons-react'
import { apiClient, unwrap } from '@/lib/api-client'
import { cn } from '@/lib/utils'

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  type: 'PAYMENT' | 'COURSE' | 'COHORT' | 'ASSIGNMENT' | 'CERTIFICATE' | 'INVITE' | 'SYSTEM' | 'ANNOUNCEMENT' | 'QUIZ' | 'SCHEDULE'
  reference_type: string | null
  reference_id: number | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

interface NotificationListResponse {
  notifications: Notification[]
  total?: number
  unread_count?: number
}

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'PAYMENT':      return { Icon: Invoice01Icon,      bg: '#FFFBEB', color: '#D97706' }
    case 'COURSE':       return { Icon: BookOpen01Icon,     bg: '#F0F9FF', color: '#0EA5E9' }
    case 'COHORT':       return { Icon: UserGroup02Icon,    bg: '#F5F3FF', color: '#7C3AED' }
    case 'ASSIGNMENT':   return { Icon: ClipboardIcon,      bg: '#FFF7ED', color: '#EA580C' }
    case 'CERTIFICATE':  return { Icon: Award01Icon,        bg: '#F0FDFA', color: '#0D9488' }
    case 'INVITE':       return { Icon: UserAdd01Icon,      bg: '#F5F3FF', color: '#7C3AED' }
    case 'ANNOUNCEMENT': return { Icon: Megaphone01Icon,      bg: '#FEF3F2', color: '#D92D20' }
    case 'QUIZ':         return { Icon: MessageQuestionIcon,bg: '#F0F9FF', color: '#0EA5E9' }
    case 'SCHEDULE':     return { Icon: Calendar01Icon,     bg: '#ECFDF3', color: '#12B76A' }
    default:             return { Icon: Settings01Icon,     bg: '#F9FAFB', color: '#4B5563' }
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/users/me/notifications', { params: { page: 1, size: 10 } })
      const data = unwrap<NotificationListResponse>(res.data)
      const list = data?.notifications ?? []
      setItems(list)
      setUnreadCount(list.filter(n => !n.is_read).length)
    } catch {
      // silently ignore — badge stays at previous count
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function markOneRead(id: number) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
    try {
      await apiClient.patch(`/users/me/notifications/${id}/read`)
    } catch {
      // revert optimistic update
      load()
    }
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await apiClient.patch('/users/me/notifications/read-all')
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  function handleItemClick(n: Notification) {
    if (!n.is_read) markOneRead(n.id)
    setOpen(false)
    router.push('/student/notifications')
  }

  const displayCount = unreadCount > 99 ? '99+' : unreadCount

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => { setOpen(v => !v); if (!open) load() }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${displayCount} unread)` : ''}`}
        className="relative flex items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#f3f4f6] transition-colors"
      >
        <Notification01Icon size={20} color="#374151" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-[3px] bg-[#d51520] rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none">
            {displayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] right-0 z-50 w-[380px] bg-white rounded-[12px] shadow-[0px_8px_30px_rgba(16,24,40,0.12)] border border-[#f3f4f6] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-[#111827] font-display">Notifications</p>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-[#fef2f2] text-[#d51520] text-[11px] font-semibold rounded-full font-display">
                  {displayCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="text-[12px] text-[#d51520] font-medium font-body hover:underline disabled:opacity-50"
              >
                {markingAll ? 'Marking…' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[#f3f4f6]">
            {loading && items.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-[#d51520] border-t-transparent rounded-full animate-spin" />
                <p className="text-[13px] text-[#4b5563] font-body">Loading…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-[10px] bg-[#f9fafb] flex items-center justify-center mb-1">
                  <Notification01Icon size={22} color="#9ca3af" strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-semibold text-[#374151] font-display">No notifications yet</p>
                <p className="text-[12px] text-[#4b5563] font-body text-center max-w-[220px]">
                  You&apos;ll see updates here when there&apos;s something new for you.
                </p>
              </div>
            ) : (
              items.map(n => {
                const { Icon, bg, color } = typeIcon(n.type)
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#f9fafb] transition-colors',
                      !n.is_read && 'bg-[#fffbfb]'
                    )}
                  >
                    <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: bg }}>
                      <Icon size={16} color={color} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          'text-[13px] leading-[18px] font-display truncate',
                          n.is_read ? 'font-medium text-[#374151]' : 'font-semibold text-[#111827]'
                        )}>
                          {n.title}
                        </p>
                        <span className="text-[11px] text-[#9ca3af] font-body flex-shrink-0 mt-[1px]">
                          {timeAgo(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#4b5563] font-body leading-[16px] mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#d51520] flex-shrink-0 mt-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-[#f3f4f6] px-4 py-3">
            <button
              onClick={() => { setOpen(false); router.push('/student/notifications') }}
              className="w-full text-center text-[13px] font-medium text-[#d51520] font-body hover:underline"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
