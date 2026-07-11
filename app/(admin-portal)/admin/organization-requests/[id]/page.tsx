'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft01Icon, Loading01Icon, AlertCircleIcon, CheckmarkCircle01Icon } from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

interface OrgRequest {
  id: number; status?: string
  organization_name?: string; organizationName?: string
  contact_name?: string; contactName?: string
  contact_email?: string; contactEmail?: string
  contact_phone?: string; contactPhone?: string
  program_interest?: string; programInterest?: string
  team_size?: number; teamSize?: number
  message?: string
  created_at?: string; createdAt?: string
}

const STATUSES = ['SUBMITTED', 'CONTACTED', 'IN_DISCUSSION', 'PROPOSAL_SENT', 'NEGOTIATING', 'APPROVED', 'REJECTED', 'ONBOARDED', 'CLOSED']
const STATUS_STYLE: Record<string, string> = {
  SUBMITTED: 'bg-[#fffbeb] text-[#b45309]', CONTACTED: 'bg-[#eff6ff] text-[#1d4ed8]',
  IN_DISCUSSION: 'bg-[#f0f9ff] text-[#0369a1]', APPROVED: 'bg-[#ecfdf3] text-[#027a48]',
  REJECTED: 'bg-[#fef2f2] text-[#d51520]', ONBOARDED: 'bg-[#f0fdf4] text-[#15803d]',
  CLOSED: 'bg-[#f3f4f6] text-[#4b5563]', PROPOSAL_SENT: 'bg-[#f5f3ff] text-[#7c3aed]',
  NEGOTIATING: 'bg-[#fff7ed] text-[#c2410c]',
}

function DetailRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <div className="flex gap-4 py-3 border-b border-[#f3f4f6] last:border-0">
      <span className="w-[160px] flex-shrink-0 text-[12px] text-[#4b5563] font-body">{label}</span>
      <span className="text-[13px] text-[#111827] font-body">{value ?? '—'}</span>
    </div>
  )
}

export default function OrgRequestDetailPage() {
  const { id } = useParams()
  const router  = useRouter()
  const [req, setReq]         = useState<OrgRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [newStatus, setNewStatus] = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    apiClient.get(`/admin/organization-requests/${id}`).then(res => {
      const data = unwrap<OrgRequest>(res.data)
      setReq(data); setNewStatus(data?.status ?? '')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function updateStatus() {
    if (!newStatus || newStatus === req?.status) return
    setSaving(true); setError(''); setSuccess(false)
    try {
      await apiClient.patch(`/admin/organization-requests/${id}/status`, { status: newStatus })
      setReq(p => p ? { ...p, status: newStatus } : p)
      setSuccess(true); setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const orgName = req?.organizationName ?? req?.organization_name ?? '—'
  const teamSize = req?.teamSize ?? req?.team_size

  return (
    <div className="p-8 max-w-[800px]">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.push('/admin/organization-requests')}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6]">
          <ArrowLeft01Icon size={16} color="#374151" strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="text-[22px] font-bold text-[#111827] font-display">{orgName}</h1>
          {req?.status && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-display mt-1 ${STATUS_STYLE[req.status] ?? ''}`}>
              {req.status.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loading01Icon size={24} className="animate-spin text-[#d51520]" strokeWidth={1.5} />
        </div>
      ) : req ? (
        <div className="grid grid-cols-[1fr_280px] gap-6">
          <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
              <h3 className="text-[14px] font-semibold text-[#111827] font-display">Request Details</h3>
            </div>
            <div className="px-6 py-2">
              <DetailRow label="Organisation"       value={orgName} />
              <DetailRow label="Contact Name"       value={req.contactName ?? req.contact_name} />
              <DetailRow label="Contact Email"      value={req.contactEmail ?? req.contact_email} />
              <DetailRow label="Contact Phone"      value={req.contactPhone ?? req.contact_phone} />
              <DetailRow label="Programme Interest" value={req.programInterest ?? req.program_interest} />
              <DetailRow label="Team Size"          value={teamSize ? `${teamSize} people` : undefined} />
            </div>
            {req.message && (
              <>
                <div className="h-px bg-[#f3f4f6] mx-6" />
                <div className="px-6 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display mb-2">Message</p>
                  <p className="text-[13px] text-[#374151] font-body leading-[1.7]">{req.message}</p>
                </div>
              </>
            )}
          </div>

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
              <button onClick={updateStatus} disabled={saving || newStatus === req.status}
                className="w-full h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />} Save Status
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-[#4b5563] font-body">Request not found.</p>
      )}
    </div>
  )
}
