import { describe, it, expect } from 'vitest'
import { temWebGL, prefereReduzirMovimento } from '../src/al/webgl.js'

describe('detecção de capacidades', () => {
  it('temWebGL devolve booleano sem lançar', () => {
    expect(typeof temWebGL()).toBe('boolean')
  })
  it('prefereReduzirMovimento lê o matchMedia injetado', () => {
    const fake = () => ({ matches: true })
    expect(prefereReduzirMovimento(fake)).toBe(true)
    const fake2 = () => ({ matches: false })
    expect(prefereReduzirMovimento(fake2)).toBe(false)
  })
  it('prefereReduzirMovimento é falso quando não há matchMedia', () => {
    expect(prefereReduzirMovimento(undefined)).toBe(false)
  })
})
