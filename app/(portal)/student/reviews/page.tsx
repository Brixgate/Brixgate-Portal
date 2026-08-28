'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopNav from '@/components/layout/TopNav'
import { apiClient, unwrap } from '@/lib/api-client'
import { FileEditIcon, Clock01Icon, Loading01Icon, Note01Icon, CheckmarkBadge01Icon } from 'hugeicons-react'

interface ReviewForm {
  id: number
  title?: string
  description?: string
  form_stage?: string
  status?: string
  available_from?: string
  available_until?: string
  question_count?: number
}

interface ApiProgram {
  id: number
  title?: string
  myCohorts?: { cohortId?: number; cohort_id?: number }[]
  my_cohorts?: { cohortId?: number; cohort_id?: number }[]
}

function formatStage(stage?: string) {
  const map: Record<string, string> = {
    END_OF_PROGRAM: 'End of Programme',
    MID_PROGRAM:    'Mid Programme',
    START_OF_PROGRAM: 'Start of Programme',
    GENERAL:        'General',
  }
  return stage ? (map[stage] ?? stage.replace(/_/g, ' ')) : ''
}

function formatDate(iso?: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos',
  })
}

function statusBadge(status?: string) {
  if (status === 'ACTIVE')   return 'bg-green-50 text-green-700 border border-green-200'
  if (status === 'INACTIVE') return 'bg-gray-100 text-gray-500 border border-gray-200'
  if (status === 'ARCHIVED') return 'bg-gray-100 text-gray-400 border border-gray-200'
  return 'bg-amber-50 text-amber-700 border border-amber-200'
}

export default function ReviewsPage() {
  const router = useRouter()
  const [forms,   setForms]   = useState<ReviewForm[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const progRes  = await apiClient.get('/users/me/programs')
        const progData = unwrap<{ programs?: ApiProgram[] }>(progRes.data)
        const programs: ApiProgram[] = Array.isArray(progData?.programs) ? progData.programs : []

        const all: ReviewForm[] = []
        await Promise.all(
          programs.map(async p => {
            const cohorts = p.myCohorts ?? p.my_cohorts ?? []
            await Promise.all(
              cohorts.map(async c => {
                const cid = c.cohortId ?? c.cohort_id
                if (!cid) return
                try {
                  const res = await apiClient.get(`/review-forms?programId=${p.id}&cohortId=${cid}`)
                  const data = unwrap<{ review_forms?: ReviewForm[] }>(res.data)
                  const list = Array.isArray(data?.review_forms) ? data.review_forms : []
                  all.push(...list)
                } catch { /* skip */ }
              })
            )
          })
        )

        // Deduplicate by id
        const seen = new Set<number>()
        setForms(all.filter(f => seen.has(f.id) ? false : (seen.add(f.id), true)))
      } catch {
        setForms([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <TopNav title="Reviews" />

      <div className="px-4 md:px-8 pb-10">
        <div className="pt-7 pb-6">
          <h1 className="text-[24px] font-bold text-[#111827] font-display leading-tight">Reviews</h1>
          <p className="text-[14px] text-[#4b5563] font-body mt-1">
            Share your feedback on your programmes and learning experience.
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-24 gap-2">
            <Loading01Icon size={18} className="animate-spin" color="#d51520" strokeWidth={1.5} />
            <span className="text-[13px] text-[#4b5563] font-body">Loading reviews…</span>
          </div>
        )}

        {!loading && forms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-[10px] border border-[#eaecf0]">
            <div className="w-14 h-14 rounded-[12px] bg-[#f9fafb] flex items-center justify-center">
              <Note01Icon size={26} color="#d1d5db" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold text-[#374151] font-display">No reviews available</p>
            <p className="text-[13px] text-[#9ca3af] font-body max-w-[300px] text-center">
              Review forms will appear here when your instructors publish them.
            </p>
          </div>
        )}

        {!loading && forms.length > 0 && (
          <div className="flex flex-col gap-4">
            {forms.map(form => (
              <div
                key={form.id}
                className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,0.05)] p-6 flex items-start justify-between gap-4"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-[8px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                  <FileEditIcon size={18} color="#d51520" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-[15px] font-semibold text-[#111827] font-display">{form.title ?? 'Review Form'}</p>
                    <span className={`text-[10px] font-semibold font-display px-2 py-0.5 rounded-full ${statusBadge(form.status)}`}>
                      {form.status}
                    </span>
                    {form.form_stage && (
                      <span className="text-[10px] font-semibold font-display px-2 py-0.5 rounded-full bg-[#f5f3ff] text-[#7c3aed] border border-[#ede9fe]">
                        {formatStage(form.form_stage)}
                      </span>
                    )}
                  </div>

                  {form.description && (
                    <p className="text-[13px] text-[#4b5563] font-body mb-2 line-clamp-2">{form.description}</p>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {form.available_from && (
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                        <Clock01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
                        <span>Opens: {formatDate(form.available_from)}</span>
                      </div>
                    )}
                    {form.available_until && (
                      <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] font-body">
                        <Clock01Icon size={12} color="#9ca3af" strokeWidth={1.5} />
                        <span>Closes: {formatDate(form.available_until)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* CTA */}
                <div className="flex-shrink-0">
                  {form.status === 'ACTIVE' ? (
                    <button
                      onClick={() => router.push(`/student/reviews/${form.id}`)}
                      className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#d51520] hover:bg-[#b81119] text-white text-[13px] font-semibold font-display rounded-[8px] transition-colors"
                    >
                      <FileEditIcon size={13} color="white" strokeWidth={2} />
                      Start Review
                    </button>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 h-9 px-4 bg-[#f3f4f6] text-[#9ca3af] text-[13px] font-semibold font-display rounded-[8px]">
                      <CheckmarkBadge01Icon size={13} color="#9ca3af" strokeWidth={2} />
                      Not Available
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
