import { MOCK_LOGIN_DAYS, MOCK_SESSIONS } from '@/lib/mock-data'

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getWeekDates() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const loginSet = new Set(MOCK_LOGIN_DAYS)

  // Build a set of session dates (upcoming or live) for dot indicators
  const sessionDates = new Set(
    MOCK_SESSIONS
      .filter((s) => s.status === 'upcoming' || s.status === 'live')
      .map((s) => s.date)
  )

  return DAYS.map((day, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - dayOfWeek + i)
    const dateStr = toDateStr(d)
    const isToday = i === dayOfWeek
    const isLoggedIn = loginSet.has(dateStr)
    const isFuture = d > now && !isToday
    const hasSession = sessionDates.has(dateStr)

    return { day, date: d.getDate(), dateStr, isToday, isLoggedIn, isFuture, hasSession }
  })
}

export default function WeeklyProgress() {
  const week = getWeekDates()
  const loggedDaysCount = week.filter((d) => d.isLoggedIn).length

  return (
    <div className="bg-white rounded-[10px] px-5 py-5 shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[15px] font-semibold text-[#111827] font-display leading-none">
          Weekly Progress
        </p>
        <span className="text-[12px] font-medium text-[#9ca3af] font-body">
          {loggedDaysCount}/7 days
        </span>
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {week.map(({ day, date, isToday, isLoggedIn, isFuture, hasSession }) => {
          const bg = isLoggedIn
            ? '#d51520'
            : isToday
            ? 'transparent'
            : '#f7f8fa'

          const border = isToday && !isLoggedIn
            ? '1.5px solid #d51520'
            : '1.5px solid transparent'

          const dayColor = isLoggedIn
            ? 'rgba(255,255,255,0.75)'
            : isToday
            ? '#d51520'
            : isFuture
            ? '#d1d5db'
            : '#9ca3af'

          const dateColor = isLoggedIn
            ? '#ffffff'
            : isToday
            ? '#d51520'
            : isFuture
            ? '#d1d5db'
            : '#374151'

          // Dot: red for session days, white-on-red for logged-in session days
          const dotColor = isLoggedIn && hasSession
            ? 'rgba(255,255,255,0.85)'
            : isLoggedIn
            ? 'rgba(255,255,255,0.35)'
            : hasSession
            ? '#d51520'
            : 'transparent'

          return (
            <div
              key={day}
              className="flex flex-col items-center justify-center gap-1 rounded-[6px] transition-all"
              style={{ backgroundColor: bg, border, height: '52px' }}
            >
              <p
                className="text-[8px] font-bold uppercase font-display tracking-wide leading-none"
                style={{ color: dayColor }}
              >
                {day}
              </p>
              <p
                className="text-[15px] font-semibold font-display leading-none"
                style={{ color: dateColor }}
              >
                {date}
              </p>
              {/* Session / activity dot */}
              <div
                className="w-1 h-1 rounded-full transition-all"
                style={{ background: dotColor }}
              />
            </div>
          )
        })}
      </div>

      {/* Streak text */}
      <p className="text-[11px] text-[#9ca3af] font-body mt-3 text-center leading-snug">
        {loggedDaysCount === 0
          ? 'No activity yet — log in daily to build your streak'
          : loggedDaysCount === 7
          ? '🔥 Perfect week! You logged in every day.'
          : `Active ${loggedDaysCount} day${loggedDaysCount > 1 ? 's' : ''} this week`}
      </p>

      {/* Session dot legend */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#d51520]" />
        <p className="text-[10px] text-[#9ca3af] font-body">Dot indicates a class day</p>
      </div>
    </div>
  )
}
