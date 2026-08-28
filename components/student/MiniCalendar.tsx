'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient, unwrap } from '@/lib/api-client'
import { ArrowLeft01Icon, ArrowRight01Icon, Calendar01Icon } from 'hugeicons-react'

interface ApiSchedule {
  id: number
  start_datetime?: string
  startDatetime?: string
  title?: string
  [key: string]: unknown
}

interface ApiProgram {
  id: number
  title?: string
  myCohorts?: { cohortId?: number; cohort_id?: number }[]
  my_cohorts?: { cohortId?: number; cohort_id?: number }[]
}

interface ApiProgramsResponse {
  programs?: ApiProgram[]
}

const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const MONTHS_SHORT = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

function watLocalDate(d: Date): { y: number; m: number; day: number } {
  const local = new Date(d.getTime() + 60 * 60 * 1000)
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), day: local.getUTCDate() }
}

export default function MiniCalendar() {
  const router = useRouter()
  const now = new Date()

  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [eventDayKeys, setEventDayKeys] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [nextEvents, setNextEvents] = useState<{ title: string; dateStr: string; iso: string }[]>([])

  useEffect(() => {
    async function load() {
      try {
        const progRes = await apiClient.get('/users/me/programs')
        const progData = unwrap<ApiProgramsResponse>(progRes.data)
        const programs: ApiProgram[] = Array.isArray(progData?.programs) ? progData.programs : []

        const cohortMap = new Map<number, string>()
        for (const p of programs) {
          const cohorts = p.myCohorts ?? p.my_cohorts ?? []
          for (const c of cohorts) {
            const cid = c.cohortId ?? c.cohort_id
            if (cid && !cohortMap.has(cid)) cohortMap.set(cid, p.title ?? 'Programme')
          }
        }

        const keys = new Set<string>()
        const upcoming: { title: string; dateStr: string; iso: string; cohort: string }[] = []

        await Promise.all(
          Array.from(cohortMap.entries()).map(async ([cohortId]) => {
            try {
              const res = await apiClient.get(`/cohort-schedules?cohortId=${cohortId}`)
              const raw = unwrap<{ schedules?: ApiSchedule[] } | ApiSchedule[]>(res.data)
              const list: ApiSchedule[] = Array.isArray(raw)
                ? raw
                : (raw as Record<string, unknown>)?.schedules as ApiSchedule[] ?? []

              for (const s of list) {
                const iso = s.start_datetime ?? s.startDatetime
                if (!iso) continue
                const d = watLocalDate(new Date(iso))
                keys.add(`${d.y}-${d.m}-${d.day}`)

                // Collect upcoming events (future)
                if (new Date(iso) >= new Date()) {
                  upcoming.push({
                    title: s.title ?? 'Session',
                    iso,
                    dateStr: new Date(iso).toLocaleDateString('en-NG', {
                      day: 'numeric', month: 'short', timeZone: 'Africa/Lagos',
                    }),
                    cohort: '',
                  })
                }
              }
            } catch { /* skip */ }
          })
        )

        setEventDayKeys(keys)
        upcoming.sort((a, b) => a.iso.localeCompare(b.iso))
        setNextEvents(upcoming.slice(0, 3))
      } catch {
        setEventDayKeys(new Set())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const { cells, todayKey } = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const t           = watLocalDate(new Date())
    return {
      cells: [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ] as (number | null)[],
      todayKey: `${t.y}-${t.m}-${t.day}`,
    }
  }, [year, month])

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function handleDayClick() {
    router.push(`/student/calendar?y=${year}&m=${month}`)
  }

  return (
    <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,0.05)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={prev}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowLeft01Icon size={13} color="#374151" strokeWidth={2} />
        </button>
        <p className="text-[13px] font-bold text-[#111827] font-display">
          {MONTHS_SHORT[month]} {year}
        </p>
        <button
          onClick={next}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
        >
          <ArrowRight01Icon size={13} color="#374151" strokeWidth={2} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 px-3 pb-1">
        {WEEKDAYS_SHORT.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-[#9ca3af] font-display py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const key      = `${year}-${month}-${day}`
          const isToday  = key === todayKey
          const hasEvent = eventDayKeys.has(key)

          return (
            <div
              key={idx}
              onClick={() => handleDayClick()}
              className={[
                'flex flex-col items-center justify-center py-0.5 rounded-[6px] cursor-pointer group',
                isToday ? '' : 'hover:bg-[#fef2f2]',
              ].join(' ')}
            >
              <span className={[
                'text-[12px] font-semibold font-display w-6 h-6 flex items-center justify-center rounded-full',
                isToday ? 'bg-[#d51520] text-white' : 'text-[#374151] group-hover:text-[#d51520]',
              ].join(' ')}>
                {day}
              </span>
              {/* Event dot */}
              {hasEvent && (
                <span className={`w-1 h-1 rounded-full mt-0.5 ${isToday ? 'bg-white/70' : 'bg-[#d51520]'}`} />
              )}
              {!hasEvent && <span className="w-1 h-1 mt-0.5" />}
            </div>
          )
        })}
      </div>

      {/* Upcoming sessions */}
      {!loading && nextEvents.length > 0 && (
        <div className="border-t border-[#f3f4f6] px-4 py-3 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">
            Upcoming
          </p>
          {nextEvents.map((ev, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#d51520] flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[#111827] font-display truncate">{ev.title}</p>
                <p className="text-[11px] text-[#9ca3af] font-body">{ev.dateStr}</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => router.push('/student/calendar')}
            className="mt-1 text-[11px] font-semibold text-[#d51520] font-display hover:underline text-left flex items-center gap-1"
          >
            <Calendar01Icon size={11} color="#d51520" strokeWidth={2} />
            View full calendar
          </button>
        </div>
      )}

      {!loading && nextEvents.length === 0 && (
        <div className="border-t border-[#f3f4f6] px-4 py-3">
          <p className="text-[11px] text-[#9ca3af] font-body text-center">No upcoming sessions</p>
          <button
            onClick={() => router.push('/student/calendar')}
            className="mt-2 w-full text-[11px] font-semibold text-[#d51520] font-display hover:underline text-center flex items-center justify-center gap-1"
          >
            <Calendar01Icon size={11} color="#d51520" strokeWidth={2} />
            View full calendar
          </button>
        </div>
      )}

      {loading && (
        <div className="border-t border-[#f3f4f6] py-4 flex items-center justify-center">
          <div className="w-3 h-3 border-2 border-[#d51520] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

// Re-export month names for use by calendar page
export { MONTHS }
