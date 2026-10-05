import { PageHeader } from '@/components/shell/PageHeader'
import { ScanPanel } from '@/components/scan/ScanPanel'

export const metadata = { title: 'Scan' }

export default function ScanPage() {
  return (
    <>
      <PageHeader title="Scan a receipt" subtitle="Photograph or upload a receipt or invoice — you'll review everything before it's saved." actions={<span />} />
      <div className="page-body"><ScanPanel /></div>
    </>
  )
}
