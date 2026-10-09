import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { COSMOS, buildCosmos } from '../src/al/cosmos.js'

describe('fundo cósmico', () => {
  it('gera 900 estrelas dentro da casca 40-60', () => {
    const c = buildCosmos()
    const stars = c.children.find((o) => o.isPoints)
    expect(stars).toBeTruthy()
    const pos = stars.geometry.attributes.position
    expect(pos.count).toBe(COSMOS.ESTRELAS)
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i))
      expect(r).toBeGreaterThanOrEqual(COSMOS.RAIO_MIN - 1e-6)
      expect(r).toBeLessThanOrEqual(COSMOS.RAIO_MAX + 1e-6)
    }
  })
  it('é determinístico (mesmo seed, mesma distribuição)', () => {
    const a = buildCosmos().children.find((o) => o.isPoints).geometry.attributes.position.array
    const b = buildCosmos().children.find((o) => o.isPoints).geometry.attributes.position.array
    expect([...a]).toEqual([...b])
  })
  it('tem 4 névoas aditivas tênues nas cores Superconscious', () => {
    const c = buildCosmos()
    const nevs = c.children.filter((o) => o.isSprite)
    expect(nevs).toHaveLength(4)
    for (const s of nevs) {
      expect(s.material.blending).toBe(THREE.AdditiveBlending)
      expect(s.material.opacity).toBeLessThanOrEqual(0.2)
      expect(s.material.map).toBeTruthy()
    }
  })
  it('mora longe da câmera (raio 25+, câmera a 6-8)', () => {
    const c = buildCosmos()
    for (const s of c.children.filter((o) => o.isSprite)) {
      expect(s.position.length()).toBeGreaterThan(25)
    }
  })
})
