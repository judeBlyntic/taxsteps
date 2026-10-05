// Hands an extracted draft from the scan screen to the review screen (memory only).
import type { Draft } from '@taxsteps/core'

let pending: Draft | null = null

export function setPendingDraft(d: Draft): void {
  pending = d
}

export function takePendingDraft(): Draft | null {
  const d = pending
  pending = null
  return d
}
