'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search01Icon, Menu01Icon, BookOpen01Icon, Settings01Icon, HelpCircleIcon, Logout01Icon } from 'hugeicons-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import NotificationDropdown from '@/components/shared/NotificationDropdown'
import { MOCK_STUDENT } from '@/lib/mock-data'
import { useSidebar } from '@/lib/sidebar-context'
import { useAvatar } from '@/lib/use-avatar'

interface TopNavProps {
  title: string
  breadcrumbs?: string[]
}

const PROFILE_MENU = [
  { label: 'My Courses',       href: '/student/programs',  icon: BookOpen01Icon },
  { label: 'Profile Settings', href: '/student/settings',  icon: Settings01Icon },
  { label: 'Help Center',      href: '#',                  icon: HelpCircleIcon },
]

export default function TopNav({ title, breadcrumbs = [] }: TopNavProps) {
  const initials = `${MOCK_STUDENT.firstName[0]}${MOCK_STUDENT.lastName[0]}`
  const crumbPath = [...breadcrumbs, title]
  const { openMobile } = useSidebar()
  const { avatar } = useAvatar()
  const router = useRouter()

  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showProfileMenu])

  return (
    <header className="h-[64px] bg-white border-b border-[#f3f4f6] flex items-center gap-4 px-4 lg:px-6 sticky top-0 z-30">
      {/* Hamburger — mobile only (< 400px) */}
      <button
        className="max-[400px]:flex hidden items-center justify-center w-9 h-9 rounded-[8px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
        onClick={openMobile}
        aria-label="Open menu"
      >
        <Menu01Icon size={20} color="#374151" strokeWidth={1.5} />
      </button>

      {/* Breadcrumb — hidden on mobile */}
      <div className="hidden min-[400px]:flex items-center gap-[6px] text-[14px] text-[#6b7280] font-body shrink-0">
        {crumbPath.map((crumb, i) => (
          <span key={i} className="flex items-center gap-[6px]">
            {i > 0 && <span className="text-[#d1d5db]">/</span>}
            <span className={i === crumbPath.length - 1 ? 'text-[#6b7280]' : 'text-[#9ca3af]'}>
              {crumb}
            </span>
          </span>
        ))}
        {crumbPath.length > 0 && <span className="text-[#d1d5db]">/</span>}
      </div>

      {/* Page title on mobile */}
      <p className="max-[400px]:block hidden text-[15px] font-semibold text-[#111827] font-display flex-1 truncate">
        {title}
      </p>

      <div className="flex-1 min-[400px]:block hidden" />

      {/* Search — hidden on mobile */}
      <div className="relative w-[280px] shrink-0 hidden min-[400px]:block">
        <Search01Icon
          className="absolute left-4 top-1/2 -translate-y-1/2"
          size={18}
          color="#9ca3af"
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="Search..."
          className="w-full h-[44px] pl-[44px] pr-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] text-[14px] text-[#111827] placeholder:text-[#9ca3af] font-body focus:outline-none focus:border-[#d51520]/30 focus:ring-2 focus:ring-[#d51520]/10 transition-all"
        />
      </div>

      {/* Notification dropdown */}
      <NotificationDropdown />

      {/* Profile avatar + dropdown */}
      <div className="relative shrink-0" ref={profileRef}>
        <button
          onClick={() => setShowProfileMenu((v) => !v)}
          className="flex items-center focus:outline-none"
          aria-label="Open profile menu"
        >
          <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent hover:ring-[#d51520]/30 transition-all rounded-full">
            <AvatarImage src={avatar ?? MOCK_STUDENT.avatar} alt={MOCK_STUDENT.firstName} />
            <AvatarFallback className="bg-[#d51520] text-white text-[11px] font-bold font-display">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Dropdown */}
        {showProfileMenu && (
          <div className="absolute top-[calc(100%+10px)] right-0 z-50 bg-white rounded-[12px] shadow-[0px_8px_30px_rgba(16,24,40,0.12)] border border-[#f3f4f6] w-[220px] py-2 overflow-hidden">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-[#f3f4f6]">
              <p className="text-[13px] font-semibold text-[#111827] font-display">
                {MOCK_STUDENT.firstName} {MOCK_STUDENT.lastName}
              </p>
              <p className="text-[11px] text-[#9ca3af] font-body truncate mt-0.5">
                {MOCK_STUDENT.email}
              </p>
            </div>

            {/* Menu items */}
            <div className="py-1">
              {PROFILE_MENU.map(({ label, href, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => {
                    setShowProfileMenu(false)
                    router.push(href)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] transition-colors text-left"
                >
                  <Icon size={15} color="#6b7280" strokeWidth={1.5} />
                  {label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-[#f3f4f6] py-1 mt-1">
              <button
                onClick={() => {
                  setShowProfileMenu(false)
                  // Auth logout will be wired to API — shows route for now
                  router.push('/login')
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium text-[#d51520] font-body hover:bg-[#fef2f2] transition-colors text-left"
              >
                <Logout01Icon size={15} color="#d51520" strokeWidth={1.5} />
                Log out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
