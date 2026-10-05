import { ProfileUpdateSchema, type Profile, type ProfileUpdate } from '@taxsteps/core'
import { currentUserId, dbError, type TaxStepsClient } from './client.ts'

export async function getProfile(c: TaxStepsClient): Promise<Profile> {
  const id = await currentUserId(c)
  const { data, error, status } = await c.from('profiles').select('*').eq('id', id).single()
  if (error || !data) throw dbError('INTERNAL', error, status)
  return data
}

export async function updateProfile(c: TaxStepsClient, patch: ProfileUpdate): Promise<Profile> {
  const id = await currentUserId(c)
  const clean = ProfileUpdateSchema.parse(patch)
  const { data, error, status } = await c.from('profiles').update(clean).eq('id', id).select('*').single()
  if (error || !data) throw dbError('SAVE_FAILED', error, status)
  return data
}
