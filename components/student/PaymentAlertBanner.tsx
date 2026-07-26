'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertCircleIcon, LockIcon, ArrowRight01Icon } from 'hugeicons-react'
import { apiClient } from '@/lib/api-client'

interface PlanSummary {
  id: number
  status: string
  installments?: { status: string }[]
  payment_schedule?: { status: string }[]
}

type AlertLevel = 'overdue' | 'suspended' | null

export default function PaymentAlertBanner() {
  const [level, setLevel] = useState<AlertLevel>(null)

  useEffect(() => {
    async function check() {
      try {
        const res = await apiClient.get('/me/enrollment-payment-plans')
        const raw = res.data
        const list: PlanSummary[] = Array.isArray(raw) ? raw : (raw?.data ?? [])

        let highest: AlertLevel = null
        for (const plan of list) {
          if (plan.status === 'SUSPENDED' || plan.status === 'DEFAULTED') {
            highest = 'suspended'
            break
          }
          const insts = plan.installments ?? plan.payment_schedule ?? []
          if (insts.some((i: { status: string }) => i.status === 'OVERDUE')) {
            highest = 'overdue'
          }
        }
        setLevel(highest)
      } catch {
        // Silent — don't break the dashboard if this fails
      }
    }
    check()
  }, [])

  if (!level) return null

  if (level === 'suspended') {
    return (
      <div className="flex items-center justify-between gap-4 bg-[#fef2f2] border border-[#fecdca] rounded-[10px] px-5 py-4 mb-5">
        <div className="flex items-center gap-3">
          <LockIcon size={18} color="#d51520" strokeWidth={1.5} className="flex-shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-[#d51520] font-display">Your access has been suspended</p>
            <p className="text-[12px] text-[#6b7280] font-body mt-0.5">
              An overdue payment has suspended your access. Pay to restore it immediately.
            </p>
          </div>
        </div>
        <Link
          href="/student/finance"
          className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold font-display px-3 py-1.5 rounded-[6px] bg-[#d51520] text-white hover:bg-[#b81119] transition-colors whitespace-nowrap"
        >
          Pay to restore
          <ArrowRight01Icon size={12} strokeWidth={2} />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-[10px] px-5 py-4 mb-5">
      <div className="flex items-center gap-3">
        <AlertCircleIcon size={18} color="#d97706" strokeWidth={1.5} className="flex-shrink-0" />
        <p className="text-[13px] font-medium text-amber-800 font-body">
          You have an outstanding payment due. Pay now to maintain access.
        </p>
      </div>
      <Link
        href="/student/finance"
        className="flex-shrink-0 inline-flex items-center gap-1.5 text-[12px] font-semibold font-display px-3 py-1.5 rounded-[6px] border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors whitespace-nowrap"
      >
        View plan
        <ArrowRight01Icon size={12} strokeWidth={2} />
      </Link>
    </div>
  )
}
