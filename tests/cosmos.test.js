import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { COSMOS, buildCosmos, sortearCadente, poseCadente, criarLinhaCadente, atualizarLinhaCadente, atualizarNevoas, buildLuzesCosmos, semente } from '../src/al/cosmos.js'

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
  it('deriva quase parada (volta completa em mais de 30min)', () => {
    expect((Math.PI * 2) / COSMOS.DERIVA).toBeGreaterThan(30 * 60)
  })
  it('cadentes são raras, rápidas e tênues', () => {
    const rand = semente(42)
    for (let i = 0; i < 20; i++) {
      const c = sortearCadente(rand)
      expect(c.espera).toBeGreaterThanOrEqual(COSMOS.CADENTE.ESPERA_MIN)
      expect(c.espera).toBeLessThanOrEqual(COSMOS.CADENTE.ESPERA_MAX)
      expect(c.dur).toBeGreaterThanOrEqual(COSMOS.CADENTE.DUR_MIN)
      expect(c.dur).toBeLessThanOrEqual(COSMOS.CADENTE.DUR_MAX)
      expect(Math.hypot(...c.origem)).toBeGreaterThanOrEqual(COSMOS.CADENTE.RAIO_MIN - 1e-6)
    }
    const c = sortearCadente(semente(7))
    expect(poseCadente(c, 0).opacidade).toBe(0)
    expect(poseCadente(c, c.dur).opacidade).toBeCloseTo(0, 6)
    expect(poseCadente(c, c.dur / 2).opacidade).toBeLessThanOrEqual(COSMOS.CADENTE.OPAC_MAX)
    expect(poseCadente(c, c.dur / 2).opacidade).toBeGreaterThan(0)
  })
  it('o rastro da cadente fica longe das letras (raio 25+)', () => {
    const c = sortearCadente(semente(13))
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const p = poseCadente(c, c.dur * f)
      expect(Math.hypot(...p.head)).toBeGreaterThan(25)
      expect(Math.hypot(...p.tail)).toBeGreaterThan(25)
    }
  })
  it('a linha do rastro atualiza cabeça, cauda e opacidade', () => {
    const linha = criarLinhaCadente()
    const c = sortearCadente(semente(21))
    atualizarLinhaCadente(linha, c, c.dur / 2)
    const attr = linha.geometry.attributes.position
    const esp = poseCadente(c, c.dur / 2)
    // buffer é float32: compara com tolerância, não igualdade exata
    expect(attr.getX(0)).toBeCloseTo(esp.head[0], 5)
    expect(attr.getY(0)).toBeCloseTo(esp.head[1], 5)
    expect(attr.getZ(0)).toBeCloseTo(esp.head[2], 5)
    expect(attr.getX(1)).toBeCloseTo(esp.tail[0], 5)
    expect(attr.getY(1)).toBeCloseTo(esp.tail[1], 5)
    expect(attr.getZ(1)).toBeCloseTo(esp.tail[2], 5)
    expect(linha.material.opacity).toBeCloseTo(esp.opacidade, 6)
  })
  it('luzes do cosmo nas cores das névoas, suaves e sem sombra', () => {
    const luzes = buildLuzesCosmos(1)
    expect(luzes).toHaveLength(COSMOS.LUZES.length)
    for (const l of luzes) {
      expect(l.intensity).toBeLessThanOrEqual(0.6)
      expect(l.castShadow).toBe(false)
    }
    const cores = luzes.map((l) => l.color.getHex())
    expect(cores).toContain(0x7322f2)
    expect(cores).toContain(0xe296ff)
  })
  it('névoas derivam devagar em torno da base (cosmos vivo)', () => {
    const grupo = buildCosmos()
    const nevoas = grupo.children.filter((o) => o.name.startsWith('nevoa'))
    expect(nevoas).toHaveLength(COSMOS.NEVOAS.length)
    atualizarNevoas(grupo, 0)
    nevoas.forEach((n, i) => {
      expect(n.position.toArray()).toEqual(COSMOS.NEVOAS[i].pos)
    })
    atualizarNevoas(grupo, 30)
    nevoas.forEach((n, i) => {
      const base = COSMOS.NEVOAS[i].pos
      const d = Math.hypot(n.position.x - base[0], n.position.y - base[1])
      // oscilação senoidal: deslocamento limitado a ~2.4x a amplitude
      expect(d).toBeLessThanOrEqual(COSMOS.NEVOA_DERIVA.AMP * 2.5)
    })
  })
  it('deriva das névoas é lenta (período acima de 1min)', () => {
    expect((Math.PI * 2) / COSMOS.NEVOA_DERIVA.VEL).toBeGreaterThan(60)
  })
})
