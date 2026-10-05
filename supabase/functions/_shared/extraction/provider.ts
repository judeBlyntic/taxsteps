import type { ExtractionHints } from '../core.ts'

/** The temporary file. Lives only in memory for the duration of one request. */
export type ExtractionFile = { base64: string; mimeType: string; filename: string }

/** An AI/OCR backend. Returns raw (untrusted) JSON; validation happens in DocumentExtractionService. */
export interface ExtractionProvider {
  readonly name: string
  readonly model: string
  extract(file: ExtractionFile, hints: ExtractionHints): Promise<unknown>
}
