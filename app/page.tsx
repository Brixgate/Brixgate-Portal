import { redirect } from 'next/navigation'

/**
 * Root route — portal.brixgate.com/
 *
 * Two cases:
 *  1. Normal visit  → redirect to /login (middleware protects /student/*)
 *  2. Post-payment  → the landing page redirects here with ?token=<jwt>
 *                     after payment verification. Forward to /auth/callback
 *                     which auto-logs the user in for that one session.
 */
export default function RootPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>
}) {
  const token = searchParams.token
  if (token && typeof token === 'string') {
    redirect(`/auth/callback?token=${encodeURIComponent(token)}`)
  }
  redirect('/login')
}
