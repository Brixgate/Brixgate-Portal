'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import {
  ArrowLeft01Icon,
  File01Icon,
  PresentationBarChart01Icon,
  Video01Icon,
  FileEditIcon,
  BookOpen01Icon,
  Loading01Icon,
  Time01Icon,
  ArrowRight01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
  Link01Icon,
  Download01Icon,
  UserGroup02Icon,
  StarIcon,
  Cancel01Icon,
  CheckmarkCircle01Icon,
  MessageQuestionIcon,
  AlertCircleIcon,
} from 'hugeicons-react'
import { getApiError } from '@/lib/api-client'
import TeamFeature from '@/components/teams/TeamFeature'

// ── API shapes — programmes (secondary lookup for header) ─────────────────────
interface ApiCohortSummary {
  cohortId?: number
  cohortTitle?: string
}
interface ApiProgram {
  id: number
  title: string
  level?: string
  autoPercentCompletion?: number
  myCohorts?: ApiCohortSummary[]
}
interface ApiProgramsResponse { programs: ApiProgram[] }

// Defensive readers (camelCase per Swagger + snake_case fallback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rc = (c: any): number => c?.cohortId ?? c?.cohort_id ?? 0
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rm = (p: any): any[]  => p?.myCohorts  ?? p?.my_cohorts  ?? []
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readEnrollment(c: any) {
  const e = c?.cohortEnrollment ?? c?.cohort_enrollment ?? null
  if (!e) return null
  return {
    enrollmentType:  (e.enrollmentType ?? e.enrollment_type ?? 'INDIVIDUAL') as string,
    seatsPurchased:  (e.seatsPurchased  ?? e.seats_purchased  ?? 1) as number,
    seatsUsed:       (e.seatsUsed       ?? e.seats_used        ?? 1) as number,
  }
}

// ── API shapes — resources ────────────────────────────────────────────────────
interface ApiResource {
  id: number
  title?: string
  type?: string
  link?: string
  createdAt?: string
  // module association — camelCase (Swagger) and snake_case (actual backend) variants
  moduleId?: number;          module_id?: number
  cohortModuleId?: number;    cohort_module_id?: number
  programModuleId?: number;   program_module_id?: number
}
function resourceModuleId(r: ApiResource): number | undefined {
  return r.moduleId ?? r.module_id ?? r.cohortModuleId ?? r.cohort_module_id ?? r.programModuleId ?? r.program_module_id
}
interface ApiResourcesResponse {
  cohortId?: number
  resources: ApiResource[]
}

// ── API shapes — modules (primary, camelCase per Swagger) ─────────────────────
interface CohortLesson {
  id: number
  title: string
  contentType?: string
  content_type?: string   // snake_case fallback
  contentUrl?: string
  content_url?: string    // snake_case fallback
  duration: number        // minutes
  orderIndex: number
  order_index?: number    // snake_case fallback
  visibilityStatus?: string
  releaseDate?: string
  expiresAt?: string
  createdBy?: string
}
interface CohortModule {
  id: number
  title: string
  description?: string
  module_description?: string  // snake_case fallback
  duration: string        // e.g. "1 Week"
  orderIndex: number
  moduleStatus?: string
  visibilityStatus?: string
  releaseDate?: string
  createdBy?: string
  // link back to the program module — backend may include this on cohort modules
  program_module_id?: number; programModuleId?: number
  lessons: CohortLesson[]
}
interface CohortModulesResponse {
  cohortId: number
  modules: CohortModule[]
}

// ── Review form shapes ────────────────────────────────────────────────────────
interface ReviewOption {
  value: string
  label?: string
  numericScore?: number
}
interface ReviewQuestion {
  id: number
  question_text?: string; questionText?: string
  question_type?: string; questionType?: string
  is_required?: boolean;  isRequired?: boolean
  display_order?: number; displayOrder?: number
  configuration?: { minimum?: number; maximum?: number }
  option_values?: { options?: ReviewOption[] }
  optionValues?:  { options?: ReviewOption[] }
}
interface ReviewForm {
  id: number
  title?: string
  description?: string
  form_stage?: string; formStage?: string
  is_anonymous?: boolean
  status?: string
  available_from?: string; availableFrom?: string
  available_until?: string; availableUntil?: string
  questions?: ReviewQuestion[]
}

// ── Selected item discriminated union ────────────────────────────────────────
type SelectedItem =
  | { kind: 'module'; data: CohortModule; index: number }
  | { kind: 'lesson'; data: CohortLesson; moduleTitle: string; moduleIndex: number; lessonIndex: number }
  | { kind: 'review'; data: ReviewForm }

// ── Unified sidebar entry (modules + review forms merged by form_stage order) ─
type SidebarEntry =
  | { type: 'module'; data: CohortModule; moduleIndex: number; sortKey: number }
  | { type: 'review'; data: ReviewForm; sortKey: number }

// ── Content-type config ───────────────────────────────────────────────────────
const CONTENT_ICONS: Record<string, React.ElementType> = {
  VIDEO:        Video01Icon,
  LECTURE:      Video01Icon,
  PDF:          File01Icon,
  PRESENTATION: PresentationBarChart01Icon,
  ARTICLE:      FileEditIcon,
  IMAGE:        File01Icon,
}
const CONTENT_COLOURS: Record<string, { bg: string; text: string }> = {
  VIDEO:        { bg: '#F5F3FF', text: '#7C3AED' },
  LECTURE:      { bg: '#F5F3FF', text: '#7C3AED' },
  PDF:          { bg: '#FEF2F2', text: '#D51520' },
  PRESENTATION: { bg: '#FFF7ED', text: '#EA580C' },
  ARTICLE:      { bg: '#F0FDF4', text: '#16A34A' },
  IMAGE:        { bg: '#F0F9FF', text: '#0EA5E9' },
}

