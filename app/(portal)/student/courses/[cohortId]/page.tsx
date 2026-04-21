'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import {
  MOCK_ENROLLMENTS,
  MOCK_INSTRUCTOR,
  getSyllabus,
} from '@/lib/mock-data'
import type { SyllabusTopic, SyllabusModule } from '@/lib/types'
import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
  Download01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  FolderZipIcon,
  FileEditIcon,
  BookOpen01Icon,
  NoteEditIcon,
  StarIcon,
  LockIcon,
} from 'hugeicons-react'
import { cn } from '@/lib/utils'

// ── Topic type config ─────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  'Reading':         { color: '#0ea5e9', bg: '#f0f9ff' },
  'Video & Resource':{ color: '#7c3aed', bg: '#f5f3ff' },
  'Assignment':      { color: '#d97706', bg: '#fffbeb' },
  'Quiz':            { color: '#16a34a', bg: '#ecfdf3' },
}

// ── File icon map ─────────────────────────────────────────────────────────────
const FILE_ICONS: Record<string, React.ElementType> = {
  pdf:  File01Icon,
  pptx: PresentationBarChart01Icon,
  zip:  FolderZipIcon,
  docx: FileEditIcon,
}
const FILE_COLOURS: Record<string, { bg: string; text: string }> = {
  pdf:  { bg: '#fef2f2', text: '#d51520' },
  pptx: { bg: '#fff7ed', text: '#ea580c' },
  zip:  { bg: '#f0f9ff', text: '#0ea5e9' },
  docx: { bg: '#f0fdf4', text: '#16a34a' },
}

// ── Render markdown-lite notes ────────────────────────────────────────────────
function renderNotes(text: string) {
  if (!text) return null
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-[16px] font-semibold text-[#111827] font-display mt-6 mb-2">
          {line.replace('### ', '')}
        </h3>
      )
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-[20px] font-bold text-[#111827] font-display mb-3">
          {line.replace('## ', '')}
        </h2>
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={i} className="text-[14px] font-semibold text-[#374151] font-body mb-1">
          {line.replace(/\*\*/g, '')}
        </p>
      )
    } else if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].replace('- ', ''))
        i++
      }
      elements.push(
        <ul key={`ul-${i}`} className="list-none space-y-1.5 mb-4 pl-0">
          {items.map((item, j) => (
            <li key={j} className="flex items-start gap-2 text-[15px] text-[#374151] font-body leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#d51520] flex-shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>') }} />
            </li>
          ))}
        </ul>
      )
      continue
    } else if (line === '') {
      // skip blank lines between elements
    } else {
      elements.push(
        <p key={i} className="text-[15px] text-[#374151] font-body leading-[1.7] mb-3"
          dangerouslySetInnerHTML={{
            __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'),
          }}
        />
      )
    }
    i++
  }
  return elements
}

