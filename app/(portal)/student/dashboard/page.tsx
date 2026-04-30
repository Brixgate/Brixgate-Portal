'use client'

import TopNav from '@/components/layout/TopNav'
import DashboardStats from '@/components/student/DashboardStats'
import WeeklyProgress from '@/components/student/WeeklyProgress'
import PromoBanner from '@/components/student/PromoBanner'
import MyLearning from '@/components/student/MyLearning'
import NotificationsPanel from '@/components/student/NotificationsPanel'
import PastSessionsPanel from '@/components/student/PastSessionsPanel'
import NewUserDashboard from '@/components/student/NewUserDashboard'
import MobileCourseFeed from '@/components/student/MobileCourseFeed'
import { useAuth } from '@/lib/auth-context'

function getTodayFormatted() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-NG', { weekday: 'long' })
  const monthYear = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
  return `${weekday}, ${monthYear}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  // Show the enrolled dashboard only when the user has a confirmed session.
  // Until the backend supplies real enrollment data, default to empty state.
  const isEnrolled = false
  const firstName = user?.firstName ?? ''

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="px-4 md:px-8 pb-10">
        {/* Greeting */}
        <div className="flex items-start justify-between pt-6 pb-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] md:text-[28px] font-semibold text-black font-display leading-tight">
              Welcome{firstName ? ` ${firstName}` : ''}!
            </h1>
            <p className="text-[13px] md:text-[14px] text-[#6b7280] font-body">
              {!isEnrolled ? 'Get started by enrolling in a programme.' : "Let's learn something new today"}
            </p>
          </div>
          {/* Date — hidden on mobile */}
          <p className="hidden min-[400px]:block text-[14px] text-[#6b7280] font-body pt-1 shrink-0">
            {getTodayFormatted()}
          </p>
        </div>

        {/* ── MOBILE VIEW (< 400px) ─────────────────────────────────────────── */}
        {/* No metrics, no promo — just course feed */}
        <div className="max-[400px]:block hidden">
          <MobileCourseFeed />
        </div>

        {/* ── DESKTOP / TABLET VIEW (400px+) ───────────────────────────────── */}
        <div className="max-[400px]:hidden">
          {!isEnrolled ? (
            <NewUserDashboard />
          ) : (
            <div className="flex gap-6">
              {/* Left main column */}
              <div className="flex-1 min-w-0 flex flex-col gap-6">
                <DashboardStats />
                <PromoBanner />
                <MyLearning />
              </div>

              {/* Right panel */}
              <div className="w-[280px] xl:w-[320px] flex-shrink-0 flex flex-col gap-4">
                <WeeklyProgress />
                <NotificationsPanel />
                <PastSessionsPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
