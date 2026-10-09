import { describe, it, expect } from 'vitest'
import { CONFIG, getGeometrias, buildAl } from '../src/al/geometry.js'
import * as THREE from 'three'

const finito = (arr) => arr.every(Number.isFinite)

describe('geometria do Al', () => {
  it('mantém os valores do Al3D', () => {
    expect(CONFIG.ALTURA).toBe(3.6)
    expect(CONFIG.L_ESPESSURA).toBe(0.7)
    expect(CONFIG.CANTO_RAIO).toBe(0.0)
    expect(CONFIG.COR).toBe(0x030303)
  })
  it('gera as duas geometrias sem vértices não-finitos', () => {
    const { aGeo, lGeo } = getGeometrias()
    expect(finito(aGeo.attributes.position.array)).toBe(true)
    expect(finito(lGeo.attributes.position.array)).toBe(true)
    expect(aGeo.attributes.position.count).toBeGreaterThan(0)
    expect(lGeo.attributes.position.count).toBeGreaterThan(0)
  })
  it('produz um grupo com as letras A e l na altura certa', () => {
    const g = buildAl(new THREE.MeshPhysicalMaterial(), new THREE.MeshPhysicalMaterial())
    expect(g.getObjectByName('letraA')).toBeTruthy()
    expect(g.getObjectByName('letraL')).toBeTruthy()
    const bb = new THREE.Box3().setFromObject(g)
    expect(bb.max.y - bb.min.y).toBeCloseTo(CONFIG.ALTURA, 0)
  })
})
