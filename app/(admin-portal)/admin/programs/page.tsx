'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen01Icon, Add01Icon, Loading01Icon, Cancel01Icon,
  AlertCircleIcon, PencilEdit01Icon, Delete01Icon, CheckmarkCircle01Icon,
} from 'hugeicons-react'
import { apiClient, unwrap, getApiError } from '@/lib/api-client'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ApiProgram {
  id: number
  title: string
  slug?: string
  type?: string
  level?: string
  format?: string
  status?: string
  description?: string
  main_price?: number; mainPrice?: number
  final_price?: number; finalPrice?: number
  modules_count?: number
  deleted_at?: string
}

interface Pagination { totalElements?: number; total_elements?: number; total?: number; totalPages: number; total_pages?: number; hasNext?: boolean; has_next?: boolean }

const LEVELS   = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']
const TYPES    = ['BOOTCAMP', 'WORKSHOP', 'COURSE']
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED']

const LEVEL_STYLE: Record<string, string> = {
  BEGINNER:     'bg-[#ecfdf3] text-[#027a48]',
  INTERMEDIATE: 'bg-[#eff6ff] text-[#1d4ed8]',
  ADVANCED:     'bg-[#fef2f2] text-[#d51520]',
}
const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: 'bg-[#ecfdf3] text-[#027a48]',
  DRAFT:     'bg-[#fffbeb] text-[#b45309]',
  ARCHIVED:  'bg-[#f3f4f6] text-[#4b5563]',
}

