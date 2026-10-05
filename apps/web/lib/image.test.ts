import { describe, expect, it } from 'vitest'
import { targetSize } from './image'

describe('targetSize', () => {
  it('scales the longest side down to 2000px keeping the aspect ratio', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    expect(targetSize(1000, 5000)).toEqual({ width: 400, height: 2000 })
  })
  it('never upscales', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })
})
