// Integration-test helpers: throwaway users against the real TaxSteps project.
// Needs ../../.env.test with SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { randomBytes, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import type { Database, DocumentInput } from '@taxsteps/core'
import type { TaxStepsClient } from '@taxsteps/data/api'

process.loadEnvFile(fileURLToPath(new URL('../../.env.test', import.meta.url)))

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} missing from .env.test`)
  return v
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }

export function adminClient() {
  return createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), noSession)
}

export function anonClient(): TaxStepsClient {
  return createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), noSession)
}

export type TestUser = { client: TaxStepsClient; userId: string; email: string; password: string }

export async function createTestUser(meta: Record<string, unknown> = {}): Promise<TestUser> {
  const email = `test+${randomUUID()}@taxsteps.test`
  const password = randomBytes(18).toString('base64url')
  const { data, error } = await adminClient().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: meta })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  const client = anonClient()
  const signIn = await client.auth.signInWithPassword({ email, password })
  if (signIn.error) throw signIn.error
  return { client, userId: data.user.id, email, password }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const { error } = await adminClient().auth.admin.deleteUser(userId)
  if (error) throw error
}

export function input(overrides: Partial<DocumentInput> = {}): DocumentInput {
  return {
    id: randomUUID(), document_type: 'receipt', merchant_name: 'Mitre 10', title: 'Drill bits', description: null,
    category_id: null, expense_type: 'business', amount: 115, tax_amount: 15, tax_label: 'GST', currency: 'NZD',
    transaction_date: '2026-09-25', invoice_number: '548921', payment_method: 'Visa', status: 'complete', source: 'manual',
    metadata: {}, ...overrides,
  }
}

/** A second, independent session for the same user (e.g. "phone" and "web"). */
export async function signInAgain(u: TestUser): Promise<TaxStepsClient> {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email: u.email, password: u.password })
  if (error) throw error
  return client
}
