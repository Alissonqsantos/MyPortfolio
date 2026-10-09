import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { applyProgress } from '../src/al/scene.js'
import { CHAPTERS } from '../src/al/choreography.js'

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
