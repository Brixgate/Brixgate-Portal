'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { BookOpen01Icon, Settings01Icon, Logout01Icon } from 'hugeicons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/layout/NotificationBell'
import { useSidebar } from '@/lib/sidebar-context'
import { useAvatar } from '@/lib/use-avatar'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// ── Pathname → { title, breadcrumbs } ─────────────────────────────────────────
const ROUTE_MAP: { pattern: RegExp; title: string; crumbs?: string[] }[] = [
  { pattern: /^\/admin\/dashboard$/,                      title: 'Dashboard'                                  },
  { pattern: /^\/admin\/users\/\d+/,                      title: 'User Profile',        crumbs: ['Users']    },
  { pattern: /^\/admin\/users$/,                          title: 'Users'                                      },
  { pattern: /^\/admin\/tutors$/,                         title: 'Tutors'                                     },
  { pattern: /^\/admin\/programs\/[^/]+$/,                title: 'Programme Detail',    crumbs: ['Programmes'] },
  { pattern: /^\/admin\/programs$/,                       title: 'Programmes'                                 },
  { pattern: /^\/admin\/cohorts\/[^/]+$/,                 title: 'Cohort Detail',       crumbs: ['Cohorts']  },
  { pattern: /^\/admin\/cohorts$/,                        title: 'Cohorts'                                    },
  { pattern: /^\/admin\/enrollments$/,                    title: 'Enrollments'                                },
  { pattern: /^\/admin\/payments$/,                       title: 'Payments'                                   },
  { pattern: /^\/admin\/coupons$/,                        title: 'Coupons'                                    },
  { pattern: /^\/admin\/expert-applications\/[^/]+$/,     title: 'Application Detail',  crumbs: ['Expert Applications'] },
  { pattern: /^\/admin\/expert-applications$/,            title: 'Expert Applications'                        },
  { pattern: /^\/admin\/organization-requests\/[^/]+$/,   title: 'Request Detail',      crumbs: ['Organisation Requests'] },
  { pattern: /^\/admin\/organization-requests$/,          title: 'Organisation Requests'                      },
  { pattern: /^\/admin\/waitlist$/,                       title: 'Waitlist'                                   },
  { pattern: /^\/admin\/certificates$/,                   title: 'Certificates'                               },
  { pattern: /^\/admin\/forums$/,                         title: 'Forum Groups'                               },
  { pattern: /^\/admin\/polls$/,                          title: 'Polls'                                      },
  { pattern: /^\/admin\/announcements$/,                  title: 'Announcements'                              },
  { pattern: /^\/admin\/?$/,                              title: 'Dashboard'                                  },
]

function resolveRoute(pathname: string) {
  for (const { pattern, title, crumbs } of ROUTE_MAP) {
    if (pattern.test(pathname)) return { title, crumbs: crumbs ?? [] }
  }
  return { title: 'Admin', crumbs: [] }
}

const PROFILE_MENU = [
  { label: 'Back to website', href: 'https://brixgate.com', external: true,  icon: BookOpen01Icon },
  { label: 'Settings',        href: '#',                    external: false, icon: Settings01Icon },
]

export default function AdminTopNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const { avatar } = useAvatar()
  const { user, logout } = useAuth()
  useSidebar()

  const { title, crumbs } = resolveRoute(pathname)

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const initials    = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'AD'

  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    if (showMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  async function handleLogout() {
    setShowMenu(false)
    await logout()
    router.push('/login')
  }

  return (
    <header className={cn(
      'h-[64px] bg-white border-b border-[#f3f4f6] flex items-center gap-4 px-6 sticky top-0 z-30 flex-shrink-0 transition-all duration-200',
    )}>
      {/* Breadcrumb + title */}
      <div className="flex items-center gap-[6px] text-[14px] font-body text-[#4b5563] min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-[6px] flex-shrink-0">
            <span className="text-[#4b5563]">{crumb}</span>
            <span className="text-[#d1d5db]">/</span>
          </span>
        ))}
        <span className="font-semibold text-[#111827] font-display truncate">{title}</span>
      </div>

      <div className="flex-1" />

      {/* Right: bell + avatar */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        {/* Avatar + dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="Admin menu"
          >
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-transparent hover:ring-[#d51520]/30 transition-all">
              <AvatarImage src={avatar ?? user?.profileImageUrl} alt={displayName} />
              <AvatarFallback className="bg-[#d51520] text-white text-[10px] font-bold font-display">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>

          {showMenu && (
            <div className="absolute top-[calc(100%+10px)] right-0 z-50 bg-white rounded-[12px] shadow-[0px_8px_30px_rgba(16,24,40,0.12)] border border-[#f3f4f6] w-[200px] py-2 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f3f4f6]">
                <p className="text-[13px] font-semibold text-[#111827] font-display truncate">{displayName}</p>
                <p className="text-[11px] text-[#4b5563] font-body truncate mt-0.5">{user?.email ?? ''}</p>
              </div>
              <div className="py-1">
                {PROFILE_MENU.map(({ label, href, external, icon: Icon }) =>
                  external ? (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer"
                      onClick={() => setShowMenu(false)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors">
                      <Icon size={14} color="#4b5563" strokeWidth={1.5} />
                      {label}
                    </a>
                  ) : (
                    <button key={label} onClick={() => { setShowMenu(false); router.push(href) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors text-left">
                      <Icon size={14} color="#4b5563" strokeWidth={1.5} />
                      {label}
                    </button>
                  )
                )}
              </div>
              <div className="border-t border-[#f3f4f6] py-1">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#d51520] font-body hover:bg-[#fef2f2] transition-colors text-left">
                  <Logout01Icon size={14} color="#d51520" strokeWidth={1.5} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
