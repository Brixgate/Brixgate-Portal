'use client'

import TopNav from '@/components/layout/TopNav'
import PromoBanner from '@/components/student/PromoBanner'
import MyLearning from '@/components/student/MyLearning'
// FEATURE_OFF: notifications — import NotificationsPanel from '@/components/student/NotificationsPanel'
import NewUserDashboard from '@/components/student/NewUserDashboard'
import { MOCK_ENROLLMENTS } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'

function getTodayFormatted() {
  const now = new Date()
  const weekday = now.toLocaleDateString('en-NG', { weekday: 'long' })
  const monthYear = now.toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })
  return `${weekday}, ${monthYear}`
}

export default function DashboardPage() {
  const { user } = useAuth()
  const isNewUser = MOCK_ENROLLMENTS.length === 0
  const firstName = user?.firstName ?? ''

  return (
    <>
      <TopNav title="Dashboard" />

      <div className="px-4 lg:px-8 pb-10">
        {/* Greeting */}
        <div className="flex items-start justify-between pt-6 pb-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-[22px] lg:text-[28px] font-semibold text-black font-display leading-tight">
              Welcome{firstName ? ` ${firstName}` : ''}!
            </h1>
            <p className="text-[13px] lg:text-[14px] text-[#6b7280] font-body">
              {isNewUser ? 'Get started by enrolling in a programme.' : "Let's learn something new today"}
            </p>
          </div>
          {/* Date — hidden on mobile */}
          <p className="hidden lg:block text-[14px] text-[#6b7280] font-body pt-1 shrink-0">
            {getTodayFormatted()}
          </p>
        </div>

        {isNewUser ? (
          <NewUserDashboard />
        ) : (
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Left main column */}
            <div className="flex-1 min-w-0 flex flex-col gap-4 lg:gap-6">
              <PromoBanner />
              <MyLearning />
            </div>

            {/* FEATURE_OFF: notifications — right panel hidden; re-enable by uncommenting below */}
            {/* <div className="hidden lg:flex lg:w-[280px] xl:w-[320px] lg:flex-shrink-0 flex-col gap-4">
              <NotificationsPanel />
            </div> */}
          </div>
        )}
      </div>
    </>
  )
}