function formatDuration(mins: number): string {
  if (!mins) return ''
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`
}

// ── Module accordion (left panel row) ────────────────────────────────────────
function ModuleAccordion({
  module, moduleIndex, isExpanded, selectedItem,
  onToggle, onSelectModule, onSelectLesson,
}: {
  module: CohortModule
  moduleIndex: number
  isExpanded: boolean
  selectedItem: SelectedItem | null
  onToggle: () => void
  onSelectModule: () => void
  onSelectLesson: (lesson: CohortLesson, lessonIndex: number) => void
}) {
  const lessonCount = module.lessons?.length ?? 0
  const isModuleSelected = selectedItem?.kind === 'module' && selectedItem.data.id === module.id

  return (
    <div className="border-b border-[#f3f4f6] last:border-b-0">
      {/* Module header row */}
      <button
        onClick={() => { onSelectModule(); onToggle() }}
        className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors ${
          isModuleSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
        }`}
      >
        {/* Module number badge — warm amber hierarchy */}
        <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isModuleSelected ? 'bg-[#D51520]' : moduleIndex % 3 === 1 ? 'bg-[#fffbeb]' : moduleIndex % 3 === 2 ? 'bg-[#fff7ed]' : 'bg-[#fef3c7]'
        }`}>
          <span className={`text-[10px] font-bold font-display ${
            isModuleSelected ? 'text-white' : moduleIndex % 3 === 1 ? 'text-[#b45309]' : moduleIndex % 3 === 2 ? 'text-[#c2410c]' : 'text-[#d97706]'
          }`}>
            {String(moduleIndex).padStart(2, '0')}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-semibold font-display leading-snug ${isModuleSelected ? 'text-[#D51520]' : 'text-[#111827]'}`}>
            {module.title}
          </p>
          <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
            {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
            {module.duration ? ` · ${module.duration}` : ''}
          </p>
        </div>

        <div className="flex-shrink-0 mt-1">
          {isExpanded
            ? <ArrowUp01Icon size={14} color="#4b5563" strokeWidth={1.5} />
            : <ArrowDown01Icon size={14} color="#4b5563" strokeWidth={1.5} />}
        </div>
      </button>

      {/* Lessons */}
      {isExpanded && lessonCount > 0 && (
        <div className="pb-1">
          {[...module.lessons]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((lesson, i) => {
              const type    = ((lesson.contentType ?? lesson.content_type ?? 'PDF')).toUpperCase()
              const Icon    = CONTENT_ICONS[type] ?? File01Icon
              const colours = CONTENT_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
              const isSelected =
                selectedItem?.kind === 'lesson' && selectedItem.data.id === lesson.id

              return (
                <button
                  key={lesson.id}
                  onClick={() => onSelectLesson(lesson, i + 1)}
                  className={`w-full text-left flex items-center gap-3 pl-14 pr-5 py-3 transition-colors ${
                    isSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
                  }`}
                >
                  <div
                    className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
                    style={{ background: isSelected ? colours.text + '20' : colours.bg }}
                  >
                    <Icon size={13} color={colours.text} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-medium font-body leading-snug truncate ${
                      isSelected ? 'text-[#D51520]' : 'text-[#374151]'
                    }`}>
                      {lesson.title}
                    </p>
                    {lesson.duration > 0 && (
                      <p className="text-[10px] text-[#4b5563] font-body mt-0.5">
                        {formatDuration(lesson.duration)}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ── Review form sidebar entry ─────────────────────────────────────────────────
function ReviewFormSidebarItem({
  form, isSelected, onClick, reviewIndex,
}: { form: ReviewForm; isSelected: boolean; onClick: () => void; reviewIndex: number }) {
  const stage = (form.form_stage ?? form.formStage ?? '').replace(/_/g, ' ')
  return (
    <div className="border-b border-[#f3f4f6] last:border-b-0">
      <button
        onClick={onClick}
        className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors ${
          isSelected ? 'bg-[#fef2f2]' : 'hover:bg-[#f9fafb]'
        }`}
      >
        <div className={`w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isSelected ? 'bg-[#D51520]' : 'bg-[#eff6ff]'
        }`}>
          <span className={`text-[10px] font-bold font-display ${isSelected ? 'text-white' : 'text-[#2563eb]'}`}>
            R{String(reviewIndex).padStart(2, '0')}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-semibold font-display leading-snug truncate ${
            isSelected ? 'text-[#D51520]' : 'text-[#111827]'
          }`}>
            {form.title ?? 'Review Form'}
          </p>
          <p className="text-[11px] text-[#4b5563] font-body mt-0.5 capitalize">
            Review{stage ? ` · ${stage.toLowerCase()}` : ''}
          </p>
        </div>
        <div className="flex-shrink-0 mt-1">
          <MessageQuestionIcon size={14} color="#4b5563" strokeWidth={1.5} />
        </div>
      </button>
    </div>
  )
}

// ── Question input (renders the right control per question type) ──────────────
type AnswerValue = number | string | string[]

function QuestionInput({
  question, value, onChange,
}: { question: ReviewQuestion; value: AnswerValue; onChange: (v: AnswerValue) => void }) {
  const type = (question.question_type ?? question.questionType ?? '').toUpperCase()
  const opts = (question.option_values ?? question.optionValues)?.options ?? []
  const cfg  = question.configuration ?? {}
  const min  = cfg.minimum ?? 1
  const max  = cfg.maximum ?? 5

  if (type === 'RATING') {
    const num = typeof value === 'number' ? value : 0
    return (
      <div className="flex flex-wrap gap-2 mt-6">
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
          <button key={n} onClick={() => onChange(n)}
            className={`w-12 h-12 rounded-[8px] text-[15px] font-bold font-display border-2 transition-all ${
              num === n
                ? 'bg-[#D51520] border-[#D51520] text-white shadow-sm'
                : 'border-[#e5e7eb] text-[#374151] hover:border-[#D51520] hover:text-[#D51520]'
            }`}>
            {n}
          </button>
        ))}
        {min === 1 && max >= 5 && (
          <div className="w-full flex justify-between text-[11px] text-[#9ca3af] font-body mt-1 px-1">
            <span>Not at all</span><span>Excellent</span>
          </div>
        )}
      </div>
    )
  }

  if (type === 'RADIO' || type === 'SINGLE_SELECT') {
    const str = typeof value === 'string' ? value : ''
    return (
      <div className="flex flex-col gap-3 mt-6">
        {opts.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] border-2 text-left transition-all ${
              str === opt.value
                ? 'border-[#D51520] bg-[#fef2f2]'
                : 'border-[#e5e7eb] hover:border-[#D51520]/40 hover:bg-[#f9fafb]'
            }`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              str === opt.value ? 'border-[#D51520]' : 'border-[#d1d5db]'
            }`}>
              {str === opt.value && <div className="w-2.5 h-2.5 rounded-full bg-[#D51520]" />}
            </div>
            <span className="text-[14px] text-[#111827] font-body">{opt.label ?? opt.value}</span>
          </button>
        ))}
      </div>
    )
  }

  if (type === 'CHECKBOX' || type === 'MULTI_SELECT') {
    const arr = Array.isArray(value) ? value : []
    const toggle = (v: string) => {
      onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
    }
    return (
      <div className="flex flex-col gap-3 mt-6">
        {opts.map(opt => {
          const checked = arr.includes(opt.value)
          return (
            <button key={opt.value} onClick={() => toggle(opt.value)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-[10px] border-2 text-left transition-all ${
                checked ? 'border-[#D51520] bg-[#fef2f2]' : 'border-[#e5e7eb] hover:border-[#D51520]/40 hover:bg-[#f9fafb]'
              }`}>
              <div className={`w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked ? 'bg-[#D51520] border-[#D51520]' : 'border-[#d1d5db]'
              }`}>
                {checked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span className="text-[14px] text-[#111827] font-body">{opt.label ?? opt.value}</span>
            </button>
          )
        })}
      </div>
    )
  }

  // Fallback: free-text
  const str = typeof value === 'string' ? value : ''
  return (
    <textarea value={str} onChange={e => onChange(e.target.value)} rows={5}
      placeholder="Type your answer here…"
      className="w-full mt-6 border border-[#e5e7eb] rounded-[8px] px-4 py-3 text-[14px] text-[#111827] font-body placeholder:text-[#9ca3af] resize-none focus:outline-none focus:ring-2 focus:ring-[#D51520]/20 focus:border-[#D51520]"
    />
  )
}

