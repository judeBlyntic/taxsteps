import { describe, expect, it } from 'vitest'
import { withTempFile } from './temp-file'

describe('withTempFile (review #1: photos must never stay on the device)', () => {
  it('deletes the photo when processing succeeds', async () => {
    const deleted: string[] = []
    expect(await withTempFile('file:///cache/a.jpg', (u) => deleted.push(u), async () => 'ok')).toBe('ok')
    expect(deleted).toEqual(['file:///cache/a.jpg'])
  })
  it('deletes the photo when processing fails before it even starts (offline, settings error)', async () => {
    const deleted: string[] = []
    await expect(withTempFile('file:///cache/b.jpg', (u) => deleted.push(u), async () => { throw new Error('offline') })).rejects.toThrow('offline')
    expect(deleted).toEqual(['file:///cache/b.jpg'])
  })
})
