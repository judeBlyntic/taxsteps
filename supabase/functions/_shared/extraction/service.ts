// DocumentExtractionService: provider-agnostic extraction → validated, normalised fields.
import { AppError, ModelOutputSchema, normalizeExtraction, todayIn, type ExtractionHints, type ExtractionResponse } from '../core.ts'
import { OpenAIProvider } from './openai.ts'
import type { ExtractionFile, ExtractionProvider } from './provider.ts'

type Env = { get(key: string): string | undefined }

/** Picks the provider from AI_PROVIDER. Add a case here to support another AI/OCR backend. */
export function createProvider(env: Env = Deno.env): ExtractionProvider {
  const apiKey = env.get('AI_API_KEY')
  if (!apiKey) throw new AppError('INTERNAL', 'Extraction is not configured')
  switch (env.get('AI_PROVIDER') ?? 'openai') {
    case 'openai':
      return new OpenAIProvider({ apiKey, model: env.get('AI_MODEL') ?? 'gpt-6.1-sol' })
    default:
      throw new AppError('INTERNAL', 'Unknown extraction provider')
  }
}

export class DocumentExtractionService {
  constructor(private readonly provider: ExtractionProvider, private readonly now: () => Date = () => new Date()) {}

  async extract(file: ExtractionFile, hints: ExtractionHints, timeZone: string): Promise<ExtractionResponse> {
    const raw = await this.provider.extract(file, hints)
    const parsed = ModelOutputSchema.safeParse(raw) // AI output is untrusted input
    if (!parsed.success) throw new AppError('UNREADABLE')
    return { ...normalizeExtraction(parsed.data, hints, todayIn(timeZone, this.now())), model: this.provider.model }
  }
}
