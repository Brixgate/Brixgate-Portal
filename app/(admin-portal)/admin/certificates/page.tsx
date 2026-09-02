'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Award01Icon, Certificate01Icon, Add01Icon, PencilEdit01Icon,
  Delete01Icon, Loading01Icon, AlertCircleIcon, Cancel01Icon,
} from 'hugeicons-react'
import { apiClient, getApiError } from '@/lib/api-client'

// ── Certificate Types ──────────────────────────────────────────────────────────
interface CertType {
  id: number
  name?: string; title?: string
  code?: string
  category?: string
  description?: string
  status?: string
  template_url?: string; templateUrl?: string
  created_at?: string; createdAt?: string
}

// ── Issued Certificates ────────────────────────────────────────────────────────
interface IssuedCert {
  id: number
  status?: string
  issued_at?: string; issuedAt?: string
  created_at?: string; createdAt?: string
  certificate_number?: string; certificateNumber?: string
  // flat cohort fields
  cohort_id?: number;    cohortId?: number
  cohort_title?: string; cohortTitle?: string
  cohort_name?: string;  cohortName?: string
  user?: { id?: number; name?: string; first_name?: string; firstName?: string; last_name?: string; lastName?: string; email?: string }
  program?: { id?: number; title?: string }
  cohort?: { id?: number; title?: string; name?: string }
  certificate?: {
    id?: number
    cohort_id?: number; cohortId?: number
    cohort?: { id?: number; title?: string; name?: string }
  }
  certificate_type?: { id?: number; name?: string; title?: string }
}

function certCohortLabel(c: IssuedCert): string {
  const name = c.cohort?.title ?? c.cohort?.name
    ?? c.certificate?.cohort?.title ?? c.certificate?.cohort?.name
    ?? c.cohort_title ?? c.cohortTitle ?? c.cohort_name ?? c.cohortName
  if (name) return name
  const id = c.cohort?.id ?? c.cohort_id ?? c.cohortId
    ?? c.certificate?.cohort_id ?? c.certificate?.cohortId ?? c.certificate?.cohort?.id
  return id ? `Cohort #${id}` : '—'
}

interface Pagination {
  totalElements?: number; total_elements?: number; total?: number
  totalPages?: number; total_pages?: number
  hasNext?: boolean; has_next?: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function certTypeName(t: CertType) { return t.name ?? t.title ?? `Type #${t.id}` }
function certUserName(u?: IssuedCert['user']): string {
  if (!u) return '—'
  if (u.name) return u.name
  return `${u.firstName ?? u.first_name ?? ''} ${u.lastName ?? u.last_name ?? ''}`.trim() || u.email || '—'
}
function fmtDate(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: 'bg-[#ecfdf3] text-[#027a48]', INACTIVE: 'bg-[#f3f4f6] text-[#4b5563]',
  ISSUED: 'bg-[#ecfdf3] text-[#027a48]', PENDING: 'bg-[#fffbeb] text-[#b45309]', REVOKED: 'bg-[#fef2f2] text-[#d51520]',
}

// ── CertType Form Modal ───────────────────────────────────────────────────────
function CertTypeModal({ editing, onClose, onSaved }: {
  editing: CertType | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name,     setName]        = useState(editing ? certTypeName(editing) : '')
  const [code,     setCode]        = useState(editing?.code ?? '')
  const [category, setCategory]    = useState(editing?.category ?? 'COMPLETION')
  const [codeEdited, setCodeEdited] = useState(false)
  const [desc,     setDesc]        = useState(editing?.description ?? '')
  const [tmpl,     setTmpl]        = useState(editing?.template_url ?? editing?.templateUrl ?? '')
  const [status,   setStatus]      = useState(editing?.status ?? 'ACTIVE')
  const [saving,   setSaving]      = useState(false)
  const [error,    setError]       = useState('')

  function nameToCode(n: string) {
    return n.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '')
  }

