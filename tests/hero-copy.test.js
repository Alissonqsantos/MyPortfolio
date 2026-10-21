import { describe, it, expect } from 'vitest'
import { HERO } from '../src/hero-copy.js'

describe('copy do hero', () => {
  it('traz nome e cargo aprovados', () => {
    expect(HERO.nome).toBe('Alisson')
    expect(HERO.cargo).toBe('Engenheiro de Software')
  })
})
