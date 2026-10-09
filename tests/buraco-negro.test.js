import { describe, it, expect } from 'vitest'
import { BURACO, corDisco, lamela, buildBuracoNegro, atualizarBuracoNegro } from '../src/al/buracoNegro.js'
import { poseAt } from '../src/al/choreography.js'

const finito3 = (v) => v.length === 3 && v.every(Number.isFinite)

describe('buraco negro', () => {
  it('tem horizonte + corpo + glows + peles + fóton + aura + arcos, nomeados', () => {
    const b = buildBuracoNegro()
    expect(b.name).toBe('buraco-negro')
    for (const n of ['horizonte', 'miolo', 'nucleo', 'disco', 'veu', 'pele-sup', 'pele-inf', 'foton', 'aura', 'arco-sup', 'arco-inf']) {
      expect(b.getObjectByName(n), n).toBeTruthy()
    }
    expect(b.children).toHaveLength(11)
  })
  it('horizonte é esfera preta opaca (oclusor, sem emissão)', () => {
    const h = buildBuracoNegro().getObjectByName('horizonte')
    expect(h.geometry.parameters.radius).toBe(BURACO.ESFERA_R)
    expect(h.material.color.getHex()).toBe(0x000000)
    expect(h.material.transparent).toBeFalsy()
  })
  it('emissão nasce afundada na sombra (estilo Gargantua)', () => {
    expect(BURACO.DISCO_INT).toBeLessThanOrEqual(BURACO.ESFERA_R)
  })
  it('tamanho segue o CONFIG (diâmetro total = 2x DISCO_EXT)', () => {
    expect(BURACO.DISCO_EXT * 2 * BURACO.ESCALA).toBeGreaterThan(0)
  })
  it('anel de fótons é colado na sombra (1.0-1.1x) e mais brilhante', () => {
    expect(BURACO.FOTON_R).toBeGreaterThanOrEqual(1.0)
    expect(BURACO.FOTON_R).toBeLessThanOrEqual(1.1)
    expect(BURACO.FOTON_OPAC).toBeGreaterThanOrEqual(BURACO.OPAC_NUCLEO)
  })
  it('miolo é corpo opaco (corta a esfera), glows são aditivos', () => {
    const b = buildBuracoNegro()
    expect(b.getObjectByName('miolo').material.blending).toBe(2048 - 2048) // NormalBlending = 0
    for (const n of ['nucleo', 'disco', 'veu', 'pele-sup', 'pele-inf', 'foton', 'aura', 'arco-sup', 'arco-inf']) {
      const m = b.getObjectByName(n).material
      expect(m.blending, n).toBe(2048 - 2046) // AdditiveBlending = 2
      expect(m.depthWrite, n).toBe(false)
    }
  })
  it('é auto-emissivo (MeshBasic: não toca na iluminação da cena)', () => {
    const b = buildBuracoNegro()
    b.traverse((o) => {
      if (o.isMesh) expect(o.material.isMeshBasicMaterial).toBe(true)
    })
  })
  it('camadas de brilho antigas removidas (substituídas por corpo+glow)', () => {
    const b = buildBuracoNegro()
    expect(b.getObjectByName('miolo')).toBeTruthy()
    expect(b.getObjectByName('foton')).toBeTruthy()
    expect(b.getObjectByName('aura')).toBeTruthy()
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
  it('doppler: um lado mais quente (controlado por DOPPLER)', () => {
    const q = corDisco(BURACO.HOTSPOT_ANG, 0.3)
    const f = corDisco(BURACO.HOTSPOT_ANG + Math.PI, 0.3)
    const soma = (c) => c[0] + c[1] + c[2]
    expect(soma(q)).toBeGreaterThan(soma(f))
  })
  it('lamelas oscilam o véu (1 no centro, até 1-LAMELA_F)', () => {
    for (let i = 0; i <= 20; i++) {
      const l = lamela(i / 20)
      expect(l).toBeLessThanOrEqual(1)
      expect(l).toBeGreaterThanOrEqual(1 - BURACO.LAMELA_F - 1e-9)
      expect(Number.isFinite(l)).toBe(true)
    }
  })
  it('peles dão espessura fina (offset pequeno vs disco)', () => {
    const b = buildBuracoNegro()
    const sup = b.getObjectByName('pele-sup'), inf = b.getObjectByName('pele-inf')
    expect(sup.position.y).toBeCloseTo(BURACO.PELE_OFF, 6)
    expect(inf.position.y).toBeCloseTo(-BURACO.PELE_OFF, 6)
    expect(Math.abs(sup.position.y) / BURACO.DISCO_EXT).toBeLessThan(0.08)
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
  it('gira diferencial (miolo mais rápido) e cintila contido (±10%)', () => {
    const b = buildBuracoNegro()
    atualizarBuracoNegro(b, 30)
    const u = b.userData
    expect(u.miolo.rotation.y).toBeGreaterThan(u.nucleo.rotation.y)
    expect(u.nucleo.rotation.y).toBeGreaterThan(u.disco.rotation.y)
    expect(u.disco.rotation.y).toBeGreaterThan(u.veu.rotation.y)
    for (const [m, base] of [[u.miolo, u.opacMiolo], [u.nucleo, u.opacNucleo], [u.disco, u.opacDisco], [u.veu, u.opacVeu]]) {
      expect(Math.abs(m.material.opacity - base) / base).toBeLessThanOrEqual(0.1)
    }
  })
  it('giro é lento (núcleo leva 60s+ por volta)', () => {
    expect((Math.PI * 2) / BURACO.GIRO_NUCLEO).toBeGreaterThan(60)
  })
  it('knobs de personalização têm defaults sãos', () => {
    for (const k of ['OPAC_NUCLEO', 'OPAC_DISCO', 'VEU_OPAC', 'ARCO_OPAC_SUP', 'ARCO_OPAC_INF', 'MIOLO_OPAC', 'PELE_OPAC', 'FOTON_OPAC', 'AURA_OPAC']) {
      expect(BURACO[k]).toBeGreaterThanOrEqual(0)
      expect(BURACO[k]).toBeLessThanOrEqual(1)
    }
    expect(BURACO.BRILHO).toBeGreaterThan(0)
    expect(BURACO.ESCALA).toBeGreaterThan(0)
    expect(BURACO.FILAMENTOS).toBeGreaterThanOrEqual(0)
    expect(BURACO.QUEDA).toBeGreaterThan(0)
    expect(BURACO.DOPPLER).toBeGreaterThanOrEqual(0)
    const b = buildBuracoNegro()
    expect(b.visible).toBe(BURACO.VISIVEL)
    expect(b.scale.x).toBeCloseTo(BURACO.ESCALA, 6)
  })
})
