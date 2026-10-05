import { describe, expect, it } from 'vitest'
import { THEME_OPTIONS } from '@taxsteps/core'
import { applyTheme, categoryColors, colors, fonts, PALETTES } from './theme'

const shape = (o: object): unknown => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'object' ? shape(v) : typeof v]))

describe('app themes', () => {
  it('define exactly the same tokens, so no screen can miss a colour', () => {
    expect(shape(PALETTES.classic.colors)).toEqual(shape(PALETTES.fresh.colors))
    expect(Object.keys(PALETTES.classic.fonts)).toEqual(Object.keys(PALETTES.fresh.fonts))
  })

  it('switches the live tokens in place and defaults to fresh', () => {
    expect(colors.bg).toBe('#f5f5f1')
    applyTheme('classic')
    expect([colors.bg, colors.accentRamp[700], fonts.heading]).toEqual(['#f5ead8', '#8c491a', 'Caprasimo_400Regular'])
    expect(categoryColors('accent-300').bg).toBe('#ffc6a5')
    applyTheme('fresh')
    expect([colors.bg, colors.accentRamp[700], fonts.bold]).toEqual(['#f5f5f1', '#6553c0', 'Inter_400Regular'])
  })

  it('matches the picker swatches', () => {
    for (const t of THEME_OPTIONS) {
      const c = PALETTES[t.value].colors
      expect(t.swatch).toEqual([c.bg, c.accent, c.accent2])
    }
  })
})