// ── Star rating ───────────────────────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon
          key={i}
          size={13}
          color={i <= Math.floor(rating) ? '#f59e0b' : '#e5e7eb'}
          strokeWidth={1.5}
        />
      ))}
      <span className="text-[12px] font-semibold text-[#374151] font-body ml-1">{rating}</span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const cohortId = params.cohortId as string

  const enrollment = MOCK_ENROLLMENTS.find((e) => e.cohortId === cohortId)
  const syllabus = getSyllabus(cohortId)

  // Flatten all topics for navigation
  const allTopics: SyllabusTopic[] = syllabus?.modules.flatMap((m) => m.topics) ?? []

  // Default to first active or first topic
  const defaultTopic =
    allTopics.find((t) => t.status === 'active') ?? allTopics[0]

  const [selectedTopicId, setSelectedTopicId] = useState(defaultTopic?.id ?? '')
  const [activeTab, setActiveTab] = useState<'overview' | 'resources'>('overview')
  const [completedIds, setCompletedIds] = useState<Set<string>>(
    new Set(allTopics.filter((t) => t.status === 'completed').map((t) => t.id))
  )

  const contentRef = useRef<HTMLDivElement>(null)

  // Scroll to top when topic changes
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setActiveTab('overview')
  }, [selectedTopicId])

  if (!enrollment || !syllabus) {
    return (
      <>
        <TopNav title="Course" />
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <p className="text-[14px] text-[#9ca3af] font-body">Course not found.</p>
          <button
            onClick={() => router.push('/student/programs')}
            className="mt-4 text-[13px] text-[#d51520] font-medium hover:underline"
          >
            Back to My Programs
          </button>
        </div>
      </>
    )
  }

  const cohort = enrollment.cohort
  const program = cohort.program
  const instructor = MOCK_INSTRUCTOR

  const selectedTopic = allTopics.find((t) => t.id === selectedTopicId)
  const isCompleted = completedIds.has(selectedTopicId)
  const hasResources = (selectedTopic?.resources?.length ?? 0) > 0

  function markCompleted() {
    setCompletedIds((prev) => {
      const next = new Set(prev)
      next.add(selectedTopicId)
      return next
    })
    // Auto-advance to next unlocked topic
    const currentIdx = allTopics.findIndex((t) => t.id === selectedTopicId)
    const nextTopic = allTopics[currentIdx + 1]
    if (nextTopic) setSelectedTopicId(nextTopic.id)
  }

  function getTopicStatus(topic: SyllabusTopic): 'completed' | 'active' | 'locked' {
    if (completedIds.has(topic.id)) return 'completed'
    if (topic.id === selectedTopicId) return 'active'
    return topic.status === 'locked' ? 'locked' : topic.status
  }

  return (
    <>
      <TopNav
        title={program.title}
        breadcrumbs={['My Programs']}
      />

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">

        {/* ── LEFT SIDEBAR: Syllabus ── */}
        <aside className="w-[280px] flex-shrink-0 bg-white border-l-4 border-l-[#f7f8fa] border-r border-r-[#f3f4f6] flex flex-col h-full">
          {/* Sidebar header */}
          <div className="px-5 py-5 border-b border-[#f3f4f6] flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[#111827] font-display leading-snug line-clamp-2">
                {program.title}
              </p>
              <p className="text-[12px] text-[#9ca3af] font-body mt-1 truncate">
                {cohort.name.split('—')[1]?.trim() ?? cohort.name}
              </p>
            </div>
            <button
              onClick={() => router.push('/student/programs')}
              className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors mt-0.5"
              aria-label="Back to programs"
            >
              <ArrowLeft01Icon size={15} color="#6b7280" strokeWidth={1.5} />
            </button>
          </div>

          {/* Module/topic list */}
          <div className="flex-1 overflow-y-auto py-2">
            {syllabus.modules.map((mod: SyllabusModule) => (
              <div key={mod.id} className="mb-2">
                {/* Module heading */}
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[12px] font-bold text-[#374151] font-display leading-snug uppercase tracking-wide">
                    Module {mod.moduleNumber}: {mod.title}
                  </p>
                </div>

                {/* Topics */}
                {mod.topics.map((topic) => {
                  const status = getTopicStatus(topic)
                  const isSelected = topic.id === selectedTopicId
                  const typeCfg = TYPE_CONFIG[topic.type] ?? TYPE_CONFIG['Reading']

                  // A topic is truly unavailable only if no content AND no resources
                  const hasContent = !!(topic.notes?.trim()) || (topic.resources?.length ?? 0) > 0
                  const isUnavailable = !hasContent

                  return (
                    <button
                      key={topic.id}
                      onClick={() => {
                        if (!isUnavailable) setSelectedTopicId(topic.id)
                      }}
                      disabled={isUnavailable}
                      title={isUnavailable ? 'Content not yet uploaded by instructor' : undefined}
                      className={cn(
                        'w-full flex items-center gap-3 px-5 py-3 text-left transition-colors',
                        isSelected
                          ? 'bg-[#fef2f2]'
                          : isUnavailable
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-[#f9fafb] cursor-pointer'
                      )}
                    >
                      {/* Status dot */}
                      <div className="flex-shrink-0 mt-0.5">
                        {status === 'completed' ? (
                          <div className="w-[18px] h-[18px] rounded-full bg-[#d51520] flex items-center justify-center">
                            <CheckmarkCircle01Icon size={11} color="white" strokeWidth={2.5} />
                          </div>
                        ) : isUnavailable ? (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-[#e5e7eb] flex items-center justify-center">
                            <LockIcon size={9} color="#9ca3af" strokeWidth={2} />
                          </div>
                        ) : isSelected ? (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-[#d51520] bg-white" />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-[#d0d5dd] bg-white" />
                        )}
                      </div>

                      {/* Title + type */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-[13px] leading-snug',
                            isSelected
                              ? 'font-semibold text-[#111827] font-display'
                              : 'font-medium text-[#374151] font-body'
                          )}
                        >
                          {topic.title}
                        </p>
                        <p className="text-[12px] font-body mt-0.5" style={{ color: typeCfg.color }}>
                          {topic.type}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* ── RIGHT: Content area ── */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7]">
          <div className="flex-1 overflow-y-auto" ref={contentRef}>
            <div className="mx-6 mt-6 mb-0">

              {/* Course meta bar */}
              <div className="bg-white rounded-t-[10px] border border-[#f3f4f6] px-6 py-4 flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1a1d2e] flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-white font-display">
                      {instructor.user.firstName[0]}{instructor.user.lastName[0]}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] text-[#9ca3af] font-body">Instructor</p>
                    <p className="text-[13px] font-semibold text-[#374151] font-display truncate">
                      {instructor.user.firstName} {instructor.user.lastName}
                    </p>
                  </div>
                </div>

                <div className="w-px h-8 bg-[#f3f4f6]" />

                <div>
                  <p className="text-[12px] text-[#9ca3af] font-body">Cohort</p>
                  <p className="text-[13px] font-semibold text-[#374151] font-display">
                    {cohort.name.split('—')[1]?.trim() ?? cohort.name}
                  </p>
                </div>

                <div className="w-px h-8 bg-[#f3f4f6]" />

                <div>
                  <p className="text-[12px] text-[#9ca3af] font-body">Rating</p>
                  <StarRating rating={syllabus.rating} />
                </div>

                <div className="w-px h-8 bg-[#f3f4f6]" />

                <div>
                  <p className="text-[12px] text-[#9ca3af] font-body">Progress</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-[80px] h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d51520] rounded-full transition-all duration-500"
                        style={{ width: `${enrollment.progress}%` }}
                      />
                    </div>
                    <span className="text-[13px] font-semibold text-[#374151] font-body">
                      {enrollment.progress}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white border-x border-[#f3f4f6] border-b border-b-[#f3f4f6] flex px-6">
                {(['overview', 'resources'] as const).map((tab) => {
                  const label = tab === 'overview' ? 'Lesson Overview' : 'Resources'
                  const isActive = activeTab === tab
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="flex flex-col items-center mr-6"
                    >
                      <span
                        className={cn(
                          'py-3.5 text-[14px] font-display transition-colors',
                          isActive
                            ? 'font-semibold text-[#d51520]'
                            : 'font-normal text-[#6b7280] hover:text-[#374151]'
                        )}
                      >
                        {label}
                      </span>
                      <div
                        className={cn(
                          'h-[2px] w-full rounded-t-full',
                          isActive ? 'bg-[#d51520]' : 'bg-transparent'
                        )}
                      />
                    </button>
                  )
                })}
              </div>

              {/* Content body */}
              <div className="bg-white border border-t-0 border-[#f3f4f6] rounded-b-[10px] min-h-[400px] px-8 py-7 mb-[80px]">
                {activeTab === 'overview' ? (
                  <>
                    {selectedTopic?.notes ? (
                      <div className="max-w-[720px]">
                        {renderNotes(selectedTopic.notes)}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                          <NoteEditIcon size={24} color="#9ca3af" strokeWidth={1.5} />
                        </div>
                        <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">
                          No notes yet
                        </p>
                        <p className="text-[13px] text-[#9ca3af] font-body max-w-[260px]">
                          Notes for this lesson will appear here once available.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {hasResources ? (
                      <div className="flex flex-col gap-3 max-w-[600px]">
                        {selectedTopic?.resources?.map((resource) => {
                          const FileIcon = FILE_ICONS[resource.fileType] ?? File01Icon
                          const colours = FILE_COLOURS[resource.fileType] ?? { bg: '#f7f8fa', text: '#6b7280' }
                          return (
                            <div
                              key={resource.id}
                              className="flex items-center gap-4 p-4 border border-[#f3f4f6] rounded-[10px] hover:bg-[#f9fafb] transition-colors group"
                            >
                              <div
                                className="w-10 h-10 rounded-[8px] flex items-center justify-center flex-shrink-0"
                                style={{ background: colours.bg }}
                              >
                                <FileIcon size={18} color={colours.text} strokeWidth={1.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-[#111827] font-display truncate">
                                  {resource.title}
                                </p>
                                <p className="text-[11px] text-[#9ca3af] font-body mt-0.5">
                                  {resource.fileType.toUpperCase()} · {resource.fileSize}
                                </p>
                              </div>
                              <a
                                href={resource.downloadUrl}
                                className="flex items-center gap-1.5 text-[12px] font-medium font-display text-[#374151] border border-[#e5e7eb] px-3 py-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
                              >
                                <Download01Icon size={13} color="#374151" strokeWidth={1.5} />
                                Download
                              </a>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
                          <BookOpen01Icon size={24} color="#9ca3af" strokeWidth={1.5} />
                        </div>
                        <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">
                          No resources for this lesson
                        </p>
                        <p className="text-[13px] text-[#9ca3af] font-body max-w-[260px]">
                          Resources will be uploaded here when available.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Sticky bottom action bar ── */}
          <div className="flex-shrink-0 border-t border-[#f3f4f6] bg-white px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {hasResources && (
                <button
                  onClick={() => setActiveTab('resources')}
                  className="inline-flex items-center gap-2 border border-[#e5e7eb] text-[#374151] text-[13px] font-medium font-display px-5 py-2.5 rounded-[8px] hover:bg-[#f9fafb] transition-colors"
                >
                  <Download01Icon size={14} color="#374151" strokeWidth={1.5} />
                  Download Resource
                </button>
              )}
            </div>
            <button
              onClick={markCompleted}
              disabled={isCompleted}
              className={cn(
                'inline-flex items-center gap-2 text-[13px] font-medium font-display px-6 py-2.5 rounded-[8px] transition-colors',
                isCompleted
                  ? 'bg-[#ecfdf3] text-[#16a34a] border border-[#bbf7d0] cursor-default'
                  : 'bg-[#d51520] text-white hover:bg-[#b81119]'
              )}
            >
              {isCompleted ? (
                <>
                  <CheckmarkCircle01Icon size={14} color="#16a34a" strokeWidth={2} />
                  Completed
                </>
              ) : (
                'Mark as Completed'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
