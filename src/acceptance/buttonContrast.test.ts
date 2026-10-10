import { describe, expect, it } from 'vitest'
import { opaqueTextContrast } from './buttonContrast'

describe('opaque computed-color contrast evidence', () => {
  it('measures black/white at 21:1 independently of foreground order', () => {
    expect(opaqueTextContrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)')).toBe(21)
    expect(opaqueTextContrast('rgb(255, 255, 255)', 'rgb(0, 0, 0)')).toBe(21)
  })
  it('measures identical colors at 1:1', () => {
    expect(opaqueTextContrast('rgb(139, 221, 252)', 'rgb(139, 221, 252)')).toBe(1)
  })
  it('detects the reproduced Sunlit and Moonlit secondary hover failures', () => {
    expect(opaqueTextContrast('rgb(29, 78, 216)', 'rgb(30, 64, 175)')).toBeCloseTo(1.30154, 5)
    expect(opaqueTextContrast('rgb(139, 221, 252)', 'rgb(182, 234, 255)')).toBeCloseTo(1.17017, 5)
  })
  it('measures both approved pressed pairs above 4.5:1', () => {
    expect(opaqueTextContrast('rgb(255, 255, 255)', 'rgb(30, 58, 138)')).toBeCloseTo(10.35798, 5)
    expect(opaqueTextContrast('rgba(11, 18, 32, 1)', 'rgb(108, 197, 232)')).toBeCloseTo(9.61955, 5)
  })
  it('rejects transparent or malformed input instead of claiming contrast without compositing', () => {
    for (const color of ['rgba(0, 0, 0, 0)', 'rgba(255, 255, 255, 0.5)', 'transparent', 'rgb(300, 0, 0)'])
      expect(() => opaqueTextContrast(color, 'rgb(255, 255, 255)')).toThrow(RangeError)
  })
})