// ── Review panel (step-by-step form, shown in right detail panel) ─────────────
function ReviewPanel({ form }: { form: ReviewForm }) {
  const [questions, setQuestions]     = useState<ReviewQuestion[]>([])
  const [loading, setLoading]         = useState(true)
  const [step, setStep]               = useState(0)
  const [answers, setAnswers]         = useState<Record<number, AnswerValue>>({})
  const [submitting, setSubmitting]   = useState(false)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState('')
  const [fieldError, setFieldError]   = useState('')
  const [submissionId, setSubmissionId] = useState<number | null>(null)

  useEffect(() => {
    setLoading(true); setDone(false); setStep(0); setAnswers({}); setError(''); setFieldError('')
    apiClient.get(`/review-forms/${form.id}`)
      .then(res => {
        const raw = res.data?.data ?? res.data
        const data: ReviewForm = raw?.data ?? raw
        const qs: ReviewQuestion[] = Array.isArray(data?.questions)
          ? [...data.questions].sort((a, b) =>
              (a.display_order ?? a.displayOrder ?? 0) - (b.display_order ?? b.displayOrder ?? 0))
          : []
        setQuestions(qs)
      })
      .catch(() => setError('Failed to load review questions.'))
      .finally(() => setLoading(false))
  }, [form.id])

  const total   = questions.length
  const current = questions[step]
  const isLast  = step === total - 1

  function getAnswer(id: number): AnswerValue {
    if (id in answers) return answers[id]
    const type = (current?.question_type ?? current?.questionType ?? '').toUpperCase()
    return (type === 'CHECKBOX' || type === 'MULTI_SELECT') ? [] : ''
  }

  function setAnswer(id: number, val: AnswerValue) {
    setAnswers(prev => ({ ...prev, [id]: val }))
    setFieldError('')
  }

  function validate(): boolean {
    if (!current) return true
    const required = current.is_required ?? current.isRequired ?? false
    if (!required) return true
    const ans = answers[current.id]
    if (ans === undefined || ans === null || ans === '') {
      setFieldError('This question is required.'); return false
    }
    if (Array.isArray(ans) && ans.length === 0) {
      setFieldError('Please select at least one option.'); return false
    }
    return true
  }

  function handleNext() {
    if (!validate()) return
    setStep(s => s + 1); setFieldError('')
  }
  function handlePrev() {
    setStep(s => Math.max(0, s - 1)); setFieldError('')
  }

  async function handleSubmit() {
    if (!validate()) return
    setSubmitting(true); setError('')
    try {
      const payload = {
        submissionId: submissionId,
        submissionStatus: 'SUBMITTED',
        metadata: { device: 'web' },
        answers: Object.entries(answers).map(([qId, val]) => ({
          questionId: Number(qId),
          answerValue: val,
        })),
      }
      const res = await apiClient.post(`/review-forms/${form.id}/submissions`, payload)
      const data = res.data?.data ?? res.data
      if (data?.id) setSubmissionId(data.id)
      setDone(true)
    } catch (e) {
      setError(getApiError(e))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full py-20 gap-3">
      <Loading01Icon size={22} className="animate-spin" color="#D51520" strokeWidth={1.5} />
      <p className="text-[13px] text-[#4b5563] font-body">Loading questions…</p>
    </div>
  )

  if (error && !questions.length) return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
      <AlertCircleIcon size={28} color="#d1d5db" strokeWidth={1.5} className="mb-3" />
      <p className="text-[13px] text-[#4b5563] font-body">{error}</p>
    </div>
  )

  if (done) return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8 gap-4">
      <div className="w-16 h-16 rounded-full bg-[#ecfdf3] flex items-center justify-center">
        <CheckmarkCircle01Icon size={28} color="#12b76a" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-[18px] font-bold text-[#111827] font-display mb-1">Thank you!</p>
        <p className="text-[14px] text-[#4b5563] font-body max-w-[280px]">
          Your review has been submitted successfully.
        </p>
      </div>
    </div>
  )

  if (!current) return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
      <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
        <MessageQuestionIcon size={28} color="#d1d5db" strokeWidth={1.5} />
      </div>
      <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">No questions yet</p>
      <p className="text-[13px] text-[#4b5563] font-body max-w-[280px]">
        This review has no questions yet. Check back later.
      </p>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-[#f3f4f6]">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-[5px] bg-[#fef2f2] flex items-center justify-center">
            <MessageQuestionIcon size={12} color="#D51520" strokeWidth={1.5} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#D51520] font-display">
            Review Module
          </span>
        </div>
        <h2 className="text-[22px] font-bold text-[#111827] font-display leading-snug mb-1">
          {form.title ?? 'Review'}
        </h2>
        {form.description && (
          <div
            className="text-[13px] text-[#4b5563] font-body leading-relaxed rich-content"
            dangerouslySetInnerHTML={{ __html: form.description }}
          />
        )}
      </div>

      {/* Progress bar */}
      <div className="px-8 pt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display">
            Question {step + 1} of {total}
          </span>
          <span className="text-[11px] text-[#9ca3af] font-body">
            {Math.round(((step + 1) / total) * 100)}% complete
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#f3f4f6] rounded-full">
          <div
            className="h-1.5 bg-[#D51520] rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto px-8 pt-6 pb-4">
        <p className="text-[17px] font-semibold text-[#111827] font-display leading-snug">
          {current.question_text ?? current.questionText ?? `Question ${step + 1}`}
          {(current.is_required ?? current.isRequired) && (
            <span className="text-[#D51520] ml-1">*</span>
          )}
        </p>

        <QuestionInput
          question={current}
          value={getAnswer(current.id)}
          onChange={val => setAnswer(current.id, val)}
        />

        {fieldError && (
          <div className="flex items-center gap-1.5 mt-3">
            <AlertCircleIcon size={13} color="#D51520" strokeWidth={1.5} />
            <p className="text-[12px] text-[#D51520] font-body">{fieldError}</p>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-1.5 mt-3">
            <AlertCircleIcon size={13} color="#D51520" strokeWidth={1.5} />
            <p className="text-[12px] text-[#D51520] font-body">{error}</p>
          </div>
        )}
      </div>

      {/* Nav footer */}
      <div className="px-8 py-5 border-t border-[#f3f4f6] flex items-center justify-between gap-3">
        <button
          onClick={handlePrev}
          disabled={step === 0}
          className="flex items-center gap-2 h-10 px-4 border border-[#e5e7eb] text-[#374151] text-[13px] font-semibold font-display rounded-[8px] hover:bg-[#f9fafb] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft01Icon size={14} strokeWidth={2} />
          Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 h-10 px-6 bg-[#D51520] hover:bg-[#B81119] text-white text-[13px] font-semibold font-display rounded-[8px] disabled:opacity-50 transition-colors"
          >
            {submitting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Submit Review
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-2 h-10 px-5 bg-[#D51520] hover:bg-[#B81119] text-white text-[13px] font-semibold font-display rounded-[8px] transition-colors"
          >
            Next
            <ArrowRight01Icon size={14} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Resource row (used inside detail panel) ───────────────────────────────────
const RES_ICONS: Record<string, React.ElementType> = {
  PDF:          File01Icon,
  PRESENTATION: PresentationBarChart01Icon,
  VIDEO:        Video01Icon,
  LECTURE:      Video01Icon,
  ARTICLE:      FileEditIcon,
  IMAGE:        File01Icon,
}
const RES_COLOURS: Record<string, { bg: string; text: string }> = {
  PDF:          { bg: '#FEF2F2', text: '#D51520' },
  PRESENTATION: { bg: '#FFF7ED', text: '#EA580C' },
  VIDEO:        { bg: '#F5F3FF', text: '#7C3AED' },
  LECTURE:      { bg: '#F5F3FF', text: '#7C3AED' },
  ARTICLE:      { bg: '#F0FDF4', text: '#16A34A' },
  IMAGE:        { bg: '#F0F9FF', text: '#0EA5E9' },
}

function ResourceRow({ resource }: { resource: ApiResource }) {
  const type    = (resource.type ?? 'PDF').toUpperCase()
  const Icon    = RES_ICONS[type] ?? File01Icon
  const colours = RES_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }

  const [loading,    setLoading]    = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Resources uploaded as files have link=null; external links have link set to the URL
  const isExternal = !!(resource.link && resource.link.startsWith('http'))

  async function openPreview(e: React.MouseEvent) {
    e.stopPropagation()
    if (loading) return
    // External links: open directly without calling the download endpoint
    if (isExternal && resource.link) {
      window.open(resource.link, '_blank')
      return
    }
    setLoading(true)
    try {
      const res  = await apiClient.get(`/program-resources/${resource.id}/download`)
      const body = res.data as Record<string, unknown>
      const inner = (body?.data ?? body) as Record<string, unknown>
      const url  = (inner?.url ?? inner?.link ?? body?.url ?? resource.link) as string | undefined
      if (url) setPreviewUrl(url)
      else if (resource.link) setPreviewUrl(resource.link)
    } catch {
      if (resource.link) setPreviewUrl(resource.link)
    } finally { setLoading(false) }
  }

  const isPdf   = type === 'PDF'
  const isVideo = type === 'VIDEO' || type === 'LECTURE'

  return (
    <>
      <button
        onClick={openPreview}
        disabled={loading}
        className="w-full flex items-center gap-3 p-3 rounded-[8px] bg-[#f9fafb] border border-[#f3f4f6] hover:bg-white hover:border-[#e5e7eb] hover:shadow-[0px_1px_3px_rgba(16,24,40,0.06)] transition-all text-left cursor-pointer disabled:cursor-wait"
      >
        <div className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: colours.bg }}>
          {loading
            ? <Loading01Icon size={13} color={colours.text} strokeWidth={1.5} className="animate-spin" />
            : <Icon size={14} color={colours.text} strokeWidth={1.5} />
          }
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-medium text-[#111827] font-body truncate">{resource.title ?? 'Resource'}</p>
          <p className="text-[11px] text-[#4b5563] font-body mt-0.5">{loading ? 'Loading…' : 'Click to preview'}</p>
        </div>
        <Download01Icon size={13} color="#9ca3af" strokeWidth={1.5} className="flex-shrink-0" />
      </button>

      {previewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col" onClick={() => setPreviewUrl(null)}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-[#e5e7eb] shadow-sm flex-shrink-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0" style={{ background: colours.bg }}>
                <Icon size={13} color={colours.text} strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#111827] font-display truncate">{resource.title ?? 'Resource'}</p>
            </div>
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] font-body hover:bg-[#f3f4f6] transition-colors">
                <Download01Icon size={13} color="#374151" strokeWidth={1.5} /> Download
              </a>
              <button onClick={() => setPreviewUrl(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6] transition-colors">
                <Cancel01Icon size={16} color="#374151" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-auto bg-[#1a1a1a] flex items-center justify-center" onClick={e => e.stopPropagation()}>
            {isPdf ? (
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(previewUrl)}&embedded=true`}
                className="w-full h-full border-0" title={resource.title ?? 'Resource'} />
            ) : isVideo ? (
              <video src={previewUrl} controls className="max-w-full max-h-full" />
            ) : (
              <div className="text-center text-white px-6">
                <File01Icon size={40} color="#6b7280" strokeWidth={1} className="mx-auto mb-3" />
                <p className="text-[15px] font-semibold font-display mb-2">Preview not available</p>
                <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119]">
                  <Download01Icon size={14} color="white" strokeWidth={1.5} /> Download file
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Detail panel (right) ──────────────────────────────────────────────────────
function DetailPanel({ item, resources }: { item: SelectedItem | null; resources: ApiResource[] }) {
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
        <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
          <BookOpen01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
        </div>
        <p className="text-[14px] font-semibold text-[#374151] font-display mb-1">
          Select a module or lesson
        </p>
        <p className="text-[13px] text-[#4b5563] font-body max-w-[280px] leading-[1.6]">
          Click any module or lesson on the left to view its details here.
        </p>
      </div>
    )
  }

  // Module detail
  if (item.kind === 'module') {
    const { data: mod, index } = item
    const lessonCount = mod.lessons?.length ?? 0
    // Resources associated with this module (by moduleId / cohortModuleId),
    // falling back to all resources if none are module-scoped
    const modProgramId = mod.program_module_id ?? mod.programModuleId
    const moduleResources = resources.filter((r) => {
      const rModId = resourceModuleId(r)
      return rModId === mod.id || (modProgramId && rModId === modProgramId)
    })
    const hasModuleScoping = resources.some((r) => resourceModuleId(r) !== undefined)
    const visibleResources = moduleResources.length > 0
      ? moduleResources
      : hasModuleScoping
        ? []        // other modules have resources, this one just has none
        : resources // no module scoping at all — show flat list under every module

    return (
      <div className="p-8">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display">
            Module {String(index).padStart(2, '0')}
          </span>
          {mod.duration && (
            <span className="text-[11px] font-medium text-[#4b5563] font-body bg-[#f3f4f6] px-2.5 py-1 rounded-full">
              {mod.duration}
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="text-[26px] font-bold text-[#111827] font-display leading-snug mb-4">
          {mod.title}
        </h2>

        {/* Description */}
        {(mod.description ?? mod.module_description) ? (
          <div
            className="text-[15px] text-[#475467] font-body leading-[1.7] mb-6 rich-content"
            dangerouslySetInnerHTML={{ __html: mod.description ?? mod.module_description ?? '' }}
          />
        ) : (
          <p className="text-[14px] text-[#4b5563] font-body leading-[1.6] mb-6 italic">
            No description provided for this module.
          </p>
        )}

        {/* Meta chips */}
        <div className="flex items-center gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-full px-3 py-1.5">
            <BookOpen01Icon size={12} color="#4b5563" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[#374151] font-body">
              {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
            </span>
          </div>
          {mod.duration && (
            <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-full px-3 py-1.5">
              <Time01Icon size={12} color="#4b5563" strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-[#374151] font-body">{mod.duration}</span>
            </div>
          )}
          {mod.createdBy && (
            <span className="text-[12px] text-[#4b5563] font-body">
              by {mod.createdBy}
            </span>
          )}
        </div>

        {/* Lessons in this module */}
        {lessonCount > 0 && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">
              Lessons in this module
            </p>
            <div className="flex flex-col gap-2">
              {[...mod.lessons]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((lesson, i) => {
                  const type    = ((lesson.contentType ?? lesson.content_type ?? 'PDF')).toUpperCase()
                  const colours = CONTENT_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
                  const Icon    = CONTENT_ICONS[type] ?? File01Icon
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 rounded-[8px] bg-[#f9fafb] border border-[#f3f4f6]"
                    >
                      <div
                        className="w-8 h-8 rounded-[7px] flex items-center justify-center flex-shrink-0"
                        style={{ background: colours.bg }}
                      >
                        <Icon size={14} color={colours.text} strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111827] font-body truncate">
                          {String(i + 1).padStart(2, '0')}. {lesson.title}
                        </p>
                        <p className="text-[11px] text-[#4b5563] font-body mt-0.5">
                          {type.charAt(0) + type.slice(1).toLowerCase()}
                          {lesson.duration ? ` · ${formatDuration(lesson.duration)}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}

        {/* Module resources */}
        {visibleResources.length > 0 && (
          <div className="mt-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#4b5563] font-display mb-3">
              Resources
            </p>
            <div className="flex flex-col gap-2">
              {visibleResources.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Review items are handled by ReviewPanel above — should never reach here
  if (item.kind !== 'lesson') return null

  // Lesson detail
  const { data: lesson, moduleTitle, moduleIndex, lessonIndex } = item
  const type    = ((lesson.contentType ?? lesson.content_type ?? 'PDF')).toUpperCase()
  const Icon    = CONTENT_ICONS[type] ?? File01Icon
  const colours = CONTENT_COLOURS[type] ?? { bg: '#F7F8FA', text: '#6b7280' }
  const typeLabel = type.charAt(0) + type.slice(1).toLowerCase()

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-5 text-[12px] text-[#4b5563] font-body">
        <span>Module {String(moduleIndex).padStart(2, '0')}</span>
        <ArrowRight01Icon size={11} color="#d1d5db" strokeWidth={1.5} />
        <span>Lesson {String(lessonIndex).padStart(2, '0')}</span>
      </div>

      {/* Content type icon */}
      <div
        className="w-16 h-16 rounded-[14px] flex items-center justify-center mb-6"
        style={{ background: colours.bg }}
      >
        <Icon size={28} color={colours.text} strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h2 className="text-[26px] font-bold text-[#111827] font-display leading-snug mb-3">
        {lesson.title}
      </h2>

      {/* Module context */}
      <p className="text-[13px] text-[#4b5563] font-body mb-6 leading-snug">
        From: <span className="text-[#4b5563] font-medium">{moduleTitle}</span>
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap mb-8">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
          style={{ background: colours.bg }}
        >
          <Icon size={12} color={colours.text} strokeWidth={1.5} />
          <span className="text-[12px] font-medium font-body" style={{ color: colours.text }}>
            {typeLabel}
          </span>
        </div>
        {lesson.duration > 0 && (
          <div className="flex items-center gap-1.5 bg-[#f3f4f6] rounded-full px-3 py-1.5">
            <Time01Icon size={12} color="#4b5563" strokeWidth={1.5} />
            <span className="text-[12px] font-medium text-[#374151] font-body">
              {formatDuration(lesson.duration)}
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[#f3f4f6] mb-8" />

      {/* Open button */}
      {lesson.contentUrl ? (
        <a
          href={lesson.contentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-[48px] px-6 bg-[#D51520] hover:bg-[#B81119] text-white text-[14px] font-semibold font-display rounded-[8px] transition-colors"
        >
          Open {typeLabel}
          <ArrowRight01Icon size={15} color="white" strokeWidth={2} />
        </a>
      ) : (
        <div className="flex items-center gap-2 text-[13px] text-[#4b5563] font-body">
          <Link01Icon size={14} color="#d1d5db" strokeWidth={1.5} />
          Content link not available yet.
        </div>
      )}
    </div>
  )
}

// ── Review modal ──────────────────────────────────────────────────────────────
function ReviewModal({ cohortId, onClose }: { cohortId: string; onClose: () => void }) {
  const [rating, setRating]       = useState(0)
  const [hovered, setHovered]     = useState(0)
  const [comment, setComment]     = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState('')

  async function submit() {
    if (rating === 0) { setError('Please select a star rating.'); return }
    setSaving(true); setError('')
    try {
      await apiClient.post(`/cohorts/${cohortId}/reviews`, {
        rating,
        comment: comment.trim() || undefined,
        is_anonymous: anonymous,
      })
      setDone(true)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[12px] shadow-[0px_12px_16px_-4px_rgba(16,24,40,0.08)] w-full max-w-[480px] p-6">

        {done ? (
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="w-12 h-12 rounded-full bg-[#ecfdf3] flex items-center justify-center">
              <CheckmarkCircle01Icon size={24} color="#12b76a" strokeWidth={1.5} />
            </div>
            <p className="text-[16px] font-semibold text-[#111827] font-display">Review submitted!</p>
            <p className="text-[13px] text-[#4b5563] font-body">Thank you for your feedback.</p>
            <button
              onClick={onClose}
              className="mt-2 h-9 px-5 bg-[#d51520] hover:bg-[#b91c1c] text-white text-[13px] font-semibold font-display rounded-[8px] transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-semibold text-[#111827] font-display">Leave a review</h3>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6]">
                <Cancel01Icon size={16} color="#6b7280" strokeWidth={1.5} />
              </button>
            </div>

            {/* Star picker */}
            <div className="mb-5">
              <p className="text-[13px] font-medium text-[#374151] font-body mb-2">Rating <span className="text-[#d51520]">*</span></p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setRating(n)}
                    className="p-0.5"
                  >
                    <StarIcon
                      size={28}
                      strokeWidth={1.5}
                      color={n <= (hovered || rating) ? '#d97706' : '#d1d5db'}
                      fill={n <= (hovered || rating) ? '#d97706' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div className="mb-4">
              <p className="text-[13px] font-medium text-[#374151] font-body mb-1.5">Comment <span className="text-[#9ca3af] font-normal">(optional)</span></p>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
                placeholder="Share your experience with this course..."
                className="w-full border border-[#e5e7eb] rounded-[6px] px-3 py-2.5 text-[13px] text-[#111827] font-body placeholder:text-[#9ca3af] resize-none focus:outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]"
              />
            </div>

            {/* Anonymous toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer mb-5">
              <div
                onClick={() => setAnonymous(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 ${anonymous ? 'bg-[#d51520]' : 'bg-[#e5e7eb]'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${anonymous ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-[13px] text-[#374151] font-body">Submit anonymously</span>
            </label>

            {error && <p className="text-[12px] text-[#d51520] mb-3">{error}</p>}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="h-9 px-4 border border-[#d1d5dd] text-[#374151] text-[13px] font-medium font-body rounded-[8px] hover:bg-[#f9fafb] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={saving}
                className="h-9 px-5 bg-[#d51520] hover:bg-[#b91c1c] disabled:opacity-50 text-white text-[13px] font-semibold font-display rounded-[8px] transition-colors flex items-center gap-2"
              >
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Submit review
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const cohortId = params.cohortId as string

  const [loading, setLoading]           = useState(true)
  const [notFound, setNotFound]         = useState(false)
  const [programTitle, setProgramTitle] = useState('')
  const [modules, setModules]           = useState<CohortModule[]>([])
  const [resources, setResources]       = useState<ApiResource[]>([])
  const [reviewForms, setReviewForms]   = useState<ReviewForm[]>([])
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
  const [showTeams, setShowTeams]       = useState(false)
  const [showReview, setShowReview]     = useState(false)
  const [isTeamLead, setIsTeamLead]     = useState(false)
  const [teamSeats, setTeamSeats]       = useState<{ used: number; total: number } | null>(null)

  // Set default selected item once modules load
  useEffect(() => {
    if (modules.length > 0 && !selectedItem) {
      const first = modules[0]
      setExpandedModules(new Set([first.id]))
      const sorted = [...(first.lessons ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
      if (sorted.length > 0) {
        setSelectedItem({ kind: 'lesson', data: sorted[0], moduleTitle: first.title, moduleIndex: 1, lessonIndex: 1 })
      } else {
        setSelectedItem({ kind: 'module', data: first, index: 1 })
      }
    }
  }, [modules]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function load() {
      try {
        // Primary: modules + resources in parallel
        const [modulesRes, resourcesRes] = await Promise.allSettled([
          apiClient.get(`/cohorts/${cohortId}/modules`),
          apiClient.get(`/cohorts/${cohortId}/resources`),
        ])

        if (modulesRes.status === 'fulfilled') {
          const modulesData = unwrap<CohortModulesResponse>(modulesRes.value.data)
          const list = Array.isArray(modulesData?.modules) ? modulesData.modules : []
          setModules([...list].sort((a, b) => a.orderIndex - b.orderIndex))
        }

        if (resourcesRes.status === 'fulfilled') {
          const d = unwrap<ApiResourcesResponse>(resourcesRes.value.data)
          setResources(Array.isArray(d?.resources) ? d.resources : [])
        }

        // Secondary: programme/cohort header info + enrollment
        let resolvedProgramId: number | null = null
        try {
          const programsRes  = await apiClient.get('/users/me/programs')
          const programsData = unwrap<ApiProgramsResponse>(programsRes.data)
          const programs = programsData?.programs ?? []
          const program  = programs.find((p) =>
            rm(p).some((c) => String(rc(c)) === String(cohortId))
          )
          if (program) {
            setProgramTitle(program.title)
            resolvedProgramId = program.id
            const cohortRow = rm(program).find((c) => String(rc(c)) === String(cohortId))
            const enrollment = readEnrollment(cohortRow)
            if (enrollment?.enrollmentType === 'TEAM') {
              setIsTeamLead(true)
              setTeamSeats({ used: enrollment.seatsUsed, total: enrollment.seatsPurchased })
            }
          }
        } catch {
          // Non-fatal — header just shows generic title
        }

        // Tertiary: review forms for this cohort
        try {
          const params = new URLSearchParams({ cohortId, page: '1', size: '50' })
          if (resolvedProgramId) params.set('programId', String(resolvedProgramId))
          const formsRes = await apiClient.get(`/review-forms?${params}`)
          const raw   = formsRes.data?.data ?? formsRes.data
          const inner: Record<string, unknown> = (raw && typeof raw === 'object' && !Array.isArray(raw) && 'data' in raw)
            ? (raw as Record<string, unknown>).data as Record<string, unknown>
            : raw as Record<string, unknown>
          const arr = (v: unknown): ReviewForm[] | null => Array.isArray(v) ? v as ReviewForm[] : null
          const forms: ReviewForm[] =
            arr(inner) ??
            arr(inner?.review_forms) ??
            arr(inner?.forms) ??
            arr(inner?.content) ??
            arr(inner?.items) ??
            arr(inner?.list) ??
            arr(inner?.review_form_list) ??
            []
          setReviewForms(forms.filter(f => f && typeof f === 'object' && (f.status ?? '').toUpperCase() !== 'INACTIVE'))
        } catch {
          // Non-fatal — curriculum still works without reviews
        }

        if (modulesRes.status === 'rejected') setNotFound(true)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cohortId])

  function toggleModule(id: number) {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)

  // Merge modules and review forms into one ordered sidebar list
  const sidebarEntries = useMemo<SidebarEntry[]>(() => {
    const entries: SidebarEntry[] = modules.map((m, i) => ({
      type: 'module', data: m, moduleIndex: i + 1, sortKey: i + 1,
    }))
    reviewForms.forEach(form => {
      const stage = (form.form_stage ?? form.formStage ?? '').toUpperCase()
      let sortKey = modules.length + 0.5 // default: after all modules
      if (stage.includes('PRE') || stage.includes('START') || stage.includes('INTRO')) {
        sortKey = 0.5
      } else if (stage.includes('MID')) {
        sortKey = Math.ceil(modules.length / 2) + 0.5
      }
      entries.push({ type: 'review', data: form, sortKey })
    })
    return entries.sort((a, b) => a.sortKey - b.sortKey)
  }, [modules, reviewForms])

  // ── Loading ──
  if (loading) {
    return (
      <>
        <TopNav title="Course" breadcrumbs={['My Programs']} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-2 text-[#4b5563]">
          <Loading01Icon size={22} className="animate-spin" strokeWidth={1.5} />
          <span className="text-[13px] font-body">Loading curriculum…</span>
        </div>
      </>
    )
  }

  // ── Not found ──
  if (notFound) {
    return (
      <>
        <TopNav title="Course" breadcrumbs={['My Programs']} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center px-6">
          <div className="w-14 h-14 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center">
            <BookOpen01Icon size={24} color="#d1d5db" strokeWidth={1.5} />
          </div>
          <p className="text-[15px] font-semibold text-[#374151] font-display">No content yet</p>
          <p className="text-[13px] text-[#4b5563] font-body max-w-[320px]">
            Your instructor is preparing the curriculum. Modules and lessons will appear here once they&apos;re published.
          </p>
          <button
            onClick={() => router.push('/student/programs')}
            className="mt-2 text-[13px] text-[#d51520] font-medium hover:underline"
          >
            ← Back to My Programs
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title={programTitle || 'Course'} breadcrumbs={['My Programs']} />

      <div className="px-4 lg:px-8 pb-10">

        {/* Header */}
        <div className="pt-6 pb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push('/student/programs')}
              className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors flex-shrink-0"
              aria-label="Back to programs"
            >
              <ArrowLeft01Icon size={16} color="#4b5563" strokeWidth={1.5} />
            </button>
            <div className="min-w-0">
              <h1 className="text-[20px] lg:text-[24px] font-bold text-[#111827] font-display leading-tight truncate">
                {programTitle || 'Course Curriculum'}
              </h1>
              <p className="text-[13px] text-[#4b5563] font-body mt-0.5">
                {modules.length} module{modules.length !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Teams button — team lead only */}
            {isTeamLead && (
              <button
                onClick={() => setShowTeams(true)}
                className="inline-flex items-center gap-2 h-9 px-4 border border-[#fde68a] bg-[#fffbeb] text-[#b45309] text-[13px] font-semibold font-display rounded-[8px] hover:bg-[#fef9c3] transition-colors"
              >
                <UserGroup02Icon size={15} color="#b45309" strokeWidth={2} />
                Teams
                {teamSeats && (
                  <span className="text-[11px] font-medium text-[#b45309] bg-[#fef3c7] px-1.5 py-0.5 rounded-full">
                    {teamSeats.used}/{teamSeats.total}
                  </span>
                )}
              </button>
            )}

            {/* Leave a review */}
            <button
              onClick={() => setShowReview(true)}
              className="inline-flex items-center gap-2 h-9 px-4 border border-[#e5e7eb] bg-white text-[#374151] text-[13px] font-semibold font-display rounded-[8px] hover:bg-[#f9fafb] transition-colors"
            >
              <StarIcon size={15} color="#d97706" strokeWidth={1.5} />
              Leave a review
            </button>
          </div>
        </div>

        {/* Curriculum grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6" style={{ minHeight: '580px' }}>

          {/* Left: Curriculum list */}
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden flex flex-col">
            <div className="px-5 py-4 border-b border-[#f3f4f6]">
              <p className="text-[14px] font-semibold text-[#111827] font-display">Course Curriculum</p>
              <p className="text-[12px] text-[#4b5563] font-body mt-0.5">
                {modules.length} modules · {totalLessons} lessons
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(() => {
                let reviewCounter = 0
                return sidebarEntries.map((entry) => {
                if (entry.type === 'review') {
                  reviewCounter++
                  const ri = reviewCounter
                  return (
                    <ReviewFormSidebarItem
                      key={`review-${entry.data.id}`}
                      form={entry.data}
                      reviewIndex={ri}
                      isSelected={selectedItem?.kind === 'review' && selectedItem.data.id === entry.data.id}
                      onClick={() => setSelectedItem({ kind: 'review', data: entry.data })}
                    />
                  )
                }
                const mod = entry.data
                const idx = entry.moduleIndex
                return (
                  <ModuleAccordion
                    key={mod.id}
                    module={mod}
                    moduleIndex={idx}
                    isExpanded={expandedModules.has(mod.id)}
                    selectedItem={selectedItem}
                    onToggle={() => toggleModule(mod.id)}
                    onSelectModule={() => setSelectedItem({ kind: 'module', data: mod, index: idx })}
                    onSelectLesson={(lesson, li) =>
                      setSelectedItem({ kind: 'lesson', data: lesson, moduleTitle: mod.title, moduleIndex: idx, lessonIndex: li })
                    }
                  />
                )
              })
              })()}
            </div>
          </div>

          {/* Right: Detail panel or Review panel */}
          <div className="bg-white rounded-[10px] shadow-[0px_1px_3px_rgba(16,24,40,0.06)] overflow-hidden overflow-y-auto">
            {selectedItem?.kind === 'review'
              ? <ReviewPanel form={selectedItem.data} />
              : <DetailPanel item={selectedItem} resources={resources} />
            }
          </div>

        </div>
      </div>

      {showTeams  && <TeamFeature  onClose={() => setShowTeams(false)} />}
      {showReview && <ReviewModal cohortId={cohortId} onClose={() => setShowReview(false)} />}
    </>
  )
}
