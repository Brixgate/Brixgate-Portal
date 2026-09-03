'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { Settings01Icon, Logout01Icon } from 'hugeicons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationBell from '@/components/layout/NotificationBell'
import { useAvatar } from '@/lib/use-avatar'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

const ROUTE_MAP: { pattern: RegExp; crumbs?: string[] }[] = [
  { pattern: /^\/instructor\/dashboard$/ },
  { pattern: /^\/instructor\/earnings$/  },
  { pattern: /^\/instructor\/settings$/  },
]

function resolveCrumbs(pathname: string): string[] {
  for (const { pattern, crumbs } of ROUTE_MAP) {
    if (pattern.test(pathname)) return crumbs ?? []
  }
  return []
}

export default function InstructorTopNav() {
  const pathname = usePathname()
  const router   = useRouter()
  const { avatar } = useAvatar()
  const { user, logout } = useAuth()

  const crumbs      = resolveCrumbs(pathname)
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : ''
  const initials    = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'IN'

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
      'h-[64px] bg-white border-b border-[#f3f4f6] flex items-center gap-4 px-6 sticky top-0 z-30 flex-shrink-0'
    )}>
      <div className="flex items-center gap-[6px] text-[13px] font-body text-[#4b5563] min-w-0">
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-[6px] flex-shrink-0">
            <span className="text-[#4b5563]">{crumb}</span>
            <span className="text-[#d1d5db]">/</span>
          </span>
        ))}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="Instructor menu"
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
                <button onClick={() => { setShowMenu(false); router.push('/instructor/settings') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors text-left">
                  <Settings01Icon size={14} color="#4b5563" strokeWidth={1.5} />
                  Settings
                </button>
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
