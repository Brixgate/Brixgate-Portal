'use client'

import { useState, useEffect, useMemo } from 'react'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Video01Icon,
  Clock01Icon,
  Loading01Icon,
  LinkSquare01Icon,
} from 'hugeicons-react'

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiSchedule {
  id: number
  title?: string
  description?: string
  session_type?: string; sessionType?: string
  start_datetime?: string; startDatetime?: string
  end_datetime?: string; endDatetime?: string
  timezone?: string
  meeting_link?: string; meetingLink?: string
  status?: string
  visibility_status?: string; visibilityStatus?: string
  attendance_enabled?: boolean; attendanceEnabled?: boolean
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

// ── Normalised event ──────────────────────────────────────────────────────────
interface CalEvent {
  id: number
  title: string
  description: string
  startISO: string
  endISO: string
  meetingLink: string
  sessionType: string
  cohortTitle: string
}

function readSchedule(s: ApiSchedule, cohortTitle: string): CalEvent {
  return {
    id:          s.id,
    title:       s.title ?? 'Session',
    description: s.description ?? '',
    startISO:    s.start_datetime ?? s.startDatetime ?? '',
    endISO:      s.end_datetime   ?? s.endDatetime   ?? '',
    meetingLink: s.meeting_link   ?? s.meetingLink   ?? '',
    sessionType: s.session_type   ?? s.sessionType   ?? 'LIVE_CLASS',
    cohortTitle,
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function watDate(iso: string) {
  // Parse in WAT (UTC+1)
  return new Date(iso)
}


function watLocalDate(d: Date): { y: number; m: number; day: number } {
  const offset = 60
  const local = new Date(d.getTime() + offset * 60 * 1000)
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), day: local.getUTCDate() }
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos', hour12: true,
  })
}

function formatFullDate(iso: string): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos',
  })
}

