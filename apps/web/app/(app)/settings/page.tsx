'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useCategories, useClient, useProfile } from '@taxsteps/data'
import { PageHeader } from '@/components/shell/PageHeader'
import { AppearanceCard } from '@/components/settings/AppearanceCard'
import { CategoryManager } from '@/components/settings/CategoryManager'
import { PrivacyCard } from '@/components/settings/PrivacyCard'
import { ProfileCard, RegionCard } from '@/components/settings/ProfileCards'
import { SheetsCard } from '@/components/settings/SheetsCard'
import { ICON } from '@/components/ui/icons'

export default function SettingsPage() {
  const client = useClient()
  const qc = useQueryClient()
  const router = useRouter()
  const { data: profile } = useProfile()
  const { data: categories } = useCategories()
  const [email, setEmail] = useState('')
  useEffect(() => { void client.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? '')) }, [client])

  async function signOut() {
    await client.auth.signOut()
    qc.clear()
    router.replace('/sign-in')
    router.refresh()
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Account, region, appearance, categories, integrations and privacy." actions={
        <button type="button" className="btn btn-secondary btn-lg btn-paper" onClick={() => void signOut()}><LogOut {...ICON} />Sign out</button>
      } />
      <div className="page-body">
        {!profile || !categories ? <div className="empty"><span className="spinner" style={{ display: 'inline-block' }} /></div> : (
          <div className="dash-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', alignItems: 'start' }}>
            <div className="stack">
              <ProfileCard key={profile.updated_at} profile={profile} email={email} />
              <RegionCard key={`r${profile.updated_at}`} profile={profile} />
              <SheetsCard />
            </div>
            <div className="stack">
              <AppearanceCard profile={profile} />
              <CategoryManager categories={categories} />
              <PrivacyCard />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
