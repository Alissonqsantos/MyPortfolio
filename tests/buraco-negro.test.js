import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { BURACO, buildBuracoNegro, atualizarBuracoNegro, makeDiskMaterial, makeAuraMaterial, posicaoOrbita } from '../src/al/buracoNegro.js'
import { CHAPTERS, poseAt } from '../src/al/choreography.js'

describe('buraco negro (port 3D)', () => {
  it('tem horizonte + disco + aura, nomeados', () => {
    const b = buildBuracoNegro()
    expect(b.name).toBe('buraco-negro')
    for (const n of ['horizonte', 'disco', 'aura']) {
      expect(b.getObjectByName(n), n).toBeTruthy()
    }
    expect(b.children).toHaveLength(3)
  })
  it('horizonte é esfera preta opaca (oclusor, sem emissão)', () => {
    const h = buildBuracoNegro().getObjectByName('horizonte')
    expect(h.geometry.parameters.radius).toBe(BURACO.ESFERA_R)
    expect(h.material.color.getHex()).toBe(0x000000)
    expect(h.material.transparent).toBeFalsy()
  })
  it('disco nasce colado na sombra e termina longe', () => {
    expect(BURACO.DISCO_INT).toBeGreaterThan(BURACO.ESFERA_R)
    expect(BURACO.DISCO_INT).toBeLessThan(BURACO.ESFERA_R * 1.4)
    expect(BURACO.DISCO_EXT).toBeGreaterThan(BURACO.DISCO_INT * 2)
  })
  it('disco e aura são shaders aditivos sem depthWrite', () => {
    const b = buildBuracoNegro()
    for (const n of ['disco', 'aura']) {
      const m = b.getObjectByName(n).material
      expect(m.isShaderMaterial, n).toBe(true)
      expect(m.blending, n).toBe(2) // AdditiveBlending
      expect(m.transparent, n).toBe(true)
      expect(m.depthWrite, n).toBe(false)
    }
  })
  it('é auto-emissivo (Basic + Shader: não toca na iluminação da cena)', () => {
    const b = buildBuracoNegro()
    b.traverse((o) => {
      if (o.isMesh) {
        expect(o.material.isMeshStandardMaterial || o.material.isMeshPhysicalMaterial).toBeFalsy()
      }
    })
  })
  it('shaders carregam uniforms sãos (cores, raios, ganho)', () => {
    const d = makeDiskMaterial().uniforms
    expect(d.uTime.value).toBe(0)
    expect(d.uInnerR.value).toBe(BURACO.DISCO_INT)
    expect(d.uOuterR.value).toBe(BURACO.DISCO_EXT)
    expect(d.uBoost.value).toBe(BURACO.BRILHO_DISCO)
    expect(d.uAlpha.value).toBe(BURACO.OPAC_DISCO)
    const a = makeAuraMaterial().uniforms
    expect(a.uTime.value).toBe(0)
    expect(a.uEqW.value).toBe(BURACO.AURA_EQ_W)
    expect(a.uBoost.value).toBe(BURACO.BRILHO_AURA)
  })
  it('nasce na deriva do fundo e escala/visibilidade seguem o CONFIG', () => {
    const b = buildBuracoNegro()
    expect([...b.position.toArray()]).toEqual(posicaoOrbita(0))
    // mora no FUNDO: bem longe do Al (que está na origem)
    expect(Math.hypot(...posicaoOrbita(0))).toBeGreaterThan(30)
    expect(b.rotation.x).toBeCloseTo(BURACO.INCLINACAO, 6)
    expect(b.visible).toBe(BURACO.VISIVEL)
    expect(b.scale.x).toBeCloseTo(BURACO.ESCALA, 6)
  })
  it('a fase da sessão define o ponto de partida e acompanha a deriva', () => {
    const fase = 1.234
    const b = buildBuracoNegro(fase)
    expect([...b.position.toArray()]).toEqual(posicaoOrbita(0, fase))
    expect(b.userData.fase).toBe(fase)
    atualizarBuracoNegro(b, 300)
    expect([...b.position.toArray()]).toEqual(posicaoOrbita(300, fase))
    // e a posição difere da fase padrão (nada reinicia com o mesmo ponto)
    const padrao = buildBuracoNegro()
    expect([...b.position.toArray()]).not.toEqual([...padrao.position.toArray()])
  })
  it('a deriva é sutil e fica no fundo (raio pequeno, longe do Al, lenta)', () => {
    // raio pequeno em torno da âncora (NÃO é um círculo de 40 em volta do Al):
    // é o que garante que a fase sorteada nunca joga o buraco p/ trás da câmera
    expect(BURACO.ORBITA_RAIO).toBeLessThan(10)
    // o caminho inteiro fica bem longe do Al
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * ((Math.PI * 2) / BURACO.ORBITA_VEL)
      expect(Math.hypot(...posicaoOrbita(t))).toBeGreaterThan(30)
    }
    expect((Math.PI * 2) / BURACO.ORBITA_VEL).toBeGreaterThan(300) // volta em 5min+
    // raio constante ao longo de uma volta (círculo em torno da âncora)
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * ((Math.PI * 2) / BURACO.ORBITA_VEL)
      const p = posicaoOrbita(t)
      const dx = p[0] - BURACO.ORBITA_CENTRO[0], dz = p[2] - BURACO.ORBITA_CENTRO[2]
      expect(Math.hypot(dx, dz)).toBeCloseTo(BURACO.ORBITA_RAIO, 3)
    }
  })
  it('deriva passa longe da câmera o caminho todo (margem 1.0, 10min)', () => {
    const raioBH = BURACO.DISCO_EXT * BURACO.ESCALA
    for (let s = 0; s <= 600; s += 10) {
      const bp = posicaoOrbita(s)
      for (let i = 0; i <= 40; i++) {
        const p = poseAt(i / 40)
        const d = Math.hypot(p.pos[0] - bp[0], p.pos[1] - bp[1], p.pos[2] - bp[2])
        expect(d, `s=${s} t=${(i / 40).toFixed(2)}`).toBeGreaterThan(raioBH + 1.0)
      }
    }
  })
  it('em QUALQUER fase a deriva continua longe da câmera (margem 1.0)', () => {
    const raioBH = BURACO.DISCO_EXT * BURACO.ESCALA
    for (let f = 0; f < 24; f++) {
      const fase = (f / 24) * Math.PI * 2
      for (let s = 0; s <= 600; s += 30) {
        const bp = posicaoOrbita(s, fase)
        for (let i = 0; i <= 20; i++) {
          const p = poseAt(i / 20)
          const d = Math.hypot(p.pos[0] - bp[0], p.pos[1] - bp[1], p.pos[2] - bp[2])
          expect(d, `fase=${fase.toFixed(2)} s=${s} t=${(i / 20).toFixed(2)}`).toBeGreaterThan(raioBH + 1.0)
        }
      }
    }
  })
  it('em QUALQUER fase o buraco fica À FRENTE da câmera nas poses da frente (bug do "sumiu")', () => {
    // A câmera percorre as 5 poses. Nas poses em que ela olha para o fundo
    // (01/02/03/05, câmera no +z), o buraco TEM que estar à frente dela
    // (z NDC < 1): senão ele "some" e sobra só a luz direcional no Al.
    // A pose 04 é a exceção conhecida: a câmera fica ATRÁS do Al (z=-5.8,
    // olhando p/ +z), então o buraco no fundo (z≈-40) fica atrás dela — como
    // sempre foi (antes a posição era z=-24, também atrás da pose 04).
    const cam = new THREE.PerspectiveCamera(35, 1.6, 0.1, 100)
    const daFrente = [0, 1, 2, 4]
    for (let f = 0; f < 48; f++) {
      const fase = (f / 48) * Math.PI * 2
      for (const ci of daFrente) {
        const p = CHAPTERS[ci].pose
        cam.position.set(...p.pos)
        cam.lookAt(new THREE.Vector3(...p.target))
        cam.updateMatrixWorld(true)
        const bp = new THREE.Vector3(...posicaoOrbita(0, fase))
        const ndc = bp.project(cam)
        expect(ndc.z, `fase=${fase.toFixed(2)} cap${ci + 1}`).toBeLessThan(1)
      }
    }
  })
  it('em t=0 shaders zerados e grupo na origem da órbita', () => {
    const b = buildBuracoNegro()
    atualizarBuracoNegro(b, 0)
    expect(b.userData.diskMat.uniforms.uTime.value).toBe(0)
    expect(b.userData.auraMat.uniforms.uTime.value).toBe(0)
    expect([...b.position.toArray()]).toEqual(posicaoOrbita(0))
  })
  it('avança o tempo dos shaders e move o grupo na órbita', () => {
    const b = buildBuracoNegro()
    atualizarBuracoNegro(b, 30)
    expect(b.userData.diskMat.uniforms.uTime.value).toBe(30)
    expect(b.userData.auraMat.uniforms.uTime.value).toBe(30)
    expect([...b.position.toArray()]).toEqual(posicaoOrbita(30))
  })
  it('GIRA=false congela (não avança uTime)', () => {
    const b = buildBuracoNegro()
    const antes = { ...BURACO, GIRA: BURACO.GIRA }
    BURACO.GIRA = false
    try {
      atualizarBuracoNegro(b, 30)
      expect(b.userData.diskMat.uniforms.uTime.value).toBe(0)
    } finally {
      BURACO.GIRA = antes.GIRA
    }
  })
  it('knobs de personalização têm defaults sãos', () => {
    for (const k of ['OPAC_DISCO', 'OPAC_AURA', 'BRILHO_DISCO', 'BRILHO_AURA']) {
      expect(BURACO[k]).toBeGreaterThan(0)
      expect(BURACO[k]).toBeLessThanOrEqual(3)
    }
    expect(BURACO.ESCALA).toBeGreaterThan(0)
    expect(BURACO.VEL_DISCO).toBeGreaterThan(0)
  })
})
