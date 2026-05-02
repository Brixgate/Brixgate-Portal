'use client'

import { useState, useEffect } from 'react'
import TopNav from '@/components/layout/TopNav'
import type { Resource, ResourceFileType } from '@/lib/types'
import {
  Download01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  FolderZipIcon,
  FileEditIcon,
  BookOpen01Icon,
  Loading01Icon,
} from 'hugeicons-react'
import EmptyState from '@/components/shared/EmptyState'
import { cn } from '@/lib/utils'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

const FILTER_CHIPS = ['All', 'PDF', 'Slides', 'Zip', 'Doc']

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:  File01Icon,
  pptx: PresentationBarChart01Icon,
  zip:  FolderZipIcon,
  docx: FileEditIcon,
}

const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#FEF2F2', text: '#D51520' },
  pptx: { bg: '#FFF7ED', text: '#EA580C' },
  zip:  { bg: '#F0F9FF', text: '#0EA5E9' },
  docx: { bg: '#F0FDF4', text: '#16A34A' },
}

// ── API shape ─────────────────────────────────────────────────────────────────
interface ApiResource {
  id: number | string
  title?: string
  name?: string
  type?: string           // e.g. "PDF", "SLIDES", "ZIP", "DOC"
  file_type?: string      // e.g. "pdf", "pptx"
  file_size?: string
  size?: string
  week?: number
  week_number?: number
  module?: string
  week_title?: string
  uploaded_at?: string
  created_at?: string
  uploaded_by?: string
  instructor?: string
  download_url?: string
  url?: string
  cohort_id?: number | string
}

function inferFileType(raw: ApiResource): ResourceFileType {
  const t = (raw.type ?? raw.file_type ?? '').toLowerCase()
  if (t.includes('ppt') || t.includes('slide')) return 'pptx'
  if (t.includes('zip'))  return 'zip'
  if (t.includes('doc'))  return 'docx'
  if (t.includes('mp4') || t.includes('video') || t.includes('record')) return 'mp4'
  return 'pdf'
}

function normaliseResource(raw: ApiResource): Resource {
  return {
    id: String(raw.id),
    cohortId: String(raw.cohort_id ?? ''),
    title: raw.title ?? raw.name ?? 'Untitled Resource',
    fileName: raw.title ?? raw.name ?? 'file',
    fileType: inferFileType(raw),
    fileSize: raw.file_size ?? raw.size ?? '',
    weekNumber: raw.week_number ?? raw.week ?? 0,
    weekTitle: raw.week_title ?? raw.module ?? '',
    uploadedAt: raw.uploaded_at ?? raw.created_at ?? '',
    uploadedBy: raw.uploaded_by ?? raw.instructor ?? '',
    downloadUrl: raw.download_url ?? raw.url ?? '#',
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isNew(uploadedAt: string): boolean {
  if (!uploadedAt) return false
  const uploaded = new Date(uploadedAt)
  const now = new Date()
  const diffDays = (now.getTime() - uploaded.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays <= 7
}

function filterResources(resources: Resource[], filter: string): Resource[] {
  if (filter === 'All') return resources
  const map: Record<string, string> = { PDF: 'pdf', Slides: 'pptx', Zip: 'zip', Doc: 'docx' }
  return resources.filter((r) => r.fileType === map[filter])
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

// ── Row ───────────────────────────────────────────────────────────────────────
function ResourceRow({ resource }: { resource: Resource }) {
  const FileIcon = FILE_ICONS[resource.fileType] ?? File01Icon
  const colours = FILE_COLOURS[resource.fileType] ?? { bg: '#F7F8FA', text: '#6b7280' }
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
        <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
          {resource.fileType.toUpperCase()}
          {resource.fileSize ? ` · ${resource.fileSize}` : ''}
          {uploadedDate ? ` · Uploaded ${uploadedDate}` : ''}
          {resource.uploadedBy ? ` by ${resource.uploadedBy}` : ''}
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => {
    async function load() {
      try {
        const res = await apiClient.get('/users/me/resources')
        const data = unwrap<ApiResource[]>(res.data)
        const rows = (Array.isArray(data) ? data : []).map(normaliseResource)
        setResources(rows)
      } catch (err) {
        setError(getApiError(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = filterResources(resources, activeFilter)
  const byWeek = groupByWeek(filtered)
  const weekNumbers = Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  return (
    <>
      <TopNav title="Resources" />

      <div className="px-4 md:px-8 pb-10">
        {/* Page header */}
        <div className="pt-7 pb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">
              Resources
            </h1>
            <p className="text-[14px] text-[#6b7280] font-body mt-1">
              Session slides, guides, and materials for your cohort.
            </p>
          </div>
          {!loading && !error && (
            <p className="text-[13px] text-[#9ca3af] font-body pt-1">
              {resources.length} file{resources.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-2 text-[#9ca3af]">
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

        {/* Empty — no resources at all */}
        {!loading && !error && resources.length === 0 && (
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)]">
            <EmptyState
              icon={BookOpen01Icon}
              title="No resources yet"
              description="Your instructor hasn't uploaded any resources yet. Check back after your next session."
            />
          </div>
        )}

        {/* Content */}
        {!loading && !error && resources.length > 0 && (
          <>
            {/* Filter chips */}
            <div className="flex items-center gap-2 mb-6">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => setActiveFilter(chip)}
                  className={cn(
                    'px-4 h-8 rounded-full text-[13px] font-medium transition-colors',
                    activeFilter === chip
                      ? 'bg-[#d51520] text-white font-display'
                      : 'bg-white border border-[#e5e7eb] text-[#6b7280] font-body hover:bg-[#f9fafb]'
                  )}
                >
                  {chip}
                </button>
              ))}
            </div>

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
                            <p className="text-[12px] text-[#9ca3af] font-body mt-0.5">{title}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#9ca3af] font-body">
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
