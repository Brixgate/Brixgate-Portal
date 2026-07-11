'use client'

import { useState, useEffect, useCallback } from 'react'
import TopNav from '@/components/layout/TopNav'
import type { Resource, ResourceFileType } from '@/lib/types'
import {
  Download01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  FileEditIcon,
  Video01Icon,
  BookOpen01Icon,
  Loading01Icon,
  ArrowDown01Icon,
  CheckmarkCircle01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Filter chips ──────────────────────────────────────────────────────────────
const FILTER_CHIPS: { label: string; apiType: string | null }[] = [
  { label: 'All',    apiType: null           },
  { label: 'PDF',    apiType: 'PDF'          },
  { label: 'Slides', apiType: 'PRESENTATION' },
  { label: 'Video',  apiType: 'VIDEO'        },
  { label: 'Doc',    apiType: 'ARTICLE'      },
]

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:  File01Icon,
  pptx: PresentationBarChart01Icon,
  docx: FileEditIcon,
  mp4:  Video01Icon,
}
const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#FEF2F2', text: '#D51520' },
  pptx: { bg: '#FFF7ED', text: '#EA580C' },
  docx: { bg: '#F0FDF4', text: '#16A34A' },
  mp4:  { bg: '#F5F3FF', text: '#7C3AED' },
}

// ── API shapes ────────────────────────────────────────────────────────────────
interface ApiResource {
  id: number
  title?: string
  type?: string
  link?: string
  status?: string
  createdAt?: string
  programModuleId?: number
}
interface ApiResourcesResponse {
  resources: ApiResource[]
}

// ── Cohort option (built from /users/me/programs) ─────────────────────────────
interface CohortOption {
  cohortId: number
  label: string        // e.g. "AI in Software Engineering"
  cohortLabel: string  // e.g. "Cohort 3"
}

// ── Defensive field readers ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortId(c: any): number    { return c?.cohortId    ?? c?.cohort_id    ?? 0  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCohortTitle(c: any): string { return c?.cohortTitle ?? c?.cohort_title ?? '' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readMyCohorts(p: any): any[]    { return p?.myCohorts   ?? p?.my_cohorts   ?? [] }

// ── Normalise API resource → internal Resource shape ─────────────────────────
function inferFileType(type: string): ResourceFileType {
  const t = type.toUpperCase()
  if (t === 'PDF')                       return 'pdf'
  if (t === 'PRESENTATION')              return 'pptx'
  if (t === 'VIDEO' || t === 'LECTURE')  return 'mp4'
  if (t === 'ARTICLE')                   return 'docx'
  return 'pdf'
}

function normaliseResource(raw: ApiResource): Resource {
  return {
    id:          String(raw.id),
    cohortId:    '',
    title:       raw.title ?? 'Untitled Resource',
    fileName:    raw.title ?? 'file',
    fileType:    inferFileType(raw.type ?? ''),
    fileSize:    '',
    weekNumber:  raw.programModuleId ?? 0,
    weekTitle:   '',
    uploadedAt:  raw.createdAt ?? '',
    uploadedBy:  '',
    downloadUrl: raw.link ?? '#',
  }
}

function isNew(uploadedAt: string): boolean {
  if (!uploadedAt) return false
  return (Date.now() - new Date(uploadedAt).getTime()) / (1000 * 60 * 60 * 24) <= 7
}

function groupByWeek(resources: Resource[]): Record<number, { title: string; items: Resource[] }> {
  const out: Record<number, { title: string; items: Resource[] }> = {}
  for (const r of resources) {
    const week = r.weekNumber ?? 0
    if (!out[week]) out[week] = { title: r.weekTitle ?? `Week ${week}`, items: [] }
    out[week].items.push(r)
  }
  return out
}

