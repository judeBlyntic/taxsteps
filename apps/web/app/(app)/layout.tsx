import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase/server'
import { AppShell } from '@/components/shell/AppShell'

// 'Dashboard' titles the page at /; every other app route sets its own. A string title here would drop the
// root template for those routes, so the template is restated.
export const metadata = { title: { default: 'Dashboard', template: '%s · Tax Steps' } }

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  if (!data.user) redirect('/sign-in')
  return <AppShell userId={data.user.id} email={data.user.email ?? ''}>{children}</AppShell>
}