  function handleNameChange(v: string) {
    setName(v)
    if (!codeEdited) setCode(nameToCode(v))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!name.trim()) { setError('Name is required.'); return }
    if (!code.trim()) { setError('Code is required.'); return }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        code: code.trim().toUpperCase().replace(/\s+/g, '_'),
        category,
        description: desc.trim() || undefined,
        template_url: tmpl.trim() || undefined,
        status,
      }
      if (editing) {
        await apiClient.patch(`/admin/certificate-types/${editing.id}`, payload)
      } else {
        await apiClient.post('/admin/certificate-types', payload)
      }
      onSaved()
    } catch (err) { setError(getApiError(err)) } finally { setSaving(false) }
  }

  const cls = 'w-full h-10 px-3 border border-[#e5e7eb] rounded-[6px] text-[13px] font-body outline-none focus:border-[#d51520] focus:ring-2 focus:ring-[#d51520]/10 bg-white'
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[59]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[480px] overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#f3f4f6] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#111827] font-display">{editing ? 'Edit Certificate Type' : 'New Certificate Type'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f4f6]">
            <Cancel01Icon size={16} color="#4b5563" strokeWidth={1.5} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Name <span className="text-[#d51520]">*</span></label>
            <input value={name} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Certificate of Attendance" className={cls} />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">
              Code <span className="text-[#d51520]">*</span>
              <span className="text-[#9ca3af] font-normal ml-1">(auto-generated, editable)</span>
            </label>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')); setCodeEdited(true) }}
              placeholder="e.g. CERT_OF_ATTENDANCE"
              className={cls}
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Category <span className="text-[#d51520]">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={cls}>
              <option value="COMPLETION">Completion</option>
              <option value="ATTENDANCE">Attendance</option>
              <option value="ACHIEVEMENT">Achievement</option>
              <option value="PARTICIPATION">Participation</option>
              <option value="EXCELLENCE">Excellence</option>
            </select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Optional description" className={`${cls} h-auto py-2 resize-none`} />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Template URL <span className="text-[#9ca3af]">(optional — can attach later)</span></label>
            <input value={tmpl} onChange={e => setTmpl(e.target.value)} placeholder="https://..." className={cls} />
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#374151] font-body block mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className={cls}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          {error && <p className="flex items-center gap-1.5 text-[12px] text-[#d51520] font-body"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb]">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2">
              {saving && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
              {editing ? 'Save Changes' : 'Create Type'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Tab: Certificate Types ────────────────────────────────────────────────────
function CertTypesTab() {
  const [types, setTypes]       = useState<CertType[]>([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]   = useState<CertType | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CertType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/admin/certificate-types?size=100')
      const raw = res.data?.data ?? res.data
      const inner = raw?.data ?? raw
      const list: CertType[] = Array.isArray(inner)                         ? inner
        : Array.isArray(inner?.certificate_types) ? inner.certificate_types
        : Array.isArray(inner?.content)           ? inner.content
        : Array.isArray(inner?.types)             ? inner.types
        : []
      setTypes(list)
    } catch { setTypes([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function doDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    try {
      await apiClient.delete(`/admin/certificate-types/${deleteTarget.id}`)
      setDeleteTarget(null)
      load()
    } catch (e) { setDeleteError(getApiError(e)) } finally { setDeleting(false) }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <p className="text-[14px] text-[#4b5563] font-body">{types.length} type{types.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 h-9 px-4 bg-[#d51520] text-white rounded-[8px] text-[12px] font-semibold font-display hover:bg-[#b81119] transition-colors">
          <Add01Icon size={14} strokeWidth={2} /> Create Certificate Type
        </button>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
              {['Name', 'Description', 'Template', 'Status', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-[#f3f4f6]">
                {[160, 200, 120, 70, 60].map((w, j) => (
                  <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                ))}
              </tr>
            )) : types.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-16 text-center">
                <div className="w-16 h-16 rounded-[12px] bg-[#f9fafb] flex items-center justify-center mx-auto mb-4">
                  <Award01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-semibold text-[#111827] font-display mb-1">No certificate types yet</p>
                <p className="text-[13px] text-[#4b5563] font-body">Create types like &quot;Certificate of Attendance&quot; or &quot;Certificate of Completion&quot;</p>
              </td></tr>
            ) : types.map(t => (
              <tr key={t.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#fef2f2] flex items-center justify-center flex-shrink-0">
                      <Certificate01Icon size={15} color="#d51520" strokeWidth={1.5} />
                    </div>
                    <p className="text-[13px] font-semibold text-[#111827] font-display">{certTypeName(t)}</p>
                  </div>
                </td>
                <td className="px-4 py-3.5"><p className="text-[13px] text-[#4b5563] font-body max-w-[240px] truncate">{t.description || '—'}</p></td>
                <td className="px-4 py-3.5">
                  {(t.template_url ?? t.templateUrl)
                    ? <span className="text-[11px] font-semibold text-[#027a48] bg-[#ecfdf3] px-2 py-0.5 rounded-full font-display">Attached</span>
                    : <span className="text-[11px] text-[#9ca3af] font-body">Not attached</span>
                  }
                </td>
                <td className="px-4 py-3.5">
                  {t.status && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[t.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>{t.status}</span>}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => { setEditing(t); setShowModal(true) }} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#f3f4f6]">
                      <PencilEdit01Icon size={13} color="#374151" strokeWidth={1.5} />
                    </button>
                    <button onClick={() => setDeleteTarget(t)} className="w-7 h-7 flex items-center justify-center rounded-[6px] hover:bg-[#fef2f2]">
                      <Delete01Icon size={13} color="#d51520" strokeWidth={1.5} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <CertTypeModal editing={editing} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}

      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 z-[59]" onClick={() => setDeleteTarget(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-[12px] shadow-[0px_12px_32px_rgba(16,24,40,0.16)] w-[400px] p-6">
            <div className="w-12 h-12 rounded-full bg-[#fef2f2] flex items-center justify-center mb-4">
              <Delete01Icon size={20} color="#d51520" strokeWidth={1.5} />
            </div>
            <h3 className="text-[15px] font-bold text-[#111827] font-display mb-1">Delete Certificate Type</h3>
            <p className="text-[13px] text-[#4b5563] font-body mb-5">
              Delete <span className="font-semibold text-[#111827]">{certTypeName(deleteTarget)}</span>? This cannot be undone.
            </p>
            {deleteError && <p className="text-[12px] text-[#d51520] font-body mb-3 flex items-center gap-1.5"><AlertCircleIcon size={13} color="#d51520" strokeWidth={1.5} />{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 h-10 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-body hover:bg-[#f9fafb]">Cancel</button>
              <button onClick={doDelete} disabled={deleting} className="flex-1 h-10 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2">
                {deleting && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Tab: Issued Certificates ──────────────────────────────────────────────────
function IssuedCertsTab() {
  const [certs, setCerts]           = useState<IssuedCert[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [page, setPage]             = useState(1)
  const [statusFilter, setStatus]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [revokeTarget, setRevokeTarget] = useState<IssuedCert | null>(null)
  const [revoking, setRevoking]         = useState(false)
  const [revokeError, setRevokeError]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), size: '20' })
      if (statusFilter) p.set('status', statusFilter)
      const res  = await apiClient.get(`/admin/user-certificates?${p}`)
      const raw  = res.data?.data ?? res.data
      const inner = raw?.data ?? raw
      const list: IssuedCert[] = Array.isArray(inner)           ? inner
        : Array.isArray(inner?.certificates)                      ? inner.certificates
        : Array.isArray(inner?.userCertificates)                  ? inner.userCertificates
        : Array.isArray(inner?.content)                           ? inner.content
        : []
      setCerts(list)
      const pg = inner?.pagination ?? inner?.page ?? raw?.pagination ?? null
      if (pg) setPagination(pg)
    } catch { setCerts([]) } finally { setLoading(false) }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  async function doRevoke() {
    if (!revokeTarget) return
    setRevoking(true); setRevokeError('')
    try {
      await apiClient.delete(`/admin/user-certificates/${revokeTarget.id}`)
      setCerts(prev => prev.filter(c => c.id !== revokeTarget.id))
      setRevokeTarget(null)
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setRevokeError(msg ?? 'Failed to revoke. Try again.')
    } finally { setRevoking(false) }
  }

  const totalPages = pagination?.totalPages ?? pagination?.total_pages ?? 1

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <select value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="h-9 px-3 border border-[#e5e7eb] rounded-[8px] text-[13px] font-body outline-none focus:border-[#d51520] bg-white">
          {['', 'PENDING', 'ISSUED', 'REVOKED'].map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[10px] border border-[#eaecf0] shadow-[0px_1px_2px_rgba(16,24,40,.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#f3f4f6]">
                {['Student', 'Email', 'Certificate Type', 'Programme', 'Cohort', 'Status', 'Issued', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#4b5563] font-display">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#f3f4f6]">
                  {[130, 160, 140, 140, 100, 70, 90].map((w, j) => (
                    <td key={j} className="px-4 py-3.5"><div className="h-4 bg-[#f3f4f6] rounded animate-pulse" style={{ width: w }} /></td>
                  ))}
                </tr>
              )) : certs.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center">
                  <div className="w-16 h-16 rounded-[12px] bg-[#f9fafb] flex items-center justify-center mx-auto mb-4">
                    <Certificate01Icon size={28} color="#d1d5db" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold text-[#111827] font-display">No certificates found</p>
                </td></tr>
              ) : certs.map(c => (
                <tr key={c.id} className="border-b border-[#f3f4f6] hover:bg-[#fafafa]">
                  <td className="px-4 py-3.5"><p className="text-[13px] font-medium text-[#111827] font-body">{certUserName(c.user)}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{c.user?.email ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[13px] text-[#374151] font-body">{c.certificate_type?.name ?? c.certificate_type?.title ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[13px] text-[#374151] font-body">{c.program?.title ?? '—'}</p></td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{certCohortLabel(c)}</p></td>
                  <td className="px-4 py-3.5">
                    {c.status && <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold font-display ${STATUS_STYLE[c.status] ?? 'bg-[#f3f4f6] text-[#374151]'}`}>{c.status}</span>}
                  </td>
                  <td className="px-4 py-3.5"><p className="text-[12px] text-[#4b5563] font-body">{fmtDate(c.issuedAt ?? c.issued_at ?? c.createdAt ?? c.created_at)}</p></td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => { setRevokeTarget(c); setRevokeError('') }}
                      className="h-7 px-3 rounded-[6px] border border-[#fecaca] text-[11px] font-semibold text-[#d51520] font-display hover:bg-[#fef2f2] transition-colors">
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-[#f3f4f6]">
            <p className="text-[12px] text-[#4b5563] font-body">Page {page} of {totalPages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={!(pagination?.hasNext ?? pagination?.has_next)} className="h-7 px-3 rounded-[6px] border border-[#e5e7eb] text-[12px] font-body disabled:opacity-40 hover:bg-[#f9fafb]">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Revoke confirm dialog */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[12px] shadow-lg w-full max-w-sm p-6">
            <h3 className="text-[15px] font-bold text-[#111827] font-display mb-2">Revoke certificate?</h3>
            <p className="text-[13px] text-[#4b5563] font-body mb-4">
              This will revoke <span className="font-semibold text-[#111827]">{certUserName(revokeTarget.user)}</span>&#39;s certificate and remove it from their portal. This cannot be undone.
            </p>
            {revokeError && <p className="text-[12px] text-[#d51520] font-body mb-3">{revokeError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setRevokeTarget(null)} disabled={revoking}
                className="flex-1 h-9 rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] font-display hover:bg-[#f9fafb] disabled:opacity-50">
                Cancel
              </button>
              <button onClick={doRevoke} disabled={revoking}
                className="flex-1 h-9 rounded-[8px] bg-[#d51520] text-[13px] font-semibold text-white font-display hover:bg-[#b81119] disabled:opacity-50 flex items-center justify-center gap-2">
                {revoking && <Loading01Icon size={13} className="animate-spin" strokeWidth={2} />}
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
type CertTab = 'types' | 'certs'

export default function AdminCertificatesPage() {
  const [tab, setTab] = useState<CertTab>('types')

  const tabs: { key: CertTab; label: string; icon: React.ReactNode }[] = [
    { key: 'types', label: 'Certificate Types', icon: <Award01Icon size={14} strokeWidth={1.5} /> },
    { key: 'certs', label: 'Certificates',      icon: <Certificate01Icon size={14} strokeWidth={1.5} /> },
  ]

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-0 bg-white border-b border-[#f3f4f6] flex-shrink-0">
        <div className="mb-4">
          <h1 className="text-[22px] font-bold text-[#111827] font-display">Certificates</h1>
          <p className="text-[13px] text-[#4b5563] font-body mt-0.5">Issue and manage student certificates</p>
        </div>
        <div className="flex items-center gap-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-[13px] font-semibold font-display border-b-2 transition-colors ${
                tab === t.key ? 'border-[#d51520] text-[#d51520]' : 'border-transparent text-[#4b5563] hover:text-[#374151]'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-[#f9fafb]">
        {tab === 'types' ? <CertTypesTab /> : <IssuedCertsTab />}
      </div>
    </div>
  )
}