// ── Resource row ──────────────────────────────────────────────────────────────
function ResourceRow({ resource }: { resource: Resource }) {
  const FileIcon     = FILE_ICONS[resource.fileType] ?? File01Icon
  const colours      = FILE_COLOURS[resource.fileType] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const uploadedDate = resource.uploadedAt
    ? new Date(resource.uploadedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="flex items-center gap-4 py-3.5 px-5 hover:bg-[#f9fafb] transition-colors rounded-[8px] group">
      <div
        className="w-9 h-9 rounded-[8px] flex items-center justify-center flex-shrink-0"
        style={{ background: colours.bg }}
      >
        <FileIcon size={16} color={colours.text} strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13px] font-medium text-[#111827] font-body leading-snug truncate">
            {resource.title}
          </p>
          {isNew(resource.uploadedAt) && (
            <span className="text-[9px] font-semibold uppercase tracking-wide bg-[#fef2f2] text-[#d51520] px-1.5 py-0.5 rounded-[4px] flex-shrink-0 font-display">
              New
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
          {resource.fileType.toUpperCase()}
          {uploadedDate ? ` · Uploaded ${uploadedDate}` : ''}
        </p>
      </div>

      <a
        href={resource.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
        aria-label={`Download ${resource.title}`}
      >
        <Download01Icon size={13} color="#374151" strokeWidth={1.5} />
        Download
      </a>
    </div>
  )
}

// ── Cohort switcher dropdown ──────────────────────────────────────────────────
function CohortSwitcher({
  cohorts,
  selected,
  onChange,
}: {
  cohorts: CohortOption[]
  selected: CohortOption
  onChange: (c: CohortOption) => void
}) {
  const [open, setOpen] = useState(false)

  if (cohorts.length <= 1) return null   // only show if enrolled in 2+ cohorts

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-[38px] pl-3.5 pr-3 bg-white border border-[#e5e7eb] rounded-[8px] hover:bg-[#f9fafb] transition-colors"
      >
        <div className="text-left">
          <p className="text-[12px] font-semibold text-[#111827] font-display leading-none">
            {selected.label}
          </p>
          {selected.cohortLabel && (
            <p className="text-[10px] text-[#4b5563] font-body mt-0.5 leading-none">
              {selected.cohortLabel}
            </p>
          )}
        </div>
        <ArrowDown01Icon
          size={13}
          color="#4b5563"
          strokeWidth={1.5}
          className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Menu */}
          <div className="absolute right-0 top-[calc(100%+6px)] z-50 bg-white rounded-[10px] shadow-[0px_8px_24px_rgba(16,24,40,0.12)] border border-[#f3f4f6] min-w-[240px] py-1.5 overflow-hidden">
            {cohorts.map((c) => {
              const isSelected = c.cohortId === selected.cohortId
              return (
                <button
                  key={c.cohortId}
                  onClick={() => { onChange(c); setOpen(false) }}
                  className={`w-full text-left flex items-center justify-between gap-3 px-4 py-2.5 transition-colors ${
                    isSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <div>
                    <p className={`text-[13px] font-medium font-display leading-snug ${
                      isSelected ? 'text-[#d51520]' : 'text-[#111827]'
                    }`}>
                      {c.label}
                    </p>
                    {c.cohortLabel && (
                      <p className="text-[11px] text-[#4b5563] font-body mt-0.5">{c.cohortLabel}</p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckmarkCircle01Icon size={15} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const [cohorts, setCohorts]           = useState<CohortOption[]>([])
  const [selected, setSelected]         = useState<CohortOption | null>(null)
  const [resources, setResources]       = useState<Resource[]>([])
  const [totalCount, setTotalCount]     = useState(0)
  const [loading, setLoading]           = useState(true)
  const [filtering, setFiltering]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('All')

  // Step 1 — resolve all enrolled cohorts on mount
  useEffect(() => {
    async function resolveCohorts() {
      try {
        const res  = await apiClient.get('/users/me/programs')
        const data = unwrap<{ programs: unknown[] }>(res.data)
        const programs = Array.isArray(data?.programs) ? data.programs : []

        const options: CohortOption[] = []
        for (const prog of programs) {
          const title   = (prog as Record<string, unknown>)?.['title'] as string ?? 'Programme'
          const cohorts = readMyCohorts(prog)
          for (const c of cohorts) {
            const cId = readCohortId(c)
            if (!cId) continue
            const rawTitle  = readCohortTitle(c)
            const cohortLbl = rawTitle
              .replace(`${title} — `, '')
              .replace(`${title} - `, '')
              || rawTitle
            options.push({ cohortId: cId, label: title, cohortLabel: cohortLbl })
          }
        }

        setCohorts(options)
        if (options.length > 0) setSelected(options[0])
        else setLoading(false)
      } catch (err) {
        setError(getApiError(err))
        setLoading(false)
      }
    }
    resolveCohorts()
  }, [])

  // Step 2 — fetch resources whenever selected cohort or filter changes
  const fetchResources = useCallback(async (cohortId: number, apiType: string | null) => {
    const params: Record<string, string> = {}
    if (apiType) params.type = apiType
    const res  = await apiClient.get(`/cohorts/${cohortId}/resources`, { params })
    const data = unwrap<ApiResourcesResponse>(res.data)
    return (Array.isArray(data?.resources) ? data.resources : []).map(normaliseResource)
  }, [])

  useEffect(() => {
    if (!selected) return
    setActiveFilter('All')
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const rows = await fetchResources(selected.cohortId, null)
        setResources(rows)
        setTotalCount(rows.length)
      } catch (err) {
        setError(getApiError(err))
      } finally {
        setLoading(false)
      }
    })()
  }, [selected, fetchResources])

  async function handleFilterChange(label: string, apiType: string | null) {
    if (label === activeFilter || !selected) return
    setActiveFilter(label)
    setFiltering(true)
    try {
      const rows = await fetchResources(selected.cohortId, apiType)
      setResources(rows)
    } catch {
      // keep existing on filter error
    } finally {
      setFiltering(false)
    }
  }

  const byWeek      = groupByWeek(resources)
  const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  return (
    <>
      <TopNav title="Resources" />

      <div className="px-4 md:px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
              Resources
            </h1>
            <p className="text-[14px] text-[#4b5563] font-body mt-1">
              Session slides, guides, and materials for your cohort.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {/* Cohort switcher — only visible when enrolled in 2+ cohorts */}
            {selected && cohorts.length > 1 && (
              <CohortSwitcher
                cohorts={cohorts}
                selected={selected}
                onChange={(c) => setSelected(c)}
              />
            )}
            {!loading && !error && (
              <p className="text-[13px] text-[#4b5563] font-body">
                {totalCount} file{totalCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[#4b5563]">
            <Loading01Icon size={18} className="animate-spin" strokeWidth={1.5} />
            <span className="text-[13px] font-body">Loading resources…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] p-8 text-center">
            <p className="text-[14px] text-[#d51520] font-body">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && totalCount === 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={BookOpen01Icon}
              title="No resources yet"
              description="Your instructor hasn't uploaded any resources for this cohort yet. Check back after your next session."
            />
          </div>
        )}

        {/* Content */}
        {!loading && !error && totalCount > 0 && (
          <>
            {/* Filter chips */}
            <div className="flex items-center gap-2 mb-6 flex-wrap">
              {FILTER_CHIPS.map(({ label, apiType }) => (
                <button
                  key={label}
                  onClick={() => handleFilterChange(label, apiType)}
                  disabled={filtering}
                  className={cn(
                    'px-4 h-8 rounded-full text-[13px] font-medium transition-colors disabled:opacity-60',
                    activeFilter === label
                      ? 'bg-[#d51520] text-white font-display'
                      : 'bg-white border border-[#e5e7eb] text-[#4b5563] font-body hover:bg-[#f9fafb]'
                  )}
                >
                  {label}
                </button>
              ))}
              {filtering && (
                <Loading01Icon size={14} className="animate-spin text-[#4b5563]" strokeWidth={1.5} />
              )}
            </div>

            {/* Filter empty */}
            {weekNumbers.length === 0 ? (
              <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
                <EmptyState
                  icon={File01Icon}
                  title="No files match this filter"
                  description="Try a different filter to see more resources."
                />
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {weekNumbers.map((week) => {
                  const { title, items } = byWeek[week]
                  return (
                    <div
                      key={week}
                      className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden"
                    >
                      <div className="px-5 py-4 flex items-center justify-between border-b border-[#f3f4f6]">
                        <div>
                          <p className="text-[15px] font-semibold text-[#111827] font-display">
                            {week > 0 ? `Week ${week}` : 'General'}
                          </p>
                          {title && title !== `Week ${week}` && (
                            <p className="text-[12px] text-[#4b5563] font-body mt-0.5">{title}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#4b5563] font-body">
                          {items.length} file{items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="p-2">
                        {items.map((resource) => (
                          <ResourceRow key={resource.id} resource={resource} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
