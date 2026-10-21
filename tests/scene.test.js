import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { applyProgress, makeLetterMaterial } from '../src/al/scene.js'
import { CHAPTERS } from '../src/al/choreography.js'
import { CONFIG } from '../src/al/geometry.js'

const cam = () => new THREE.PerspectiveCamera(35, 1.6, 0.1, 100)
const tgt = () => new THREE.Vector3()

describe('applyProgress', () => {
  it('coloca a câmera na pose do capítulo 01 em t=0', () => {
    const c = cam(), t = tgt()
    applyProgress(0, c, t)
    expect(c.position.toArray()).toEqual(CHAPTERS[0].pose.pos)
    expect(t.toArray()).toEqual(CHAPTERS[0].pose.target)
  })
  it('coloca a câmera na pose do capítulo 05 em t=1', () => {
    const c = cam(), t = tgt()
    applyProgress(1, c, t)
    expect(c.position.toArray()).toEqual(CHAPTERS[4].pose.pos)
    expect(t.toArray()).toEqual(CHAPTERS[4].pose.target)
  })
  it('permanece finito e clamped fora de [0,1]', () => {
    for (const v of [-1, 0, 0.25, 0.5, 0.75, 1, 2]) {
      const c = cam(), t = tgt()
      applyProgress(v, c, t)
      expect([...c.position.toArray(), ...t.toArray()].every(Number.isFinite)).toBe(true)
    }
  })
})

describe('película forte do Al', () => {
  it('o material das letras espelha a luz roxa com nitidez', () => {
    const m = makeLetterMaterial()
    expect(m.isMeshPhysicalMaterial).toBe(true)
    expect(m.clearcoat).toBeGreaterThan(0.5)
    expect(m.clearcoatRoughness).toBeLessThanOrEqual(0.2)
  })
  it('a película reflete a luz roxa: nenhuma cor própria, só reflexo do ambiente/luzes', () => {
    // mult=1: determinístico mesmo com VITE_LUZ_BRANCA no .env local
    const m = makeLetterMaterial(1)
    // a base continua quase-preta (0x030303): o brilho roxo vem do reflexo,
    // não de emissão nem de cor própria
    expect(m.color.getHex()).toBe(CONFIG.COR)
    expect(m.emissive.getHex()).toBe(0x000000)
    expect(m.metalness).toBeLessThanOrEqual(0.2)
    // o branco do ambiente quase não interage: o roxo protagoniza
    expect(m.envMapIntensity).toBeLessThanOrEqual(0.1)
  })
})
