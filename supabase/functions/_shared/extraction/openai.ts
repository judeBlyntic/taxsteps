import { AppError, type ExtractionHints } from '../core.ts'
import { MODEL_JSON_SCHEMA } from './json-schema.ts'
import { buildInstructions } from './prompt.ts'
import type { ExtractionFile, ExtractionProvider } from './provider.ts'

type ResponsesOutput = {
  output_text?: string
  output?: { type?: string; content?: { type?: string; text?: string }[] }[]
}

export class OpenAIProvider implements ExtractionProvider {
  readonly name = 'openai'
  readonly model: string
  private readonly apiKey: string
  private readonly fetchFn: typeof fetch

  constructor(o: { apiKey: string; model: string; fetch?: typeof fetch }) {
    this.apiKey = o.apiKey
    this.model = o.model
    this.fetchFn = o.fetch ?? fetch
  }

  async extract(file: ExtractionFile, hints: ExtractionHints): Promise<unknown> {
    const filePart = file.mimeType === 'application/pdf'
      ? { type: 'input_file', filename: file.filename, file_data: `data:application/pdf;base64,${file.base64}` }
      : { type: 'input_image', image_url: `data:${file.mimeType};base64,${file.base64}`, detail: 'high' }

    const res = await this.fetchFn('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        store: false, // do not retain the document on the provider side
        instructions: buildInstructions(hints),
        input: [{ role: 'user', content: [{ type: 'input_text', text: 'Extract the expense details from this document.' }, filePart] }],
        text: { format: { type: 'json_schema', name: 'receipt_extraction', strict: true, schema: MODEL_JSON_SCHEMA } },
      }),
      signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) {
      console.error(JSON.stringify({ fn: 'extract-document', provider: this.name, status: res.status }))
      throw new AppError('INTERNAL')
    }

    const data = (await res.json()) as ResponsesOutput
    const text = data.output_text ?? data.output
      ?.flatMap((o) => o.content ?? [])
      .find((c) => c.type === 'output_text')?.text
    if (!text) throw new AppError('UNREADABLE') // refusal or empty output
    try {
      return JSON.parse(text)
    } catch {
      throw new AppError('UNREADABLE')
    }
  }
}
