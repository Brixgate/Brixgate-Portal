import { redirect } from 'next/navigation'

// Sign-up is not in use — direct all traffic to login
export default function SignUpPage() {
  redirect('/login')
}