// ── Event dot ─────────────────────────────────────────────────────────────────
function EventDot({ event, onClick }: { event: CalEvent; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-full text-left px-1 py-0.5 rounded-[3px] bg-[#fef2f2] border border-[#fecaca] text-[10px] font-semibold text-[#d51520] font-display truncate hover:bg-[#fee2e2] transition-colors"
      title={event.title}
    >
      {formatTime(event.startISO)} {event.title}
    </button>
  )
}

// ── Event detail panel ────────────────────────────────────────────────────────
function EventDetail({ event, onClose }: { event: CalEvent; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[12px] shadow-lg w-full max-w-[440px] p-6 flex flex-col gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
            <Video01Icon size={18} color="#d51520" strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#111827] font-display leading-snug">{event.title}</p>
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">{event.cohortTitle}</p>
          </div>
        </div>

        {/* Date + time */}
        <div className="flex items-center gap-2 text-[13px] text-[#374151] font-body">
          <Calendar01Icon size={14} color="#6b7280" strokeWidth={1.5} />
          <span>{formatFullDate(event.startISO)}</span>
        </div>
        {event.startISO && (
          <div className="flex items-center gap-2 text-[13px] text-[#374151] font-body">
            <Clock01Icon size={14} color="#6b7280" strokeWidth={1.5} />
            <span>
              {formatTime(event.startISO)}
              {event.endISO ? ` – ${formatTime(event.endISO)}` : ''}
              {' WAT'}
            </span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-[13px] text-[#4b5563] font-body leading-[1.6] border-t border-[#f3f4f6] pt-3">
            {event.description}
          </p>
        )}

        {/* Meeting link */}
        {event.meetingLink ? (
          <a
            href={event.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-[#d51520] hover:bg-[#b81119] text-white text-[13px] font-semibold font-display rounded-[8px] transition-colors w-full"
          >
            <LinkSquare01Icon size={14} color="white" strokeWidth={2} />
            Join Session
          </a>
        ) : (
          <p className="text-[12px] text-[#9ca3af] font-body text-center">
            Meeting link not available yet.
          </p>
        )}

        <button
          onClick={onClose}
          className="h-8 border border-[#e5e7eb] text-[#6b7280] text-[12px] font-medium font-display rounded-[6px] hover:bg-[#f9fafb] transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())   // 0-indexed

  const [events,  setEvents]  = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalEvent | null>(null)

  // Fetch enrolled cohort IDs then their schedules
  useEffect(() => {
    async function load() {
      try {
        const progRes = await apiClient.get('/users/me/programs')
        const progData = unwrap<ApiProgramsResponse>(progRes.data)
        const programs: ApiProgram[] = Array.isArray(progData?.programs) ? progData.programs : []

        // Collect unique cohort IDs + their programme title
        const cohortMap = new Map<number, string>()
        for (const p of programs) {
          const cohorts = p.myCohorts ?? p.my_cohorts ?? []
          for (const c of cohorts) {
            const cid = c.cohortId ?? c.cohort_id
            if (cid && !cohortMap.has(cid)) {
              cohortMap.set(cid, p.title ?? 'Programme')
            }
          }
        }

        // Fetch schedules for all cohorts in parallel
        const all: CalEvent[] = []
        await Promise.all(
          Array.from(cohortMap.entries()).map(async ([cohortId, cohortTitle]) => {
            try {
              const res = await apiClient.get(`/cohort-schedules?cohortId=${cohortId}`)
              const raw = unwrap<{ schedules?: ApiSchedule[] } | ApiSchedule[]>(res.data)
              const list: ApiSchedule[] = Array.isArray(raw)
                ? raw
                : (raw as Record<string, unknown>)?.schedules as ApiSchedule[] ?? []
              list.forEach(s => all.push(readSchedule(s, cohortTitle)))
            } catch {/* skip cohorts that fail */}
          })
        )

        setEvents(all)
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build calendar grid for current month
  const { cells, todayKey } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()  // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayWAT = watLocalDate(new Date())
    const todayKey = `${todayWAT.y}-${todayWAT.m}-${todayWAT.day}`

    // Build cells array (null = empty padding)
    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    // Pad to complete last week row
    while (cells.length % 7 !== 0) cells.push(null)
    return { cells, todayKey }
  }, [year, month])

  // Group events by date key (WAT)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      if (!ev.startISO) continue
      const d = watLocalDate(watDate(ev.startISO))
      const key = `${d.y}-${d.m}-${d.day}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  function prev() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <>
      <TopNav title="My Calendar" />

      <div className="px-4 md:px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">My Calendar</h1>
            <p className="text-[14px] text-[#4b5563] font-body mt-1">
              All your scheduled sessions across enrolled programmes.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 gap-2 text-[#4b5563]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[13px] font-body">Loading your schedule…</span>
          </div>
        ) : (
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden">
            {/* Month navigation */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#f3f4f6]">
              <button
                onClick={prev}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
              >
                <ArrowLeft01Icon size={14} color="#374151" strokeWidth={2} />
              </button>
              <h2 className="text-[16px] font-bold text-[#111827] font-display">
                {MONTHS[month]} {year}
              </h2>
              <button
                onClick={next}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-[#e5e7eb] hover:bg-[#f9fafb] transition-colors"
              >
                <ArrowRight01Icon size={14} color="#374151" strokeWidth={2} />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-[#f3f4f6]">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-2.5 text-center text-[11px] font-semibold text-[#9ca3af] font-display uppercase tracking-wide">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                const key = day ? `${year}-${month}-${day}` : null
                const dayEvents = key ? (eventsByDay.get(key) ?? []) : []
                const isToday = key === todayKey

                return (
                  <div
                    key={idx}
                    className={[
                      'min-h-[96px] border-b border-r border-[#f3f4f6] p-2 flex flex-col gap-1',
                      !day ? 'bg-[#fafafa]' : '',
                      isToday ? 'bg-[#fef9f9]' : '',
                      idx % 7 === 6 ? 'border-r-0' : '',
                    ].join(' ')}
                  >
                    {day && (
                      <>
                        <span className={[
                          'text-[12px] font-semibold font-display w-6 h-6 flex items-center justify-center rounded-full',
                          isToday ? 'bg-[#d51520] text-white' : 'text-[#374151]',
                        ].join(' ')}>
                          {day}
                        </span>
                        {/* Show up to 2 events, +N overflow */}
                        {dayEvents.slice(0, 2).map(ev => (
                          <EventDot key={ev.id} event={ev} onClick={() => setSelected(ev)} />
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-[#9ca3af] font-body pl-1">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Empty state inside calendar */}
            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 border-t border-[#f3f4f6]">
                <div className="w-12 h-12 rounded-[10px] bg-[#f9fafb] flex items-center justify-center">
                  <Calendar01Icon size={22} color="#d1d5db" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-[#374151] font-display">No sessions scheduled</p>
                <p className="text-[13px] text-[#9ca3af] font-body max-w-[280px] text-center">
                  Sessions added by your instructors will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selected && <EventDetail event={selected} onClose={() => setSelected(null)} />}
    </>
  )
}
