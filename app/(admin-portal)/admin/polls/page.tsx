'use client'

import { useState, useEffect } from 'react'
import { apiClient, unwrap } from '@/lib/api-client'
import { Loading01Icon, Search01Icon, ArrowDown01Icon, ArrowUp01Icon } from 'hugeicons-react'
import AdminPageLoader from '@/components/admin/AdminPageLoader'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Questionnaire {
  id: number
  title?: string; name?: string
}

interface QuestionnaireSummary {
  id: number
  questionnaire_id?: number; questionnaireId?: number
  name?: string; full_name?: string
  email: string
  score: number
  rating_level?: string; ratingLevel?: string
  occupation?: string
  source?: string
  phone_number?: string; phoneNumber?: string
  created_at?: string; createdAt?: string
}

interface SummaryResponse {
  data?: QuestionnaireSummary[]
  summaries?: QuestionnaireSummary[]
  results?: QuestionnaireSummary[]
  pagination?: { total?: number; totalElements?: number; total_elements?: number; page?: number; size?: number; hasNext?: boolean; has_next?: boolean }
  total?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ratingLevel(r: QuestionnaireSummary): string { return r.rating_level ?? r.ratingLevel ?? '—' }
function displayName(r: QuestionnaireSummary): string  { return r.name ?? r.full_name ?? '—' }
function createdAt(r: QuestionnaireSummary): string {
  const raw = r.created_at ?? r.createdAt
  if (!raw) return '—'
  return new Date(raw).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PollsPage() {
  const [rows, setRows]               = useState<QuestionnaireSummary[]>([])
  const [questionnaires, setQs]       = useState<Questionnaire[]>([])
  const [activeQId, setActiveQId]     = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [initLoading, setInitLoading] = useState(true)
  const [search, setSearch]           = useState('')
  const [levelFilter, setLevel]       = useState<string>('ALL')
  const [page, setPage]               = useState(1)
  const [total, setTotal]             = useState(0)
  const [sortField, setSortField]     = useState<'score' | 'created_at'>('created_at')
  const [sortDir, setSortDir]         = useState<'desc' | 'asc'>('desc')
  const [error, setError]             = useState('')

  // Step 1 — load questionnaire list to get IDs
  useEffect(() => {
    async function loadQuestionnaires() {
      setInitLoading(true)
      try {
        const res  = await apiClient.get('/admin/questionnaires')
        const data = unwrap<Record<string, unknown>>(res.data)
        let list: Questionnaire[] = []
        if (Array.isArray(data)) {
          list = data as Questionnaire[]
        } else if (data && typeof data === 'object') {
          const d = data as Record<string, unknown>
          // Try every common paginated / plain-list key
          const candidates = [
            d.questionnaires, d.data, d.results, d.content,
            d.items, d.list, d.rows, d.records,
          ]
          for (const c of candidates) {
            if (Array.isArray(c) && c.length > 0) { list = c as Questionnaire[]; break }
          }
        }
        setQs(list)
        if (list.length > 0) setActiveQId(list[0].id ?? (list[0] as Record<string, unknown>).questionnaire_id as number)
        else {
          setError('No questionnaires found. Please check the API response.')
          setInitLoading(false)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        setError(`Could not load questionnaire list: ${msg}`)
        setInitLoading(false)
      }
    }
    loadQuestionnaires()
  }, [])

  // Step 2 — load summaries for active questionnaire
  useEffect(() => {
    if (activeQId == null) return
    async function loadSummaries() {
      setLoading(true)
      setError('')
      try {
        const res  = await apiClient.get(`/admin/questionnaires/${activeQId}/summaries?page=${page}&size=${PAGE_SIZE}`)
        const d    = unwrap<SummaryResponse>(res.data)
        const list = d?.data ?? d?.summaries ?? d?.results ?? []
        setRows(Array.isArray(list) ? list : [])
        setTotal(
          d?.pagination?.total ?? d?.pagination?.total_elements ?? d?.pagination?.totalElements ??
          d?.total ?? (Array.isArray(list) ? list.length : 0)
        )
      } catch {
        setRows([]); setTotal(0)
        setError('Failed to load quiz responses.')
      } finally {
        setLoading(false)
        setInitLoading(false)
      }
    }
    loadSummaries()
  }, [activeQId, page])

  // ── Client-side filter + sort ───────────────────────────────────────────────
  const filtered = rows
    .filter(r => {
      const q = search.toLowerCase()
      const matchSearch = !q || (r.email ?? '').toLowerCase().includes(q) || displayName(r).toLowerCase().includes(q) || (r.occupation ?? '').toLowerCase().includes(q)
      const matchLevel  = levelFilter === 'ALL' || ratingLevel(r).toUpperCase() === levelFilter
      return matchSearch && matchLevel
    })
    .sort((a, b) => {
      if (sortField === 'score') return sortDir === 'desc' ? b.score - a.score : a.score - b.score
      const da = new Date(a.created_at ?? a.createdAt ?? 0).getTime()
      const db = new Date(b.created_at ?? b.createdAt ?? 0).getTime()
      return sortDir === 'desc' ? db - da : da - db
    })

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortField(field); setSortDir('desc') }
  }
  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? sortDir === 'desc' ? <ArrowDown01Icon size={12} color="#4b5563" strokeWidth={2} /> : <ArrowUp01Icon size={12} color="#4b5563" strokeWidth={2} />
      : null

  const advanced     = rows.filter(r => ratingLevel(r).toUpperCase() === 'ADVANCED').length
  const intermediate = rows.filter(r => ratingLevel(r).toUpperCase() === 'INTERMEDIATE').length
  const beginner     = rows.filter(r => ratingLevel(r).toUpperCase() === 'BEGINNER').length
  const avgScore     = rows.length ? Math.round(rows.reduce((s, r) => s + (r.score ?? 0), 0) / rows.length) : 0

  return (
    <div className="p-8">
      {initLoading && <AdminPageLoader />}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-[32px]">AI Readiness Polls</h1>
            <p className="text-[14px] text-[#4b5563] font-body mt-0.5">Results from the AI readiness quiz on brixgate.com</p>
          </div>
          {/* Questionnaire selector (if there are multiple) */}
          {questionnaires.length > 1 && (
            <select
              value={activeQId ?? ''}
              onChange={e => { setActiveQId(Number(e.target.value)); setPage(1) }}
              className="h-9 pl-3 pr-8 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body text-[#374151] outline-none focus:border-[#d51520] bg-white"
            >
              {questionnaires.map(q => (
                <option key={q.id} value={q.id}>{q.title ?? q.name ?? `Quiz #${q.id}`}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error state */}
      {error && !initLoading && (
        <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] px-5 py-4 mb-6">
          <p className="text-[13px] font-medium text-[#d51520] font-body">{error}</p>
        </div>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Responses', value: total,        sub: 'quiz completions',  accent: '#7c3aed', tint: '#f5f3ff' },
          { label: 'Advanced',        value: advanced,     sub: 'AI Practitioner+',  accent: '#027a48', tint: '#ecfdf3' },
          { label: 'Intermediate',    value: intermediate, sub: 'AI Aware',          accent: '#b45309', tint: '#fffaeb' },
          { label: 'Beginner',        value: beginner,     sub: 'needs development', accent: '#d51520', tint: '#fef2f2' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display mb-3">{s.label}</p>
            {loading
              ? <div className="h-8 w-16 bg-[#f3f4f6] rounded animate-pulse" />
              : <p className="text-[30px] font-bold leading-none font-display text-[#101828]">{s.value.toLocaleString()}</p>}
            <p className="mt-1 text-[12px] text-[#98a2b3] font-body">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Average score banner */}
      {!loading && rows.length > 0 && (
        <div className="bg-[#fef2f2] border border-[#fecdca] rounded-[10px] px-6 py-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#d51520] flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-[16px] font-display">{avgScore}%</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#111827] font-display">Average AI Readiness Score: {avgScore}%</p>
            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
              Across {rows.length.toLocaleString()} response{rows.length !== 1 ? 's' : ''} loaded on this page
            </p>
          </div>
        </div>
      )}

      {/* Table card */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        {/* Filters */}
        <div className="px-5 py-4 border-b border-[#f3f4f6] flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search01Icon className="absolute left-3.5 top-1/2 -translate-y-1/2" size={15} color="#4b5563" strokeWidth={1.5} />
            <input type="text" placeholder="Search by name, email, or occupation…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full h-[38px] pl-9 pr-3.5 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#111827] placeholder:text-[#4b5563] focus:outline-none focus:border-[#d51520]/40 focus:ring-2 focus:ring-[#d51520]/10" />
          </div>
          <select value={levelFilter} onChange={e => setLevel(e.target.value)}
            className="h-[38px] pl-3 pr-8 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body text-[#374151] bg-white outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 min-w-[140px]">
            <option value="ALL">All Levels</option>
            <option value="ADVANCED">Advanced</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="BEGINNER">Beginner</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-[#4b5563]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[13px] font-body">Loading responses…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">No results found</p>
            <p className="text-[13px] text-[#4b5563] font-body">
              {rows.length === 0 ? 'No quiz responses have been submitted yet.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                    {['Name', 'Email', 'Occupation', 'Level'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display">{h}</th>
                    ))}
                    <th className="text-right px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display cursor-pointer hover:text-[#374151] select-none" onClick={() => toggleSort('score')}>
                      <span className="inline-flex items-center gap-1 justify-end">Score <SortIcon field="score" /></span>
                    </th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#98a2b3] font-display cursor-pointer hover:text-[#374151] select-none" onClick={() => toggleSort('created_at')}>
                      <span className="inline-flex items-center gap-1">Date <SortIcon field="created_at" /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} className="border-b border-[#f3f4f6] last:border-0 hover:bg-[#f9fafb] transition-colors">
                      <td className="px-5 py-3.5 text-[13px] font-medium text-[#111827] font-body">{displayName(r)}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#374151] font-body">{r.email}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#4b5563] font-body">{r.occupation ?? '—'}</td>
                      <td className="px-5 py-3.5"><LevelBadge level={ratingLevel(r)} /></td>
                      <td className="px-5 py-3.5 text-right text-[13px] font-semibold text-[#111827] font-display">{r.score != null ? `${r.score}%` : '—'}</td>
                      <td className="px-5 py-3.5 text-[13px] text-[#4b5563] font-body whitespace-nowrap">{createdAt(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-[#f3f4f6] flex items-center justify-between">
              <p className="text-[12px] text-[#4b5563] font-body">
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()} responses
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="h-8 px-3 border border-[#e5e7eb] rounded-[6px] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] disabled:opacity-40 transition-colors">
                  Previous
                </button>
                <span className="text-[12px] text-[#4b5563] font-body px-1">Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page * PAGE_SIZE >= total}
                  className="h-8 px-3 border border-[#e5e7eb] rounded-[6px] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f9fafb] disabled:opacity-40 transition-colors">
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