// ── Edit programme modal ───────────────────────────────────────────────────────
function EditProgramModal({
  program, onClose, onSaved,
}: { program: ApiProgram; onClose: () => void; onSaved: (updated: ApiProgram) => void }) {
  const [form, setForm] = useState({
    title:       program.title ?? '',
    description: program.description ?? '',
    level:       program.level ?? 'BEGINNER',
    type:        program.type ?? 'BOOTCAMP',
    status:      program.status ?? 'DRAFT',
  })
  const [saving, setSaving]       = useState(false)
  const [error,  setError]        = useState('')
  // Confirmation step when status changes in a significant way
  const [confirming, setConfirming] = useState<'publish' | 'offline' | null>(null)

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    const statusChanged = form.status !== (program.status ?? 'DRAFT')
    if (statusChanged && form.status === 'PUBLISHED') { setConfirming('publish'); return }
    if (statusChanged && form.status === 'DRAFT' && program.status === 'PUBLISHED') { setConfirming('offline'); return }
    doSave()
  }

  async function doSave() {
    setSaving(true); setConfirming(null); setError('')
    try {
      await apiClient.patch(`/admin/programs/${program.id}`, {
        title:       form.title.trim(),
        description: form.description.trim() || undefined,
        level:       form.level,
        type:        form.type,
        status:      form.status,
      })
      onSaved({ ...program, ...form })
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 px-4 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <h2 className="text-[15px] font-bold text-[#111827] font-display">Edit Programme</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Confirmation step ── */}
        {confirming && (
          <div className="px-6 py-6 flex flex-col gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${confirming === 'publish' ? 'bg-[#ecfdf3]' : 'bg-[#fffaeb]'}`}>
              {confirming === 'publish'
                ? <CheckmarkCircle01Icon size={20} color="#027a48" strokeWidth={1.5} />
                : <AlertCircleIcon size={20} color="#b45309" strokeWidth={1.5} />}
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#111827] font-display mb-1">
                {confirming === 'publish' ? 'Publish this programme?' : 'Take programme offline?'}
              </h3>
              <p className="text-[13px] text-[#4b5563] font-body leading-[1.6]">
                {confirming === 'publish'
                  ? <><span className="font-semibold text-[#374151]">{form.title}</span> will go live on the website. Students will be able to see and enrol.</>
                  : <><span className="font-semibold text-[#374151]">{form.title}</span> will be set back to Draft and hidden from the website. Existing enrolments are not affected.</>}
              </p>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setConfirming(null)}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
                Go Back
              </button>
              <button type="button" onClick={doSave} disabled={saving}
                className={`flex-1 h-10 rounded-[8px] text-[13px] font-semibold text-white font-display disabled:opacity-60 flex items-center justify-center gap-2 transition-colors ${
                  confirming === 'publish' ? 'bg-[#027a48] hover:bg-[#065f46]' : 'bg-[#b45309] hover:bg-[#92400e]'
                }`}>
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                {confirming === 'publish' ? 'Yes, Publish' : 'Yes, Take Offline'}
              </button>
            </div>
          </div>
        )}

        {/* ── Main form ── */}
        {!confirming && (
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Programme Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="AI in Software Engineering"
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10" />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} placeholder="Brief description of the programme…"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Level</label>
              <select value={form.level} onChange={e => set('level', e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Format</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}
                className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
                {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}
              className="w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
            </select>
            {form.status !== (program.status ?? 'DRAFT') && (
              <p className="text-[11px] text-[#b45309] font-body mt-1.5 flex items-center gap-1">
                <AlertCircleIcon size={11} color="#b45309" strokeWidth={1.5} />
                Status will change from {((program.status ?? 'DRAFT').charAt(0) + (program.status ?? 'DRAFT').slice(1).toLowerCase())} to {form.status.charAt(0) + form.status.slice(1).toLowerCase()} — you&apos;ll be asked to confirm.
              </p>
            )}
          </div>
          {error && (
            <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
              <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              Save Changes
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}

// ── Delete confirm modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({
  program, onClose, onDeleted,
}: { program: ApiProgram; onClose: () => void; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false)
  const [error,    setError]    = useState('')

  async function handleDelete() {
    setDeleting(true); setError('')
    try {
      await apiClient.delete(`/admin/programs/${program.id}`)
      onDeleted(program.id)
    } catch (err) { setError(getApiError(err)) } finally { setDeleting(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[400px] p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
          <Delete01Icon size={18} color="#d51520" strokeWidth={1.5} />
        </div>
        <h2 className="text-[15px] font-bold text-[#111827] font-display mb-1">Delete Programme?</h2>
        <p className="text-[13px] text-[#4b5563] font-body mb-5">
          <span className="font-semibold text-[#374151]">{program.title}</span> will be permanently deleted. This cannot be undone.
        </p>
        {error && (
          <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body mb-3">
            <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
          </p>
        )}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
            {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Create programme modal (2-step: details → pricing) ───────────────────────
type PricingKey = 'title' | 'planType' | 'ngn_base' | 'ngn_final' | 'usd_base' | 'usd_final' | 'gbp_base' | 'gbp_final'
type PlanForm   = Record<PricingKey, string>

const EMPTY_PLAN: PlanForm = {
  title: '', planType: 'INDIVIDUAL',
  ngn_base: '', ngn_final: '', usd_base: '', usd_final: '', gbp_base: '', gbp_final: '',
}

const CLS_IN  = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10'
const CLS_SEL = `${CLS_IN} bg-white`

function CreateProgramModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep]               = useState<1 | 2>(1)
  const [newProgramId, setNewProgramId] = useState<number | null>(null)
  const [programTitle, setProgramTitle] = useState('')

  const [form, setForm]     = useState({ title: '', type: 'BOOTCAMP', level: 'BEGINNER', status: 'DRAFT', description: '', main_price: '', final_price: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const [plan, setPlan]         = useState<PlanForm>(EMPTY_PLAN)
  const [planSaving, setPlanSaving] = useState(false)
  const [planError, setPlanError]   = useState('')

  function set(k: string, v: string)       { setForm(p => ({ ...p, [k]: v })) }
  function setP(k: PricingKey, v: string)  { setPlan(p => ({ ...p, [k]: v })) }

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!form.title.trim()) { setError('Title is required.'); return }
    if (!form.main_price || isNaN(parseFloat(form.main_price))) { setError('Original price is required.'); return }
    if (!form.final_price || isNaN(parseFloat(form.final_price))) { setError('Final price is required.'); return }
    setSaving(true)
    try {
      const res   = await apiClient.post('/admin/programs', {
        title: form.title.trim(), type: form.type, level: form.level,
        status: form.status, description: form.description.trim() || undefined,
        main_price: parseFloat(form.main_price),
        final_price: parseFloat(form.final_price),
      })
      const raw   = res.data as Record<string, unknown>
      const inner = (raw?.data ?? raw) as Record<string, unknown>
      const id    = inner?.id as number
      if (!id) throw new Error('Programme created but ID not returned')
      setNewProgramId(id); setProgramTitle(form.title.trim()); setStep(2)
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault(); setPlanError('')
    if (!plan.title.trim()) { setPlanError('Plan title is required.'); return }
    setPlanSaving(true)
    try {
      const planRes   = await apiClient.post('/admin/pricing-plans', {
        programId: newProgramId, title: plan.title.trim(),
        planType: plan.planType, status: 'ACTIVE', billingCycle: 'ONEOFF',
      })
      // Plan was created — extract ID from whatever shape the API returns
      const planRaw   = planRes.data as Record<string, unknown>
      const planInner = (planRaw?.data ?? planRaw) as Record<string, unknown>
      const planId = (
        planInner?.id ??
        (planInner?.pricingPlan as Record<string, unknown>)?.id ??
        (planInner?.pricing_plan as Record<string, unknown>)?.id ??
        (planInner?.plan as Record<string, unknown>)?.id ??
        planRaw?.id
      ) as number | undefined

      // Best-effort: attach currency breakdowns if we got an ID back.
      // Use allSettled so a breakdown failure never blocks onCreated().
      if (planId) {
        const currencies = [
          { code: 'NGN', base: plan.ngn_base, final: plan.ngn_final },
          { code: 'USD', base: plan.usd_base, final: plan.usd_final },
          { code: 'GBP', base: plan.gbp_base, final: plan.gbp_final },
        ].filter(c => c.base || c.final)

        if (currencies.length > 0) {
          await Promise.allSettled(currencies.map(c =>
            apiClient.post(`/admin/pricing-plans/${planId}/breakdowns`, {
              currency:   c.code,
              basePrice:  c.base  ? parseFloat(c.base)  : undefined,
              finalPrice: c.final ? parseFloat(c.final) : undefined,
            })
          ))
        }
      }

      // Always close on success — the plan exists regardless of breakdown result
      onCreated()
    } catch (err) { setPlanError(getApiError(err)) } finally { setPlanSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/40 px-4 overflow-y-auto py-10" onClick={onClose}>
      <div className="bg-white rounded-[14px] shadow-xl w-full max-w-[520px] my-auto" onClick={e => e.stopPropagation()}>

        {/* Header + step indicator */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#f3f4f6]">
          <div>
            <h2 className="text-[15px] font-bold text-[#111827] font-display">New Programme</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="h-1.5 w-10 rounded-full bg-[#d51520]" />
              <div className={`h-1.5 w-10 rounded-full transition-colors ${step === 2 ? 'bg-[#d51520]' : 'bg-[#e5e7eb]'}`} />
              <span className="text-[11px] text-[#4b5563] font-body">Step {step} of 2</span>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={15} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>

        {/* ── Step 1: Programme details ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Programme Title</label>
              <input value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="AI in Software Engineering" className={CLS_IN} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Original Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#4b5563] font-body pointer-events-none">₦</span>
                  <input type="number" min="0" step="any"
                    value={form.main_price} onChange={e => set('main_price', e.target.value)}
                    placeholder="150000" className={`${CLS_IN} pl-7`} />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Final Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#4b5563] font-body pointer-events-none">₦</span>
                  <input type="number" min="0" step="any"
                    value={form.final_price} onChange={e => set('final_price', e.target.value)}
                    placeholder="120000" className={`${CLS_IN} pl-7`} />
                </div>
                <p className="text-[11px] text-[#9ca3af] mt-1 font-body">What students actually pay</p>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)}
                rows={3} placeholder="Brief description of the programme…"
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Level</label>
                <select value={form.level} onChange={e => set('level', e.target.value)} className={CLS_SEL}>
                  {LEVELS.map(l => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Format</label>
                <select value={form.type} onChange={e => set('type', e.target.value)} className={CLS_SEL}>
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={CLS_SEL}>
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {error}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Next: Set Up Pricing
              </button>
            </div>
          </form>
        )}

        {/* ── Step 2: Pricing plan ── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="px-6 py-5 flex flex-col gap-4">
            <div className="bg-[#f9fafb] rounded-[8px] px-4 py-3">
              <p className="text-[12px] text-[#4b5563] font-body">
                Set up pricing for <span className="font-semibold text-[#111827]">{programTitle}</span>. You can add more plans from the programme page.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Plan Title</label>
                <input value={plan.title} onChange={e => setP('title', e.target.value)}
                  placeholder="Individual Plan" className={CLS_IN} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#374151] font-body mb-1.5">Plan Type</label>
                <select value={plan.planType} onChange={e => setP('planType', e.target.value)} className={CLS_SEL}>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="TEAM">Team</option>
                  <option value="CORPORATE">Corporate</option>
                </select>
              </div>
            </div>

            {/* Currency price grid */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#374151] font-display mb-2">Prices by Currency</p>
              <div className="rounded-[8px] border border-[#e5e7eb] overflow-hidden">
                <div className="grid grid-cols-[100px_1fr_1fr] bg-[#f9fafb] border-b border-[#e5e7eb]">
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display">Currency</div>
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display border-l border-[#e5e7eb]">Base Price</div>
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-[#4b5563] font-display border-l border-[#e5e7eb]">Final Price</div>
                </div>
                {([
                  { code: 'NGN', label: '₦ NGN', bk: 'ngn_base' as PricingKey, fk: 'ngn_final' as PricingKey },
                  { code: 'USD', label: '$ USD', bk: 'usd_base' as PricingKey, fk: 'usd_final' as PricingKey },
                  { code: 'GBP', label: '£ GBP', bk: 'gbp_base' as PricingKey, fk: 'gbp_final' as PricingKey },
                ] as const).map((c, i) => (
                  <div key={c.code} className={`grid grid-cols-[100px_1fr_1fr] ${i < 2 ? 'border-b border-[#e5e7eb]' : ''}`}>
                    <div className="px-3 py-2.5 flex items-center">
                      <span className="text-[12px] font-semibold text-[#111827] font-body">{c.label}</span>
                    </div>
                    <div className="border-l border-[#e5e7eb] px-2 py-1.5">
                      <input type="number" min="0" value={plan[c.bk]} onChange={e => setP(c.bk, e.target.value)}
                        placeholder="0.00" className="w-full h-8 px-2 text-[12px] font-body text-[#111827] outline-none rounded-[4px] bg-transparent focus:bg-[#f9fafb]" />
                    </div>
                    <div className="border-l border-[#e5e7eb] px-2 py-1.5">
                      <input type="number" min="0" value={plan[c.fk]} onChange={e => setP(c.fk, e.target.value)}
                        placeholder="0.00" className="w-full h-8 px-2 text-[12px] font-body text-[#111827] outline-none rounded-[4px] bg-transparent focus:bg-[#f9fafb]" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#4b5563] font-body mt-1">Leave a row empty to skip that currency. Billing is One-off.</p>
            </div>

            {planError && (
              <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body">
                <AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} /> {planError}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onCreated}
                className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium font-body hover:bg-[#f9fafb] transition-colors">
                Skip for Now
              </button>
              <button type="submit" disabled={planSaving}
                className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-60 flex items-center justify-center gap-2">
                {planSaving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Save &amp; Finish
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminProgramsPage() {
  const router = useRouter()
  const [programs, setPrograms]       = useState<ApiProgram[]>([])
  const [pagination, setPagination]   = useState<Pagination | null>(null)
  const [page, setPage]               = useState(1)
  const [loading, setLoading]         = useState(true)
  const [showCreate, setShowCreate]       = useState(false)
  const [editProgram, setEditProgram]     = useState<ApiProgram | null>(null)
  const [deleteProgram, setDeleteProgram] = useState<ApiProgram | null>(null)

  const fetchPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiClient.get(`/admin/programs?page=${page}&size=20`)
      const data = unwrap<{ programs?: ApiProgram[]; pagination?: Pagination }>(res.data)
      setPrograms(Array.isArray(data?.programs) ? data.programs : [])
      if (data?.pagination) setPagination(data.pagination)
    } catch { setPrograms([]) } finally { setLoading(false) }
  }, [page])

  useEffect(() => { fetchPrograms() }, [fetchPrograms])

  function handleEdited(updated: ApiProgram) {
    setPrograms(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
    setEditProgram(null)
  }

  function handleDeleted(id: number) {
    setPrograms(prev => prev.filter(p => p.id !== id))
    setDeleteProgram(null)
  }

  function formatPrice(p?: number) {
    if (!p) return '—'
    return `₦${p.toLocaleString('en-NG')}`
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div />
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 h-10 px-4 bg-[#d51520] text-white rounded-[8px] text-[13px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={15} strokeWidth={2} /> New Programme
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Programme', 'Level', 'Format', 'Final Price', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#f3f4f6]">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: j === 0 ? 200 : 80 }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <BookOpen01Icon size={32} color="#d1d5db" strokeWidth={1.5} className="mx-auto mb-3" />
                    <p className="text-[14px] font-semibold text-[#111827] font-display">No programmes yet</p>
                    <p className="text-[13px] text-[#4b5563] font-body mt-1">Create your first programme to get started</p>
                  </td>
                </tr>
              ) : (
                programs.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/admin/programs/${p.id}`)}
                    className="border-b border-[#f3f4f6] hover:bg-[#fafafa] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <p className="text-[13px] font-semibold text-[#111827] font-display">{p.title}</p>
                      {p.description && (
                        <p className="text-[12px] text-[#4b5563] font-body mt-0.5 line-clamp-1 max-w-[320px]">{p.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {p.level
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${LEVEL_STYLE[p.level] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                            {p.level.charAt(0) + p.level.slice(1).toLowerCase()}
                          </span>
                        : <span className="text-[#d1d5db]">—</span>
                      }
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[12px] text-[#4b5563] font-body">{p.type ? p.type.charAt(0) + p.type.slice(1).toLowerCase() : '—'}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[13px] font-medium text-[#111827] font-body">
                        {formatPrice(p.finalPrice ?? p.final_price)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {p.status
                        ? <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[p.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>
                            {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                          </span>
                        : <span className="text-[#d1d5db]">—</span>
                      }
                    </td>
                    {/* Inline actions — stop propagation so row click doesn't fire */}
                    <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditProgram(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6] transition-colors"
                          title="Edit programme">
                          <PencilEdit01Icon size={14} color="#4b5563" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => setDeleteProgram(p)}
                          className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#fef2f2] transition-colors"
                          title="Delete programme">
                          <Delete01Icon size={14} color="#d51520" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && (pagination.totalPages ?? pagination.total_pages ?? 1) > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">
              Page {page} of {pagination.totalPages ?? pagination.total_pages ?? 1}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb]">
                Prev
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination.hasNext ?? pagination.has_next)}
                className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body text-[#374151] disabled:opacity-40 hover:bg-[#f9fafb]">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProgramModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchPrograms() }} />
      )}
      {editProgram && (
        <EditProgramModal program={editProgram} onClose={() => setEditProgram(null)} onSaved={handleEdited} />
      )}
      {deleteProgram && (
        <DeleteConfirmModal program={deleteProgram} onClose={() => setDeleteProgram(null)} onDeleted={handleDeleted} />
      )}
    </div>
  )
}
