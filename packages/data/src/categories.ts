import { CategoryInputSchema, type Category, type CategoryInput } from '@taxsteps/core'
import { dbError, type TaxStepsClient } from './client.ts'

const COLUMNS = 'id, user_id, name, icon, color, sort, archived'

export async function listCategories(c: TaxStepsClient, opts: { includeArchived?: boolean } = {}): Promise<Category[]> {
  let q = c.from('categories').select(COLUMNS)
  if (!opts.includeArchived) q = q.eq('archived', false)
  const { data, error, status } = await q.order('sort').order('name')
  if (error) throw dbError('INTERNAL', error, status)
  return data
}

export async function upsertCategory(c: TaxStepsClient, input: CategoryInput): Promise<Category> {
  const clean = CategoryInputSchema.parse(input)
  const { data, error, status } = clean.id
    ? await c.from('categories').update(clean).eq('id', clean.id).select(COLUMNS).single()
    : await c.from('categories').insert(clean).select(COLUMNS).single()
  if (error || !data) throw dbError('SAVE_FAILED', error, status)
  return data
}
