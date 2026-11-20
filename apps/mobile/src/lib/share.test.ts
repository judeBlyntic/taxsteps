import { describe, expect, it, vi } from 'vitest'

const order = vi.hoisted(() => [] as string[])
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
vi.mock('expo-sharing', () => ({ shareAsync: async () => { order.push('share') } }))
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  // SDK 58: File.write() is asynchronous.
  File: class {
    exists = false
    uri = 'file:///cache/export.csv'
    create() {}
    delete() {}
    write() { return new Promise<void>((resolve) => setTimeout(() => { order.push('written'); resolve() }, 10)) }
  },
}))

import { shareExport } from './share'

describe('shareExport', () => {
  it('finishes writing the export before opening the share sheet', async () => {
    await shareExport({ bytes: new Uint8Array([1, 2, 3]).buffer, filename: 'export.csv', contentType: 'text/csv' })
    expect(order).toEqual(['written', 'share'])
  })
})
