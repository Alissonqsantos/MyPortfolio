import { describe, it, expect } from 'vitest'
import { BURACO, corDisco, buildBuracoNegro, atualizarBuracoNegro } from '../src/al/buracoNegro.js'
import { poseAt } from '../src/al/choreography.js'

const finito3 = (v) => v.length === 3 && v.every(Number.isFinite)

describe('buraco negro', () => {
  it('tem horizonte + 3 camadas + 2 arcos-lente, todos nomeados', () => {
    const b = buildBuracoNegro()
    expect(b.name).toBe('buraco-negro')
    for (const n of ['horizonte', 'nucleo', 'disco', 'veu', 'arco-sup', 'arco-inf']) {
      expect(b.getObjectByName(n), n).toBeTruthy()
    }
    expect(b.children).toHaveLength(6)
  })
  it('horizonte é esfera preta opaca (oclusor, sem emissão)', () => {
    const h = buildBuracoNegro().getObjectByName('horizonte')
    expect(h.geometry.parameters.radius).toBe(BURACO.ESFERA_R)
    expect(h.material.color.getHex()).toBe(0x000000)
    expect(h.material.transparent).toBeFalsy()
  })
  it('disco começa quase colado na esfera (gap ≥ 1.1x o raio)', () => {
    expect(BURACO.DISCO_INT / BURACO.ESFERA_R).toBeGreaterThanOrEqual(1.1)
  })
  it('presença discreta: diâmetro total 6-8', () => {
    expect(BURACO.DISCO_EXT * 2).toBeGreaterThanOrEqual(6)
    expect(BURACO.DISCO_EXT * 2).toBeLessThanOrEqual(8)
  })
  it('é auto-emissivo (MeshBasic: não toca na iluminação da cena)', () => {
    const b = buildBuracoNegro()
    b.traverse((o) => {
      if (o.isMesh) expect(o.material.isMeshBasicMaterial).toBe(true)
    })
  })
  it('camadas de brilho são aditivas sem escrita de profundidade', () => {
    const b = buildBuracoNegro()
    for (const n of ['nucleo', 'disco', 'veu', 'arco-sup', 'arco-inf']) {
      const m = b.getObjectByName(n).material
      expect(m.blending).toBe(2048 - 2046) // AdditiveBlending = 2
      expect(m.depthWrite).toBe(false)
    }
  })
  it('corDisco: quente dentro, apagada fora, com filamentos', () => {
    const dentro = [], fora = [], faixa = []
    for (let i = 0; i < 64; i++) {
      const th = (i / 64) * Math.PI * 2
      dentro.push(corDisco(th, 0.05))
      fora.push(corDisco(th, 0.95))
      faixa.push(corDisco(th, 0.5))
    }
    for (const c of [...dentro, ...fora, ...faixa]) {
      expect(finito3(c)).toBe(true)
      expect(c.every((v) => v >= 0 && v <= 1)).toBe(true)
    }
    const soma = (c) => c[0] + c[1] + c[2]
    const media = (arr) => arr.reduce((s, c) => s + soma(c), 0) / arr.length
    expect(media(dentro)).toBeGreaterThan(media(fora) * 3)
    // filamentos: brilho varia com o ângulo no mesmo raio
    const vals = faixa.map(soma)
    const min = Math.min(...vals), max = Math.max(...vals)
    expect(max - min).toBeGreaterThan(0.05)
  })
  it('mora longe: 16+ da origem e fora do caminho da câmera (margem 1.0)', () => {
    expect(Math.hypot(...BURACO.POS)).toBeGreaterThanOrEqual(16)
    const raioBH = BURACO.DISCO_EXT * BURACO.ESCALA
    for (let i = 0; i <= 400; i++) {
      const p = poseAt(i / 400)
      const d = Math.hypot(p.pos[0] - BURACO.POS[0], p.pos[1] - BURACO.POS[1], p.pos[2] - BURACO.POS[2])
      expect(d, `t=${(i / 400).toFixed(3)}`).toBeGreaterThan(raioBH + 1.0)
    }
  })
  it('em t=0 está no repouso (giro zero, opacidades na base)', () => {
    const b = buildBuracoNegro()
    atualizarBuracoNegro(b, 0)
    const u = b.userData
    expect(u.nucleo.rotation.y).toBe(0)
    expect(u.disco.rotation.y).toBe(0)
    expect(u.nucleo.material.opacity).toBeCloseTo(u.opacNucleo, 6)
    expect(u.veu.material.opacity).toBeCloseTo(u.opacVeu, 6)
  })
  it('gira diferencial (núcleo mais rápido) e cintila contido (±10%)', () => {
    const b = buildBuracoNegro()
    atualizarBuracoNegro(b, 30)
    const u = b.userData
    expect(u.nucleo.rotation.y).toBeGreaterThan(u.disco.rotation.y)
    expect(u.disco.rotation.y).toBeGreaterThan(u.veu.rotation.y)
    for (const [m, base] of [[u.nucleo, u.opacNucleo], [u.disco, u.opacDisco], [u.veu, u.opacVeu]]) {
      expect(Math.abs(m.material.opacity - base) / base).toBeLessThanOrEqual(0.1)
    }
  })
  it('giro é lento (núcleo leva 60s+ por volta)', () => {
    expect((Math.PI * 2) / BURACO.GIRO_NUCLEO).toBeGreaterThan(60)
  })
  it('knobs de personalização têm defaults sãos', () => {
    for (const k of ['OPAC_NUCLEO', 'OPAC_DISCO', 'VEU_OPAC', 'ARCO_OPAC_SUP', 'ARCO_OPAC_INF']) {
      expect(BURACO[k]).toBeGreaterThanOrEqual(0)
      expect(BURACO[k]).toBeLessThanOrEqual(1)
    }
    expect(BURACO.BRILHO).toBeGreaterThan(0)
    expect(BURACO.ESCALA).toBeGreaterThan(0)
    expect(BURACO.FILAMENTOS).toBeGreaterThanOrEqual(0)
    expect(BURACO.QUEDA).toBeGreaterThan(0)
    const b = buildBuracoNegro()
    expect(b.visible).toBe(BURACO.VISIVEL)
    expect(b.scale.x).toBeCloseTo(BURACO.ESCALA, 6)
  })
})
