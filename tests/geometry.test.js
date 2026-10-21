import { describe, it, expect } from 'vitest'
import { CONFIG, configLuzBranca, getGeometrias, buildAl } from '../src/al/geometry.js'
import { makeLetterMaterial } from '../src/al/scene.js'
import { buildSol } from '../src/al/cosmos.js'
import * as THREE from 'three'

const finito = (arr) => arr.every(Number.isFinite)

describe('geometria do Al', () => {
  it('mantém os valores do Al3D', () => {
    expect(CONFIG.ALTURA).toBe(3.6)
    expect(CONFIG.L_ESPESSURA).toBe(0.7)
    expect(CONFIG.CANTO_RAIO).toBe(0.0)
    expect(CONFIG.COR).toBe(0x030303)
    // base semi-fosca: difunde o roxo em vez de apagar; película forte e lisa
    // espelha a luz roxa do buraco negro com nitidez
    expect(CONFIG.ROUGH).toBeLessThan(0.7)
    expect(CONFIG.CLEARCOAT).toBeGreaterThan(0.5)
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
  it('brancas quase zeradas (só o fiapo) e o sol roxo protagoniza', () => {
    expect(CONFIG.LUZ_KEY.INT).toBeLessThanOrEqual(0.03)
    expect(CONFIG.LUZ_FILL.INT).toBeLessThanOrEqual(0.03)
    expect(CONFIG.LUZ_RIM.INT).toBeLessThanOrEqual(0.05)
    // reflexo branco do ambiente nas letras quase zerado: não compete com o roxo
    expect(CONFIG.ENV_MAP).toBeLessThanOrEqual(0.1)
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
  it('VITE_LUZ_BRANCA: multiplicador da branca, 1 por padrão', () => {
    // sem a var: 1 (valores do CONFIG); aceita 0 (só o roxo) e 2 (dobro)
    expect(configLuzBranca({}, false)).toBe(1)
    expect(configLuzBranca({ VITE_LUZ_BRANCA: '0' }, false)).toBe(0)
    expect(configLuzBranca({ VITE_LUZ_BRANCA: '2' }, false)).toBe(2)
    // inválido volta ao 1; negativo não apaga invertendo (cai no 1)
    expect(configLuzBranca({ VITE_LUZ_BRANCA: 'abc' }, false)).toBe(1)
    expect(configLuzBranca({ VITE_LUZ_BRANCA: '-1' }, false)).toBe(1)
    // o material acompanha: envMapIntensity escala junto
    expect(makeLetterMaterial(0).envMapIntensity).toBeCloseTo(0, 6)
    expect(makeLetterMaterial(2).envMapIntensity).toBeCloseTo(CONFIG.ENV_MAP * 2, 6)
  })
})
