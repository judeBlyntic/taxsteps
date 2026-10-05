import { BackHeader } from '@/components/BackHeader'
import { Banner, Screen } from '@/components/ui'

/** Google Sheets export — wired to the google-sheets function in Task 22. */
export default function SheetsScreen() {
  return (
    <Screen style={{ gap: 16 }}>
      <BackHeader title="Google Sheets" />
      <Banner tone="ok">Google Sheets export is being set up. Use Excel or CSV from Reports for now.</Banner>
    </Screen>
  )
}
