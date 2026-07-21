'use client'

import { useState, useEffect } from 'react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'
import { Search01Icon, ArrowDown01Icon, ArrowUp01Icon, ChartBarLineIcon, AlertCircleIcon } from 'hugeicons-react'
import AdminPageLoader from '@/components/admin/AdminPageLoader'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Questionnaire {
  id: number
  title?: string; name?: string; description?: string
  created_at?: string; createdAt?: string
}

interface QuestionnaireSummaryUser {
  id?: number
  name?: string; full_name?: string
  email?: string
  role?: string
  occupation?: string
  phone_number?: string; phoneNumber?: string; full_phone_number?: string
}

interface QuestionnaireSummary {
  id: number
  questionnaire_id?: number; questionnaireId?: number
  user_id?: number; userId?: number
  user?: QuestionnaireSummaryUser
  name?: string; full_name?: string
  email?: string
  occupation?: string
  phone_number?: string; phoneNumber?: string
  score: number
  rating_level?: string; ratingLevel?: string
  source?: string
  submitted_at?: string; created_at?: string; createdAt?: string
  // client-side enrichment
  _questionnaireName?: string
  _questionnaireId?: number
}

interface SummaryResponse {
  data?: QuestionnaireSummary[]
  summaries?: QuestionnaireSummary[]
  results?: QuestionnaireSummary[]
  content?: QuestionnaireSummary[]
  items?: QuestionnaireSummary[]
  pagination?: { total?: number; total_elements?: number; totalElements?: number }
  total?: number; totalElements?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ratingLevel(r: QuestionnaireSummary): string { return r.rating_level ?? r.ratingLevel ?? '—' }
function displayName(r: QuestionnaireSummary): string  { return r.user?.name ?? r.user?.full_name ?? r.name ?? r.full_name ?? '—' }
function displayEmail(r: QuestionnaireSummary): string { return r.user?.email ?? r.email ?? '—' }
function displayPhone(r: QuestionnaireSummary): string {
  return r.user?.phone_number ?? r.user?.phoneNumber ??
    (r.user as { full_phone_number?: string })?.full_phone_number ??
    r.phone_number ?? r.phoneNumber ?? '—'
}
function displaySource(r: QuestionnaireSummary): string { return r.source ?? '—' }
function submittedAt(r: QuestionnaireSummary): string {
  const raw = r.submitted_at ?? r.created_at ?? r.createdAt
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}
function submittedMs(r: QuestionnaireSummary): number {
  return new Date(r.submitted_at ?? r.created_at ?? r.createdAt ?? 0).getTime()
}
function qTitle(q: Questionnaire): string {
  return q.title ?? q.name ?? `Questionnaire #${q.id}`
}

const LEVEL_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  ADVANCED:     { bg: '#ecfdf3', text: '#027a48', border: '#bbf7d0' },
  INTERMEDIATE: { bg: '#fffaeb', text: '#b45309', border: '#fed7aa' },
  BEGINNER:     { bg: '#fef2f2', text: '#d51520', border: '#fecdca' },
}

function LevelBadge({ level }: { level: string }) {
  const s = LEVEL_STYLES[level.toUpperCase()] ?? { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border font-body"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.text }} />
      {level.charAt(0) + level.slice(1).toLowerCase()}
    </span>
  )
}

const PAGE_SIZE = 20

