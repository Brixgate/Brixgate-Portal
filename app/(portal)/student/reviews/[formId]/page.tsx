'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import ReviewQuestionField from '@/components/student/ReviewQuestionField'
import { ArrowLeft01Icon, Loading01Icon, CheckmarkBadge01Icon } from 'hugeicons-react'

interface ReviewQuestion {
  id: number
  question_text?: string; questionText?: string
  question_type?: string; questionType?: string
  is_required?: boolean;  isRequired?: boolean
  help_text?: string;     helpText?: string
  display_order?: number
  configuration?: { minimum?: number; maximum?: number }
  option_values?: { options?: { value: string; label?: string }[] }
  optionValues?:  { options?: { value: string; label?: string }[] }
}

interface ReviewForm {
  id: number
  title?: string
  description?: string
  questions?: ReviewQuestion[]
}

export default function ReviewFormPage() {
  const { formId } = useParams<{ formId: string }>()
  const router = useRouter()

  const [form,      setForm]      = useState<ReviewForm | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [answers,   setAnswers]   = useState<Record<number, unknown>>({})
  const [saving,    setSaving]    = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    apiClient.get(`/review-forms/${formId}`)
      .then(res => {
        const data = unwrap<ReviewForm>(res.data)
        setForm(data)
      })
      .catch(() => setError('Could not load this review form.'))
      .finally(() => setLoading(false))
  }, [formId])

  function setAnswer(questionId: number, value: unknown) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  async function handleSubmit() {
    if (!form) return
    const questions = form.questions ?? []

    // Validate required fields
    for (const q of questions) {
      const required = q.is_required ?? q.isRequired ?? false
      if (!required) continue
      const val = answers[q.id]
      if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        setError(`Please answer: "${q.question_text ?? q.questionText}"`)
        return
      }
    }

    setSaving(true)
    setError('')
    try {
      const payload = {
        submission_status: 'SUBMITTED',
        answers: Object.entries(answers).map(([qId, val]) => ({
          questionId:  Number(qId),
          answerValue: val,
        })),
      }
      await apiClient.post(`/review-forms/${formId}/submissions`, payload)
      setSubmitted(true)
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const questions = (form?.questions ?? [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))

  if (submitted) {
    return (
      <>
        <TopNav title="Reviews" />
        <div className="px-4 md:px-8 pb-10 flex flex-col items-center justify-center min-h-[60vh] gap-5">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <CheckmarkBadge01Icon size={32} color="#16a34a" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h2 className="text-[20px] font-bold text-[#111827] font-display mb-2">Review Submitted!</h2>
            <p className="text-[14px] text-[#4b5563] font-body max-w-[320px]">
              Thank you for your feedback. It helps us improve your learning experience.
            </p>
          </div>
          <button
            onClick={() => router.push('/student/reviews')}
            className="h-10 px-6 bg-[#d51520] hover:bg-[#b81119] text-white text-[14px] font-semibold font-display rounded-[8px] transition-colors"
          >
            Back to Reviews
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <TopNav title="Reviews" />

      <div className="px-4 md:px-8 pb-10 max-w-[720px]">
        {/* Back link */}
        <button
          onClick={() => router.push('/student/reviews')}
          className="flex items-center gap-1.5 mt-6 mb-5 text-[13px] text-[#6b7280] font-body hover:text-[#374151] transition-colors"
        >
          <ArrowLeft01Icon size={14} color="#6b7280" strokeWidth={2} />
          Back to Reviews
        </button>

        {loading && (
          <div className="flex items-center gap-2 py-20 justify-center">
            <Loading01Icon size={18} className="animate-spin" color="#d51520" strokeWidth={1.5} />
            <span className="text-[13px] text-[#4b5563] font-body">Loading form…</span>
          </div>
        )}

        {!loading && (error && !form) && (
          <div className="bg-red-50 border border-red-200 rounded-[8px] p-4 text-[13px] text-[#d51520] font-body">
            {error}
          </div>
        )}

        {!loading && form && (
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,0.05)]">
            {/* Form header */}
            <div className="px-6 pt-6 pb-5 border-b border-[#f3f4f6]">
              <h1 className="text-[20px] font-bold text-[#111827] font-display">{form.title}</h1>
              {form.description && (
                <p className="text-[14px] text-[#4b5563] font-body mt-1.5 leading-[1.6]">{form.description}</p>
              )}
            </div>

            {/* Questions */}
            <div className="px-6 py-6 flex flex-col gap-8">
              {questions.length === 0 && (
                <p className="text-[14px] text-[#9ca3af] font-body text-center py-6">
                  No questions have been added to this form yet.
                </p>
              )}

              {questions.map((q, idx) => (
                <div key={q.id} className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9ca3af] font-display">
                    Question {idx + 1}
                  </p>
                  <ReviewQuestionField
                    question={q}
                    value={answers[q.id]}
                    onChange={val => setAnswer(q.id, val)}
                  />
                </div>
              ))}
            </div>

            {/* Footer */}
            {questions.length > 0 && (
              <div className="px-6 py-5 border-t border-[#f3f4f6] flex items-center justify-between gap-4">
                {error ? (
                  <p className="text-[13px] text-[#d51520] font-body flex-1">{error}</p>
                ) : (
                  <p className="text-[12px] text-[#9ca3af] font-body flex-1">
                    Fields marked <span className="text-[#d51520]">*</span> are required.
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="h-10 px-6 bg-[#d51520] hover:bg-[#b81119] disabled:opacity-60 text-white text-[14px] font-semibold font-display rounded-[8px] transition-colors flex items-center gap-2"
                >
                  {saving && <Loading01Icon size={14} className="animate-spin" color="white" strokeWidth={2} />}
                  {saving ? 'Submitting…' : 'Submit Review'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
