'use client'

import { useEffect, useState } from 'react'
import { apiClient, getApiError } from '@/lib/api-client'
import {
  PlusSignIcon,
  Delete01Icon,
  PencilEdit01Icon,
  Settings01Icon,
  AlertCircleIcon,
} from 'hugeicons-react'

interface PaySetting {
  id: number
  program_id: number | null
  cohort_id: number | null
  scope: 'GLOBAL' | 'PROGRAM' | 'COHORT'
  percentage: number
  min_students: number
  min_flat_fee: number
  currency: string
  status: 'ACTIVE' | 'INACTIVE'
  created_at?: string
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function ScopeBadge({ scope }: { scope: string }) {
  const s: Record<string, string> = {
    GLOBAL:  'bg-purple-50 text-purple-700 border border-purple-200',
    PROGRAM: 'bg-blue-50 text-blue-700 border border-blue-200',
    COHORT:  'bg-teal-50 text-teal-700 border border-teal-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${s[scope] ?? s.GLOBAL}`}>
      {scope.charAt(0) + scope.slice(1).toLowerCase()}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
      status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ACTIVE' ? 'bg-green-600' : 'bg-gray-400'}`} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  )
}

interface FormState {
  program_id: string
  cohort_id: string
  percentage: string
  min_students: string
  min_flat_fee: string
  status: 'ACTIVE' | 'INACTIVE'
}

const EMPTY_FORM: FormState = {
  program_id: '', cohort_id: '', percentage: '', min_students: '0', min_flat_fee: '0', status: 'ACTIVE',
}

function SettingModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: PaySetting | null
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState<FormState>(
    editing
      ? {
          program_id:   String(editing.program_id ?? ''),
          cohort_id:    String(editing.cohort_id ?? ''),
          percentage:   String(editing.percentage),
          min_students: String(editing.min_students),
          min_flat_fee: String(editing.min_flat_fee),
          status:       editing.status,
        }
      : EMPTY_FORM
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  function set(k: keyof FormState, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit() {
    if (!form.percentage) { setErr('Percentage is required.'); return }
    setSaving(true); setErr('')
    const body: Record<string, unknown> = {
      percentage:   parseFloat(form.percentage),
      min_students: parseInt(form.min_students || '0'),
      min_flat_fee: parseFloat(form.min_flat_fee || '0'),
      currency:     'NGN',
      status:       form.status,
    }
    if (!editing) {
      body.program_id = form.program_id ? parseInt(form.program_id) : null
      body.cohort_id  = form.cohort_id  ? parseInt(form.cohort_id)  : null
    }
    try {
      if (editing) {
        await apiClient.patch(`/admin/instructor-pay-settings/${editing.id}`, body)
      } else {
        await apiClient.post('/admin/instructor-pay-settings', body)
      }
      onSaved()
    } catch (e) {
      setErr(getApiError(e))
    } finally {
      setSaving(false)
    }
  }

  const scope = !form.cohort_id && !form.program_id ? 'GLOBAL'
    : form.cohort_id ? 'COHORT'
    : 'PROGRAM'

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[12px] shadow-[0px_12px_40px_rgba(16,24,40,0.15)] w-full max-w-[520px] overflow-hidden">
        <div className="px-6 py-5 border-b border-[#f3f4f6]">
          <h2 className="text-[18px] font-bold text-[#111827] font-display">
            {editing ? 'Edit Pay Setting' : 'New Pay Setting'}
          </h2>
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">
            {editing
              ? 'Update the payment rule. Scope cannot be changed after creation.'
              : 'Leave Program ID and Cohort ID blank for a Global rule.'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Program ID <span className="text-[#9ca3af]">(optional)</span></label>
                <input type="number" value={form.program_id} onChange={e => set('program_id', e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Cohort ID <span className="text-[#9ca3af]">(optional)</span></label>
                <input type="number" value={form.cohort_id} onChange={e => set('cohort_id', e.target.value)}
                  placeholder="e.g. 5"
                  className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
              </div>
            </div>
          )}

          {!editing && (
            <div className="flex items-center gap-2 text-[12px] text-[#6b7280] font-body bg-[#f9fafb] rounded-[6px] px-3 py-2">
              <AlertCircleIcon size={14} color="#9ca3af" strokeWidth={1.5} />
              Resolved scope: <strong className="text-[#374151]">{scope}</strong>
            </div>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Percentage (0–100) *</label>
            <input type="number" min={0} max={100} step={0.1} value={form.percentage} onChange={e => set('percentage', e.target.value)}
              placeholder="e.g. 40"
              className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Min Students</label>
              <input type="number" min={0} value={form.min_students} onChange={e => set('min_students', e.target.value)}
                className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Min Flat Fee (₦)</label>
              <input type="number" min={0} value={form.min_flat_fee} onChange={e => set('min_flat_fee', e.target.value)}
                className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520]" />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#374151] mb-1.5 font-body">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value as 'ACTIVE' | 'INACTIVE')}
              className="w-full h-[44px] px-3 rounded-[6px] border border-[#d1d5db] text-[14px] text-[#111827] font-body outline-none focus:ring-2 focus:ring-[#d51520]/20 focus:border-[#d51520] bg-white">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {err && (
            <div className="flex items-center gap-2 text-[13px] text-red-600 font-body">
              <AlertCircleIcon size={14} color="#dc2626" strokeWidth={1.5} />
              {err}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#f3f4f6] flex justify-end gap-3">
          <button onClick={onClose}
            className="h-10 px-4 rounded-[8px] border border-[#d1d5db] text-[14px] font-medium text-[#374151] hover:bg-[#f9fafb] font-display">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="h-10 px-5 rounded-[8px] bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold font-display disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InstructorPaySettingsPage() {
  const [settings, setSettings] = useState<PaySetting[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState<'new' | PaySetting | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  function load() {
    setLoading(true)
    apiClient.get('/admin/instructor-pay-settings?page=1&size=100')
      .then(res => {
        const d = res.data?.data ?? res.data
        const arr = d?.settings ?? d?.content ?? d?.data ?? (Array.isArray(d) ? d : [])
        setSettings(arr)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: number) {
    if (!confirm('Delete this pay setting? This cannot be undone.')) return
    setDeleting(id)
    try {
      await apiClient.delete(`/admin/instructor-pay-settings/${id}`)
      setSettings(s => s.filter(x => x.id !== id))
    } catch { /* swallow */ }
    finally { setDeleting(null) }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-[#111827] font-display leading-[36px]">Instructor Pay Settings</h1>
          <p className="mt-1 text-[14px] text-[#4b5563] font-body">Define payment rules. Most-specific scope wins: Cohort &gt; Program &gt; Global.</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold rounded-[8px] transition-colors font-display">
          <PlusSignIcon size={16} color="white" strokeWidth={2} />
          New Setting
        </button>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)]">
        <div className="grid grid-cols-[80px_100px_100px_90px_110px_110px_90px_80px] px-4 py-2 bg-[#f9fafb] border-b border-[#eaecf0]">
          {['ID', 'Scope', 'Program', 'Cohort', 'Percentage', 'Flat Fee', 'Status', ''].map(h => (
            <span key={h} className="text-[11px] font-semibold uppercase tracking-widest text-[#98a2b3] font-display">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-[#f9fafb] rounded-[8px] animate-pulse" />)}
          </div>
        ) : settings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-[12px] bg-[#f3f4f6] flex items-center justify-center mb-4">
              <Settings01Icon size={28} color="#98a2b3" strokeWidth={1.5} />
            </div>
            <h4 className="text-[16px] font-semibold text-[#101828] font-display mb-2">No pay settings yet</h4>
            <p className="text-[14px] text-[#4b5563] font-body max-w-[300px] mb-4">
              Create a Global setting first to establish a base rate for all instructors.
            </p>
            <button onClick={() => setModal('new')}
              className="h-10 px-4 bg-[#d51520] hover:bg-[#b91c1c] text-white text-[14px] font-semibold rounded-[8px] font-display">
              New Setting
            </button>
          </div>
        ) : (
          settings.map(s => (
            <div key={s.id}
              className="grid grid-cols-[80px_100px_100px_90px_110px_110px_90px_80px] px-4 py-3 items-center border-b border-[#eaecf0] last:border-0 hover:bg-[#f9fafb] transition-colors">
              <span className="text-[13px] text-[#374151] font-body">#{s.id}</span>
              <ScopeBadge scope={s.scope ?? (!s.cohort_id && !s.program_id ? 'GLOBAL' : s.cohort_id ? 'COHORT' : 'PROGRAM')} />
              <span className="text-[13px] text-[#374151] font-body">{s.program_id ?? '—'}</span>
              <span className="text-[13px] text-[#374151] font-body">{s.cohort_id ?? '—'}</span>
              <span className="text-[13px] font-semibold text-[#111827] font-display">{s.percentage}%</span>
              <span className="text-[13px] text-[#374151] font-body">{s.min_flat_fee > 0 ? fmt(s.min_flat_fee) : '—'}</span>
              <StatusBadge status={s.status} />
              <div className="flex items-center gap-1 justify-end">
                <button onClick={() => setModal(s)}
                  className="p-1.5 rounded-[6px] hover:bg-[#f3f4f6] transition-colors" title="Edit">
                  <PencilEdit01Icon size={15} color="#374151" strokeWidth={1.5} />
                </button>
                <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id}
                  className="p-1.5 rounded-[6px] hover:bg-red-50 transition-colors" title="Delete">
                  <Delete01Icon size={15} color="#d51520" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <SettingModal
          editing={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}
    </div>
  )
}
