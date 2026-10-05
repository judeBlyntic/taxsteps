import type { Category, DocumentStatus } from '@taxsteps/core'
import { CategoryIcon, categoryColors } from '@/components/ui/icons'

export function CategoryDot({ category, size = 44 }: { category: Category | undefined; size?: number }) {
  return (
    <span className="cat-dot" style={{ ...categoryColors(category?.color), width: size, height: size }} aria-hidden>
      <CategoryIcon icon={category?.icon ?? 'receipt'} />
    </span>
  )
}

export function StatusTag({ status }: { status: DocumentStatus }) {
  return status === 'complete'
    ? <span className="tag tag-accent-2 status-tag">Complete</span>
    : <span className="tag tag-accent status-tag">Needs review</span>
}

export function TypeTag({ type }: { type: 'business' | 'personal' }) {
  return type === 'business'
    ? <span className="tag tag-accent-2 status-tag">Business</span>
    : <span className="tag tag-accent status-tag">Personal</span>
}
