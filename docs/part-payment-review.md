# Part Payment Feature — Frontend Implementation Review

> **Prepared for:** Dev Lead review  
> **Date:** 26 Jul 2026  
> **Branch:** `dev`  
> **Scope:** Everything frontend has built for the instalment / part-payment feature. Please confirm we hit the right endpoints and payload shapes, and flag anything we need to change.

---

## 1. Student Portal — Finance Page (`/student/finance`)

### What it does
A dedicated **Finance** page (reachable from the sidebar) that shows a student their:
- Active payment plans and instalment schedules
- Wallet balance and recent transactions
- Ability to pay an outstanding instalment

### API calls made

| Action | Method + Path | Request body / params |
|---|---|---|
| Load wallet | `GET /me/wallet` | — |
| Load plan list | `GET /me/enrollment-payment-plans` | — |
| Load per-plan detail (instalments) | `GET /me/enrollment-payment-plans/{id}` | called per plan from the list |
| Pay an instalment | `POST /payments/initiate` | `{ payment_type: "ENROLLMENT", entity_id: <cohortId>, pricing_plan_id: <id>, enrollment_payment_plan_id: <id>, payment_method: "PAYSTACK" }` |

### Payment initiation flow
1. Student clicks **Pay Now** on an instalment.
2. Frontend calls `POST /payments/initiate` with the payload above.
3. Backend returns `authorization_url`.
4. Frontend redirects: `window.location.href = authorization_url`.
5. After Paystack redirect returns, student is taken back to `/student/finance`. No re-query is implemented yet — page just re-fetches the plan list on mount.

> **Question for dev lead:** What is the correct redirect URL / callback URL we should tell Paystack to send the student back to? And should we call a requery endpoint on return?

### Plan status handling

| Status | UI treatment |
|---|---|
| `UPCOMING` | Normal row — blue badge |
| `OVERDUE` | Amber inline warning strip with "Pay Now" CTA |
| `SUSPENDED` | Red locked strip — content access flagged as suspended, "Pay to restore access" CTA |
| `DEFAULTED` | Same as SUSPENDED (red strip) |
| `PAID` | Green badge, row greyed out, no CTA |

### Wallet
- Displays available balance in ₦.
- Shows up to 10 recent wallet ledger entries.
- Wallet credit is applied **automatically by the backend** at checkout — the portal only displays the balance, it does not deduct it manually.

---

## 2. Student Portal — Dashboard Payment Alert Banner

**File:** `components/student/PaymentAlertBanner.tsx`

On every dashboard load the component silently polls `GET /me/enrollment-payment-plans`. If any plan has an overdue instalment or the plan status is `SUSPENDED`/`DEFAULTED`, a banner appears at the top of the dashboard linking to `/student/finance`. No separate API call — reuses the same plans endpoint.

---

## 3. Admin Portal — Payment Options (under Programme Pricing)

**Location:** Programme detail page → Pricing tab → per-breakdown "Payment Options" button.

### What it does
Allows admins to define which payment modes are available for a given pricing breakdown (e.g. the NGN breakdown of a plan). Multiple options can exist on one breakdown.

### API calls made

| Action | Method + Path | Request body |
|---|---|---|
| List options | `GET /admin/pricing-plans/{planId}/breakdowns/{breakdownId}/payment-options` | — |
| Create option | `POST /admin/pricing-plans/{planId}/breakdowns/{breakdownId}/payment-options` | See payload below |
| Enable option | `PATCH /admin/pricing-plans/{planId}/breakdowns/{breakdownId}/payment-options/{optId}/enable` | — |
| Disable option | `PATCH /admin/pricing-plans/{planId}/breakdowns/{breakdownId}/payment-options/{optId}/disable` | — |
| Delete option | `DELETE /admin/pricing-plans/{planId}/breakdowns/{breakdownId}/payment-options/{optId}` | — |

### Create payload — Full Payment
```json
{
  "payment_mode": "FULL",
  "grace_period_days": 5,
  "suspend_access_on_overdue": true
}
```

### Create payload — Fixed Instalments (Equal splits)
```json
{
  "payment_mode": "FIXED_INSTALLMENT",
  "installment_calculation_type": "EQUAL",
  "number_of_installments": 3,
  "grace_period_days": 5,
  "suspend_access_on_overdue": true
}
```

### Create payload — Fixed Instalments (Custom amounts)
```json
{
  "payment_mode": "FIXED_INSTALLMENT",
  "installment_calculation_type": "CUSTOM",
  "number_of_installments": 3,
  "grace_period_days": 5,
  "suspend_access_on_overdue": true,
  "installment_schedule": [
    { "amount_type": "PERCENTAGE", "amount_value": "50", "due_offset_days": "0" },
    { "amount_type": "PERCENTAGE", "amount_value": "30", "due_offset_days": "30" },
    { "amount_type": "PERCENTAGE", "amount_value": "20", "due_offset_days": "60" }
  ]
}
```

### Create payload — Flexible Part Payment
```json
{
  "payment_mode": "FLEXIBLE_PART_PAYMENT",
  "grace_period_days": 5,
  "suspend_access_on_overdue": true
}
```

> **Question for dev lead:** Is `installment_schedule` the correct field name? Also confirm `amount_type` values: `FIXED_AMOUNT` vs `PERCENTAGE` — are both supported?

---

## 4. Admin Portal — Cohort Payments Tab

