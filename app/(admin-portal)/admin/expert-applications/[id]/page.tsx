'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft01Icon, Loading01Icon, AlertCircleIcon, CheckmarkCircle01Icon } from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

interface Application {
  id: number; status?: string
  full_name?: string; fullName?: string
  email?: string
  expertise?: string
  years_of_experience?: number; yearsOfExperience?: number
  biography?: string
  linkedin_url?: string; linkedinUrl?: string
  created_at?: string; createdAt?: string
  user?: { name?: string; email: string }
}

const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ONBOARDED', 'ACTIVE', 'SUSPENDED']
const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-[#fffbeb] text-[#b45309]', UNDER_REVIEW: 'bg-[#eff6ff] text-[#1d4ed8]',
  APPROVED: 'bg-[#ecfdf3] text-[#027a48]',  REJECTED: 'bg-[#fef2f2] text-[#d51520]',
  ONBOARDED: 'bg-[#f0fdf4] text-[#15803d]', ACTIVE: 'bg-[#ecfdf3] text-[#027a48]',
  SUSPENDED: 'bg-[#f3f4f6] text-[#6b7280]',
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex gap-4 py-3 border-b border-[#f3f4f6] last:border-0">
      <span className="w-[160px] flex-shrink-0 text-[12px] text-[#9ca3af] font-body">{label}</span>
      <span className="text-[13px] text-[#111827] font-body">{value ?? '—'}</span>
    </div>
  )
}

export default function ExpertApplicationDetailPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [app, setApp]         = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    apiClient.get(`/admin/expert-applications/${id}`).then(res => {
      const data = unwrap<Application>(res.data)
      setApp(data); setNewStatus(data?.status ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function updateStatus() {
    if (!newStatus || newStatus === app?.status) return
    setSaving(true); setError(''); setSuccess(false)
    try {
      await apiClient.patch(`/admin/expert-applications/${id}/status`, { status: newStatus })
      setApp(p => p ? { ...p, status: newStatus } : p)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const name = app?.fullName ?? app?.full_name ?? app?.user?.name ?? app?.email ?? app?.user?.email ?? '—'
  const yoe  = app?.yearsOfExperience ?? app?.years_of_experience

  return (
    <div className="p-8 max-w-[800px]">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/admin/expert-applications')}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6]">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] font-display">Expert Application</h1>
          {app?.status && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display mt-1 ${STATUS_STYLE[app.status] ?? ''}`}>
              {app.status.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loading01Icon size={24} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
        </div>
      ) : app ? (
        <div className="grid grid-cols-[1fr_280px] gap-6">
          {/* Details */}
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
              <h3 className="text-[14px] font-semibold text-[#111827] font-display">Application Details</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Full Name"            value={name} />
              <DetailRow label="Email"                value={app.email ?? app.user?.email} />
              <DetailRow label="Expertise"            value={app.expertise} />
              <DetailRow label="Years of Experience"  value={yoe ? `${yoe} years` : undefined} />
              <DetailRow label="LinkedIn"             value={app.linkedinUrl ?? app.linkedin_url} />
            </div>
            {app.biography && (
              <>
                <div className="h-px bg-[#f3f4f6] mx-6" />
                <div className="px-6 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9ca3af] font-display mb-2">Biography</p>
                  <p className="text-[13px] text-[#374151] font-body leading-[1.7]">{app.biography}</p>
                </div>
              </>
            )}
          </div>

          {/* Status update */}
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden h-fit">
            <div className="px-5 pt-5 pb-4 border-b border-[#f3f4f6]">
              <h3 className="text-[14px] font-semibold text-[#111827] font-display">Update Status</h3>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
              {error && <p className="flex items-center gap-1.5 text-[11px] text-[#d51520] font-body"><AlertCircleIcon size={12} color="#d51520" strokeWidth={1.5} /> {error}</p>}
              {success && <p className="flex items-center gap-1.5 text-[11px] text-[#027a48] font-body"><CheckmarkCircle01Icon size={12} color="#027a48" strokeWidth={1.5} /> Status updated</p>}
              <button onClick={updateStatus} disabled={saving || newStatus === app.status}
                className="w-full h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Save Status
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-[#9ca3af] font-body">Application not found.</p>
      )}
    </div>
  )
}