function PaginationBar({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  if (totalPages <= 1) return null

  const btnClass = (active: boolean) =>
    `h-8 min-w-[32px] px-2 rounded-[6px] text-[12px] font-medium font-body border transition-colors ${
      active
        ? 'bg-[#d51520] text-white border-[#d51520]'
        : 'border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]'
    }`

  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
        className="h-8 px-2.5 rounded-[6px] text-[12px] font-body border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 transition-colors">
        ‹
      </button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`ellipsis-${i}`} className="px-1 text-[12px] text-[#98a2b3]">…</span>
          : <button key={p} onClick={() => onPageChange(p)} className={btnClass(p === page)}>{p}</button>
      )}
      <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages}
        className="h-8 px-2.5 rounded-[6px] text-[12px] font-body border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] disabled:opacity-40 transition-colors">
        ›
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PollsPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([])
  const [allRows, setAllRows]               = useState<QuestionnaireSummary[]>([])
  const [loading, setLoading]               = useState(true)
  const [error, setError]                   = useState('')

  // Filters
  const [search, setSearch]           = useState('')
  const [levelFilter, setLevel]       = useState('ALL')
  const [qFilter, setQFilter]         = useState<number | 'ALL'>('ALL')
  const [sortField, setSortField]     = useState<'score' | 'date'>('date')
  const [sortDir, setSortDir]         = useState<'desc' | 'asc'>('desc')
  const [page, setPage]               = useState(1)

  // Load everything on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        // 1. Fetch questionnaire list
        const qRes = await apiClient.get('/admin/questionnaires')
        const qd   = unwrap<{ questionnaires?: Questionnaire[]; content?: Questionnaire[]; data?: Questionnaire[] } | Questionnaire[]>(qRes.data)
        const qList: Questionnaire[] = Array.isArray(qd)
          ? qd
          : ((qd as { questionnaires?: Questionnaire[] })?.questionnaires
             ?? (qd as { content?: Questionnaire[] })?.content
             ?? (qd as { data?: Questionnaire[] })?.data
             ?? [])
        setQuestionnaires(qList)

        if (qList.length === 0) { setLoading(false); return }

        // 2. Fetch ALL pages of summaries for every questionnaire (API max size=100)
        const fetchAllPages = async (q: Questionnaire): Promise<QuestionnaireSummary[]> => {
          const all: QuestionnaireSummary[] = []
          let p = 1
          while (true) {
            const res = await apiClient.get(`/admin/questionnaires/${q.id}/summaries?page=${p}&size=100`)
            const d = unwrap<SummaryResponse>(res.data)
            const list: QuestionnaireSummary[] = Array.isArray(d)
              ? d
              : (d?.summaries ?? d?.data ?? d?.results ?? d?.content ?? d?.items ?? [])
            all.push(...list.map(r => ({ ...r, _questionnaireName: qTitle(q), _questionnaireId: q.id })))
            const totalPages = d?.pagination?.total_pages ?? d?.pagination?.totalPages ?? 1
            if (p >= totalPages || list.length === 0) break
            p++
          }
          return all
        }

        const results = await Promise.allSettled(qList.map(q => fetchAllPages(q)))

        const merged: QuestionnaireSummary[] = []
        results.forEach(r => { if (r.status === 'fulfilled') merged.push(...r.value) })
        setAllRows(merged)
      } catch (err) {
        setError(getApiError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Derived filtered + sorted list
  const filtered = allRows
    .filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q ||
        displayName(r).toLowerCase().includes(q) ||
        displayEmail(r).toLowerCase().includes(q) ||
        displayPhone(r).toLowerCase().includes(q) ||
        displaySource(r).toLowerCase().includes(q) ||
        (r._questionnaireName ?? '').toLowerCase().includes(q)
      const matchLevel = levelFilter === 'ALL' || ratingLevel(r).toUpperCase() === levelFilter
      const matchQ     = qFilter === 'ALL' || r._questionnaireId === qFilter
      return matchSearch && matchLevel && matchQ
    })
    .sort((a, b) => {
      if (sortField === 'score') return sortDir === 'desc' ? b.score - a.score : a.score - b.score
      return sortDir === 'desc' ? submittedMs(b) - submittedMs(a) : submittedMs(a) - submittedMs(b)
    })

  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalCount = filtered.length

  function changeFilter(fn: () => void) { fn(); setPage(1) }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }
  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === 'desc' ? <ArrowDown01Icon size={12} color="#4b5563" strokeWidth={2} /> : <ArrowUp01Icon size={12} color="#4b5563" strokeWidth={2} />
      : null

  const visibleRows = qFilter === 'ALL' ? allRows : allRows.filter(r => r._questionnaireId === qFilter)
  const advanced     = visibleRows.filter(r => ratingLevel(r).toUpperCase() === 'ADVANCED').length
  const intermediate = visibleRows.filter(r => ratingLevel(r).toUpperCase() === 'INTERMEDIATE').length
  const beginner     = visibleRows.filter(r => ratingLevel(r).toUpperCase() === 'BEGINNER').length
  const avgScore     = visibleRows.length ? Math.round(visibleRows.reduce((s, r) => s + (r.score ?? 0), 0) / visibleRows.length) : 0

  if (loading) return <AdminPageLoader />

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-[32px]">AI Readiness Polls</h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-0.5">Results from the AI readiness quiz on brixgate.com</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display mb-0.5">Total Responses</p>
          <p className="text-[28px] font-bold text-[#111827] font-display leading-none">{allRows.length.toLocaleString()}</p>
        </div>
      </div>

      {error && (
        <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] px-5 py-4 mb-6 flex items-center gap-2">
          <AlertCircleIcon size={15} color="#d51520" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-[#d51520] font-body">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && questionnaires.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
            <ChartBarLineIcon size={28} color="#98a2b3" strokeWidth={1.5} />
          </div>
          <h3 className="text-[16px] font-semibold text-[#111827] font-display mb-1">No questionnaires found</h3>
          <p className="text-[13px] text-[#4b5563] font-body max-w-[300px]">
            No questionnaires have been created yet, or the endpoint is not yet available.
          </p>
        </div>
      )}

      {allRows.length > 0 && (
        <>
          {/* Stat row */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Responses', value: visibleRows.length, sub: 'quiz completions',  accent: '#7c3aed', tint: '#f5f3ff' },
              { label: 'Advanced',        value: advanced,           sub: 'AI Practitioner+',  accent: '#027a48', tint: '#ecfdf3' },
              { label: 'Intermediate',    value: intermediate,       sub: 'AI Aware',          accent: '#b45309', tint: '#fffaeb' },
              { label: 'Beginner',        value: beginner,           sub: 'needs development', accent: '#d51520', tint: '#fef2f2' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display mb-3">{s.label}</p>
                <p className="text-[30px] font-bold leading-none font-display text-[#101828]">{s.value.toLocaleString()}</p>
                <p className="mt-1 text-[12px] text-[#98a2b3] font-body">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Average score banner */}
          {visibleRows.length > 0 && (
            <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] px-6 py-4 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-[16px] font-display">{avgScore}%</span>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#111827] font-display">Average AI Readiness Score: {avgScore}%</p>
                <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
                  Across {visibleRows.length.toLocaleString()} response{visibleRows.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Table card */}
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f3f4f6] flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search01Icon className="absolute left-3.5 top-1/2 -translate-y-1/2" size={15} color="#4b5563" strokeWidth={1.5} />
                <input type="text" placeholder="Search by name, email, phone…"
                  value={search} onChange={e => changeFilter(() => setSearch(e.target.value))}
                  className="w-full h-[38px] pl-9 pr-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] focus:outline-none focus:border-[#d51520]/40 focus:ring-2 focus:ring-[#d51520]/10" />
              </div>

              {/* Questionnaire filter */}
              {questionnaires.length > 1 && (
                <select
                  value={qFilter}
                  onChange={e => changeFilter(() => setQFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)))}
                  className="h-[38px] pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 min-w-[200px]">
                  <option value="ALL">All Questionnaires</option>
                  {questionnaires.map(q => (
                    <option key={q.id} value={q.id}>{qTitle(q)}</option>
                  ))}
                </select>
              )}

              <select value={levelFilter} onChange={e => changeFilter(() => setLevel(e.target.value))}
                className="h-[38px] pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 min-w-[140px]">
                <option value="ALL">All Levels</option>
                <option value="ADVANCED">Advanced</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="BEGINNER">Beginner</option>
              </select>
            </div>

            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">No results found</p>
                <p className="text-[13px] text-[#4b5563] font-body">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                        {['Name', 'Email', 'Phone', 'Questionnaire', 'Source', 'Level'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display whitespace-nowrap">{h}</th>
                        ))}
                        <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display cursor-pointer hover:text-[#374151] select-none whitespace-nowrap" onClick={() => toggleSort('score')}>
                          <span className="inline-flex items-center gap-1 justify-end">Score <SortIcon field="score" /></span>
                        </th>
                        <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display cursor-pointer hover:text-[#374151] select-none whitespace-nowrap" onClick={() => toggleSort('date')}>
                          <span className="inline-flex items-center gap-1">Date <SortIcon field="date" /></span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map(r => (
                        <tr key={`${r._questionnaireId}-${r.id}`} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#f9fafb] transition-colors">
                          <td className="px-5 py-3.5 text-[13px] font-medium text-[#111827] font-body whitespace-nowrap">{displayName(r)}</td>
                          <td className="px-5 py-3.5 text-[13px] text-[#374151] font-body">{displayEmail(r)}</td>
                          <td className="px-5 py-3.5 text-[13px] text-[#4b5563] font-body whitespace-nowrap">{displayPhone(r)}</td>
                          <td className="px-5 py-3.5 max-w-[180px]">
                            <span className="block truncate text-[13px] text-[#374151] font-body" title={r._questionnaireName}>{r._questionnaireName ?? '—'}</span>
                          </td>
                          <td className="px-5 py-3.5 max-w-[160px]">
                            {displaySource(r) !== '—'
                              ? <span className="block truncate px-2 py-0.5 rounded-[4px] bg-[#f3f4f6] text-[#374151] text-[11px] font-medium font-body max-w-full" title={displaySource(r)}>{displaySource(r)}</span>
                              : <span className="text-[13px] text-[#4b5563] font-body">—</span>}
                          </td>
                          <td className="px-5 py-3.5"><LevelBadge level={ratingLevel(r)} /></td>
                          <td className="px-5 py-3.5 text-right text-[13px] font-semibold text-[#111827] font-display">{r.score != null ? `${r.score}%` : '—'}</td>
                          <td className="px-5 py-3.5 text-[13px] text-[#4b5563] font-body whitespace-nowrap">{submittedAt(r)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-4 border-t border-[#f3f4f6] flex items-center justify-between flex-wrap gap-3">
                  <p className="text-[12px] text-[#4b5563] font-body">
                    Showing {Math.min((page - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount.toLocaleString()} responses
                  </p>
                  <PaginationBar page={page} totalPages={Math.ceil(totalCount / PAGE_SIZE)} onPageChange={setPage} />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
