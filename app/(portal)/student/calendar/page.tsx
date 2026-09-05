'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  Clock01Icon,
  Loading01Icon,
  LinkSquare01Icon,
  Cancel01Icon,
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
  return new Date(iso).toLocaleTimeString('en-NG', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos', hour12: true,
  })
}

function googleCalUrl(ev: CalEvent): string {
  const fmtForGcal = (iso: string) =>
    iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace('Z', 'Z').slice(0, 15) + 'Z'
  const details = [ev.description, ev.cohortTitle, ev.meetingLink ? `Join: ${ev.meetingLink}` : '']
    .filter(Boolean).join('\n')
  return [
    'https://calendar.google.com/calendar/render?action=TEMPLATE',
    `&text=${encodeURIComponent(ev.title)}`,
    `&dates=${fmtForGcal(ev.startISO)}/${fmtForGcal(ev.endISO || ev.startISO)}`,
    `&details=${encodeURIComponent(details)}`,
    ev.meetingLink ? `&location=${encodeURIComponent(ev.meetingLink)}` : '',
  ].join('')
}

// ── Day detail panel ──────────────────────────────────────────────────────────
function DayPanel({
  day, month, year, events, onClose,
}: {
  day: number; month: number; year: number
  events: CalEvent[]; onClose: () => void
}) {
  const sorted = [...events].sort((a, b) => a.startISO.localeCompare(b.startISO))
  const weekday = WEEKDAYS[new Date(year, month, day).getDay()]

  return (
    <div className="w-[300px] flex-shrink-0 border-l border-[#f3f4f6] flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center justify-between">
        <div>
          <p className="text-[14px] font-bold text-[#111827] font-display">
            {weekday}, {day} {MONTHS[month]} {year}
          </p>
          <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
            {sorted.length} session{sorted.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
        >
          <Cancel01Icon size={14} color="#6b7280" strokeWidth={2} />
        </button>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-10 h-10 rounded-[8px] bg-[#f9fafb] flex items-center justify-center">
              <Calendar01Icon size={18} color="#d1d5db" strokeWidth={1.5} />
            </div>
            <p className="text-[12px] text-[#9ca3af] font-body text-center">No sessions this day</p>
          </div>
        ) : (
          sorted.map(ev => (
            <div key={ev.id} className="bg-[#fef2f2] border border-[#fecaca] rounded-[8px] p-3 flex flex-col gap-1.5">
              <p className="text-[13px] font-semibold text-[#d51520] font-display leading-snug">{ev.title}</p>

              <div className="flex items-center gap-1.5 text-[11px] text-[#4b5563] font-body">
                <Clock01Icon size={11} color="#6b7280" strokeWidth={1.5} />
                <span>
                  {formatTime(ev.startISO)}
                  {ev.endISO ? ` – ${formatTime(ev.endISO)}` : ''}
                  {' WAT'}
                </span>
              </div>

              <p className="text-[11px] text-[#6b7280] font-body">{ev.cohortTitle}</p>

              {ev.description && (
                <p className="text-[11px] text-[#4b5563] font-body leading-[1.5] border-t border-[#fecaca] pt-1.5 mt-0.5">
                  {ev.description}
                </p>
              )}

              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {ev.meetingLink ? (
                  <a
                    href={ev.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold font-display text-white bg-[#d51520] hover:bg-[#b81119] px-3 py-1.5 rounded-[6px] transition-colors"
                  >
                    <LinkSquare01Icon size={11} color="white" strokeWidth={2} />
                    Join Session
                  </a>
                ) : (
                  <p className="text-[10px] text-[#9ca3af] font-body">Link not available yet</p>
                )}
                {ev.startISO && (
                  <a
                    href={googleCalUrl(ev)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 text-[11px] font-medium font-body text-[#374151] bg-white border border-[#e5e7eb] hover:bg-[#f3f4f6] px-2.5 py-1.5 rounded-[6px] transition-colors"
                  >
                    <Calendar01Icon size={10} color="#374151" strokeWidth={2} />
                    Add to Calendar
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ── Event dot (grid cell chip) ────────────────────────────────────────────────
function EventChip({ event, onClick }: { event: CalEvent; onClick: () => void }) {
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

// ── Inner calendar (reads search params) ─────────────────────────────────────
function CalendarInner() {
  const router = useRouter()
  const params = useSearchParams()

  const now = new Date()
  const initY = parseInt(params.get('y') ?? '') || now.getFullYear()
  const initM = parseInt(params.get('m') ?? '') || now.getMonth()

  const [year,  setYear]  = useState(initY)
  const [month, setMonth] = useState(initM)

  const [events,  setEvents]  = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)

  // { key: "y-m-day" } → day number for panel
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null)

  // Fetch all schedules once
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
            } catch { /* skip */ }
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

  // Group events by WAT date key
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of events) {
      if (!ev.startISO) continue
      const d = watLocalDate(new Date(ev.startISO))
      const key = `${d.y}-${d.m}-${d.day}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    }
    return map
  }, [events])

  // Build calendar grid
  const { cells, todayKey } = useMemo(() => {
    const firstDay    = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayWAT    = watLocalDate(new Date())
    const todayKey    = `${todayWAT.y}-${todayWAT.m}-${todayWAT.day}`

    const cells: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)
    return { cells, todayKey }
  }, [year, month])

  function prev() {
    setSelectedDayKey(null)
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function next() {
    setSelectedDayKey(null)
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function selectDay(day: number) {
    const key = `${year}-${month}-${day}`
    setSelectedDayKey(prev => prev === key ? null : key)
  }

  // Parse selected day for panel
  const panelDay = selectedDayKey
    ? (() => {
        const [y, m, d] = selectedDayKey.split('-').map(Number)
        return { y, m, d, events: eventsByDay.get(selectedDayKey) ?? [] }
      })()
    : null

  const goToFullCalendar = () => router.push(`/student/calendar?y=${year}&m=${month}`)

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
          <div className={`bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex ${panelDay ? 'flex-row' : 'flex-col'}`}>

            {/* Calendar side */}
            <div className="flex-1 flex flex-col min-w-0">
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

              {/* Grid */}
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  const key        = day ? `${year}-${month}-${day}` : null
                  const dayEvents  = key ? (eventsByDay.get(key) ?? []) : []
                  const isToday    = key === todayKey
                  const isSelected = key === selectedDayKey
                  const hasEvents  = dayEvents.length > 0

                  return (
                    <div
                      key={idx}
                      onClick={() => day && selectDay(day)}
                      className={[
                        'min-h-[96px] border-b border-r border-[#f3f4f6] p-2 flex flex-col gap-1',
                        day && hasEvents ? 'cursor-pointer' : day ? 'cursor-default' : '',
                        !day ? 'bg-[#fafafa]' : '',
                        isToday && !isSelected ? 'bg-[#fef9f9]' : '',
                        isSelected ? 'bg-[#fef2f2]' : '',
                        day && hasEvents && !isSelected ? 'hover:bg-[#fef9f9]' : '',
                        idx % 7 === 6 ? 'border-r-0' : '',
                      ].filter(Boolean).join(' ')}
                    >
                      {day && (
                        <>
                          <span className={[
                            'text-[12px] font-semibold font-display w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0',
                            isToday || isSelected ? 'bg-[#d51520] text-white' : 'text-[#374151]',
                          ].join(' ')}>
                            {day}
                          </span>

                          {dayEvents.slice(0, 2).map(ev => (
                            <EventChip key={ev.id} event={ev} onClick={() => selectDay(day)} />
                          ))}

                          {dayEvents.length > 2 && (
                            <button
                              onClick={e => { e.stopPropagation(); selectDay(day) }}
                              className="text-[10px] text-[#d51520] font-semibold font-display text-left pl-1 hover:underline"
                            >
                              +{dayEvents.length - 2} more
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Empty state */}
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

            {/* Day detail panel */}
            {panelDay && (
              <DayPanel
                day={panelDay.d}
                month={panelDay.m}
                year={panelDay.y}
                events={panelDay.events}
                onClose={() => setSelectedDayKey(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* suppress unused var */}
      <span className="hidden" onClick={goToFullCalendar} />
    </>
  )
}

// ── Page (suspense boundary for useSearchParams) ──────────────────────────────
export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarInner />
    </Suspense>
  )
}
