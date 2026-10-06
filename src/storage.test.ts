import { beforeEach, describe, expect, it } from 'vitest'
import { demoData, emptyData } from './domain'
import { loadData, saveData } from './storage'

describe('local persistence', () => {
  beforeEach(() => localStorage.clear())
  it('restores saved schoolwork', () => {
    const data = demoData('2026-10-04')
    expect(saveData(data)).toBe(true)
    expect(loadData()).toEqual(data)
  })
  it('handles absent or malformed stored data', () => {
    expect(loadData()).toEqual(emptyData())
    localStorage.setItem('homebase.academic.v1', '{oops')
    expect(loadData()).toEqual(emptyData())
  })
})
