import { describe, it, expect } from 'vitest'
import { uuidRe } from '../uuid'

describe('uuidRe', () => {
  it('accepts a valid v4 UUID', () => {
    expect(uuidRe.test('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(true)
  })

  it('accepts uppercase UUID', () => {
    expect(uuidRe.test('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true)
  })

  it('accepts mixed-case UUID', () => {
    expect(uuidRe.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  it('rejects old permissive pattern: 36 hyphens', () => {
    expect(uuidRe.test('------------------------------------')).toBe(false)
  })

  it('rejects UUID with wrong segment lengths', () => {
    expect(uuidRe.test('aaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(uuidRe.test('')).toBe(false)
  })

  it('rejects UUID without hyphens', () => {
    expect(uuidRe.test('aaaaaaaabbbbccccddddeeeeeeeeeeee')).toBe(false)
  })

  it('rejects UUID with extra characters', () => {
    expect(uuidRe.test('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-extra')).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(uuidRe.test('zzzzzzzz-bbbb-cccc-dddd-eeeeeeeeeeee')).toBe(false)
  })
})
