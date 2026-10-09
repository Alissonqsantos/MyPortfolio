import { describe, it, expect } from 'vitest'
import { CONFIG, getGeometrias, buildAl } from '../src/al/geometry.js'
import { buildSol } from '../src/al/cosmos.js'
import * as THREE from 'three'

const finito = (arr) => arr.every(Number.isFinite)

describe('geometria do Al', () => {
  it('mantém os valores do Al3D', () => {
    expect(CONFIG.ALTURA).toBe(3.6)
    expect(CONFIG.L_ESPESSURA).toBe(0.7)
    expect(CONFIG.CANTO_RAIO).toBe(0.0)
    expect(CONFIG.COR).toBe(0x030303)
    expect(CONFIG.ROUGH).toBeGreaterThanOrEqual(0.85)
    // película fina sutil: reflete um pouco da luz roxa do buraco negro
    expect(CONFIG.CLEARCOAT).toBeGreaterThan(0)
    expect(CONFIG.CLEARCOAT).toBeLessThanOrEqual(0.4)
    expect(CONFIG.CLEARCOAT_ROUGH).toBeLessThanOrEqual(0.2)
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
  it('brancas são só apoio (baixas) e o sol roxo protagoniza', () => {
    expect(CONFIG.LUZ_KEY.INT).toBeLessThanOrEqual(0.3)
    expect(CONFIG.LUZ_FILL.INT).toBeLessThanOrEqual(0.5)
    expect(CONFIG.LUZ_RIM.INT).toBeLessThanOrEqual(0.6)
    expect(CONFIG.AMBIENTE).toBeLessThanOrEqual(0.02)
    // entidade única roxa, mais forte que qualquer branca
    const sol = buildSol(1)
    const c = sol.color
    expect(c.r + c.b).toBeGreaterThan(c.g * 2)
    expect(sol.intensity).toBeGreaterThan(CONFIG.LUZ_KEY.INT)
    expect(sol.intensity).toBeGreaterThan(CONFIG.LUZ_FILL.INT)
  })
  it('Al à deriva no espaço: sem chão, sem sombra projetada', () => {
    expect(CONFIG.CHAO_ATIVO).toBe(false)
  })
})
