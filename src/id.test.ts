import { afterEach, describe, expect, it, vi } from 'vitest'
import { demoData, newId } from './domain'

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const browserCrypto = globalThis.crypto
const getRandomValues = browserCrypto.getRandomValues.bind(browserCrypto)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('secure entity IDs', () => {
  it('returns nonempty unique strings through the native path', () => {
    const ids = Array.from({ length: 1000 }, () => newId())
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('prefers native randomUUID and preserves its receiver', () => {
    const randomUUID = vi.fn(function (this: unknown) {
      expect(this).toBe(cryptoApi)
      return 'native-id'
    })
    const randomBytes = vi.fn()
    const cryptoApi = { randomUUID, getRandomValues: randomBytes }
    vi.stubGlobal('crypto', cryptoApi)
    expect(newId()).toBe('native-id')
    expect(randomUUID).toHaveBeenCalledOnce()
    expect(randomBytes).not.toHaveBeenCalled()
  })

  it.each(['undefined', 'absent'] as const)('uses secure bytes when randomUUID is %s', (mode) => {
    const cryptoApi = mode === 'undefined' ? { randomUUID: undefined, getRandomValues } : { getRandomValues }
    vi.stubGlobal('crypto', cryptoApi)
    const weakRandom = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Weak randomness must not be used')
    })
    const ids = Array.from({ length: 1000 }, () => newId())
    expect(ids.every((id) => uuidV4.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
    expect(weakRandom).not.toHaveBeenCalled()
    expect(globalThis.crypto).toBe(cryptoApi)
    expect(Object.hasOwn(cryptoApi, 'randomUUID')).toBe(mode === 'undefined')
  })

  it.each([0, 255])('sets version/variant bits and preserves other bits in %i bytes', (value) => {
    const cryptoApi = {
      getRandomValues(bytes: Uint8Array) {
        expect(this).toBe(cryptoApi)
        expect(bytes).toHaveLength(16)
        return bytes.fill(value)
      },
    }
    vi.stubGlobal('crypto', cryptoApi)
    expect(newId()).toBe(
      value === 0 ? '00000000-0000-4000-8000-000000000000' : 'ffffffff-ffff-4fff-bfff-ffffffffffff',
    )
  })

  it('creates sample entities with unique IDs and consistent class references using fallback', () => {
    vi.stubGlobal('crypto', { getRandomValues })
    const data = demoData('2026-10-04')
    const entities = [...data.classes, ...data.assignments, ...data.assessments, ...data.commitments]
    expect(entities).toHaveLength(9)
    expect(entities.every((entity) => uuidV4.test(entity.id))).toBe(true)
    expect(new Set(entities.map((entity) => entity.id)).size).toBe(entities.length)
    const classIds = new Set(data.classes.map((item) => item.id))
    expect([...data.assignments, ...data.assessments].every((item) => classIds.has(item.classId))).toBe(true)
  })

  it.each([undefined, {}, { randomUUID: undefined, getRandomValues: undefined }])(
    'fails clearly when secure randomness is unavailable (%j)',
    (cryptoApi) => {
      vi.stubGlobal('crypto', cryptoApi)
      expect(() => newId()).toThrow('Secure random ID generation is unavailable in this browser.')
    },
  )
})