**Location:** Cohort detail page → Payments tab.

### What it does
Shows the admin a financial overview of a cohort: total enrolled, revenue collected, outstanding balance, and a per-student payment table.

### API call

| Action | Method + Path |
|---|---|
| Load overview | `GET /admin/cohorts/{cohortId}/payment-overview` |

### Expected response shape (what we're reading)
```ts
{
  total_enrolled: number,
  revenue_collected: number,  // or revenueCollected
  outstanding: number,
  students: [
    {
      userId: number,
      name: string,
      email: string,
      payment_mode: string,    // or paymentMode — FULL / FIXED_INSTALLMENT / etc.
      status: string,          // PAID / UPCOMING / OVERDUE / SUSPENDED
      total_paid: number,      // or totalPaid
      outstanding: number,
      next_due: string,        // or nextDue — date string
    }
  ]
}
```

> **Question for dev lead:** Please confirm the exact field names in the `payment-overview` response (camelCase vs snake_case). We handle both in the UI with nullish-coalescing but would prefer to lock down the correct one.

Row click on a student navigates to their full profile at `/admin/users/{userId}`.

---

## 5. Admin Portal — Student Payment Plan Management (`/admin/users/{userId}`)

**Reached by:** Clicking a student row in any cohort's People tab.

### What it does
Full student profile view with three panels:
1. **User info** — name, email, phone, role, cohort
2. **Payment plans** — each plan expandable to show instalment schedule with paid/upcoming/overdue badges and a progress bar
3. **Wallet** — balance + up to 10 ledger entries + Adjust Balance modal

### API calls made

| Action | Method + Path | Request body |
|---|---|---|
| Load user details | `GET /admin/users/{userId}` | — |
| Load plan list | `GET /admin/enrollment-payment-plans?user_id={userId}&size=50` | — |
| Load per-plan detail | `GET /admin/enrollment-payment-plans/{id}` | called per plan |
| Load wallet | `GET /admin/users/{userId}/wallet` | — |
| Adjust wallet balance | `POST /admin/users/{userId}/wallet/adjust` | `{ type: "CREDIT"/"DEBIT", amount: number, reason: string }` |

> **Question for dev lead:** Is `POST /admin/users/{userId}/wallet/adjust` correct for wallet adjustments? And is `type` the right field name (vs `adjustment_type` or `operation`)?

---

## 6. Certificates — Bulk Issuance (Admin)

While not part-payment strictly, this was built alongside it.

### API call
| Action | Method + Path | Request body |
|---|---|---|
| Bulk issue certificates | `POST /admin/user-certificates/issue` | `{ cohort_id: number, user_ids: number[] }` |

> **Question for dev lead:** The payload example you shared included `certificate_id` and `file_url`. We currently omit both — do they need to be sent? If yes, where does `certificate_id` come from in the admin flow, and is `file_url` required or optional?

---

## 7. Certificates — PDF Download (Student)

The HTML certificate template (`public/certificate-template.html`) is fetched client-side, student data is injected into `{{PLACEHOLDER}}` tokens, and the result opens in a new window for browser print-to-PDF.

**Placeholders we inject:**

| Placeholder | Source |
|---|---|
| `{{HOLDER_NAME}}` | Student's full name (from auth context) |
| `{{FIELD_NAME}}` | Programme title (from API) |
| `{{CERT_ID}}` | `certificate_number` (from `/me/certifications`) |
| `{{DATE_ISSUED}}` | `issued_at` (from `/me/certifications`) |
| `{{CERT_URL}}` | `https://brixgate.com/verify/{certificate_number}` |
| `{{CERT_URL_ENCODED}}` | URL-encoded version of above |
| `{{PROGRAMME_BLURB}}` | Generic fallback text |
| `{{LINKEDIN_SHARE_URL}}` | Constructed LinkedIn share link |
| `{{TUTOR_NAME}}` | **Hardcoded fallback** — "Brixgate Instructor" |
| `{{TUTOR_ROLE}}` | **Hardcoded fallback** — "Lead Instructor · Brixgate" |
| `{{EXPERT_NAME}}` | **Hardcoded fallback** — "Brixgate Academy" |
| `{{EXPERT_ROLE}}` | **Hardcoded fallback** — "Expert Practitioner · Brixgate" |

> **Action needed from dev lead:** The template expects `TUTOR_NAME` / `TUTOR_ROLE` / `EXPERT_NAME` / `EXPERT_ROLE` to come from the API (`tutorName`/`instructorName` per the template comment). Does the `/me/certifications` response (or another endpoint) return these? If yes, please share the field names and we'll wire them in. If not, the backend needs to add them.

---

## Summary of open questions

| # | Question | Relevant section |
|---|---|---|
| 1 | Paystack callback URL — what should students return to? Is there a requery endpoint? | §1 |
| 2 | Confirm `installment_schedule` field name + valid `amount_type` values | §3 |
| 3 | Confirm exact field names in `GET /admin/cohorts/{cohortId}/payment-overview` response | §4 |
| 4 | Confirm `POST /admin/users/{userId}/wallet/adjust` payload field (`type` vs `adjustment_type`?) | §5 |
| 5 | Is `certificate_id` required in `POST /admin/user-certificates/issue`? Where does it come from? | §6 |
| 6 | Does any certificate endpoint return `tutorName`/`instructorName`/`expertName`? | §7 |
