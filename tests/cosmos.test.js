import { describe, it, expect } from 'vitest'
import { COSMOS, buildCosmos, buildNebulosa, atualizarNebulosa, anguloDerivaNebulosa, sortearCadente, poseCadente, criarLinhaCadente, atualizarLinhaCadente, atualizarSol, buildSol, posicaoSol, semente, dessaturar, sortearClasse } from '../src/al/cosmos.js'
import { posicaoOrbita } from '../src/al/buracoNegro.js'

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
  it('seeds diferentes geram céus diferentes (sessão nova = céu novo)', () => {
    const a = buildCosmos(1).children.find((o) => o.isPoints).geometry.attributes.position.array
    const b = buildCosmos(2).children.find((o) => o.isPoints).geometry.attributes.position.array
    expect([...a]).not.toEqual([...b])
  })
  it('não tem sprites visíveis (sem manchas no céu — só estrelas)', () => {
    const c = buildCosmos()
    expect(c.children.filter((o) => o.isSprite)).toHaveLength(0)
    expect(c.children.filter((o) => o.isPoints)).toHaveLength(1)
  })
  it('deriva quase parada (volta completa em mais de 30min)', () => {
    expect((Math.PI * 2) / COSMOS.DERIVA).toBeGreaterThan(30 * 60)
  })
  it('as proporções das classes somam 1 (população real)', () => {
    const total = Object.values(COSMOS.POPULACAO).reduce((s, p) => s + p, 0)
    expect(total).toBeCloseTo(1, 6)
    // M domina, B é rara — como no céu de verdade
    expect(COSMOS.POPULACAO.M).toBeGreaterThan(0.7)
    expect(COSMOS.POPULACAO.B).toBeLessThan(0.01)
  })
  it('sorteio de classe segue as proporções (em ~100k amostras)', () => {
    const rand = semente(2026)
    const cont = {}
    const N = 100000
    for (let i = 0; i < N; i++) {
      const c = sortearClasse(rand)
      cont[c] = (cont[c] || 0) + 1
    }
    for (const [classe, p] of Object.entries(COSMOS.POPULACAO)) {
      expect(cont[classe] / N, classe).toBeCloseTo(p, 1)
    }
  })
  it('tamanhos: cada classe tem sua faixa, e o total é 0.08–0.45', () => {
    let min = Infinity, max = -Infinity
    for (const C of Object.values(COSMOS.CLASSES)) {
      expect(C.TAM[0]).toBeLessThan(C.TAM[1])
      min = Math.min(min, C.TAM[0])
      max = Math.max(max, C.TAM[1])
    }
    expect(min).toBeCloseTo(0.08, 6)
    expect(max).toBeCloseTo(0.45, 6)
    // classes mais quentes (A, B) são maiores que as frias (M, K)
    expect(COSMOS.CLASSES.A.TAM[0]).toBeGreaterThan(COSMOS.CLASSES.M.TAM[1])
    expect(COSMOS.CLASSES.B.TAM[0]).toBeGreaterThan(COSMOS.CLASSES.K.TAM[1])
  })
  it('as estrelas têm cor e tamanho por classe (buffers aCor/aTamanho)', () => {
    const stars = buildCosmos().children.find((o) => o.isPoints)
    const tam = stars.geometry.attributes.aTamanho
    const cor = stars.geometry.attributes.aCor
    expect(tam.count).toBe(COSMOS.ESTRELAS)
    expect(cor.count).toBe(COSMOS.ESTRELAS)
    for (let i = 0; i < tam.count; i++) {
      expect(tam.getX(i)).toBeGreaterThanOrEqual(0.08 - 1e-6)
      expect(tam.getX(i)).toBeLessThanOrEqual(0.45 + 1e-6)
      // cor com brilho: componente máxima de M (0.7x) a B (1.5x)
      const m = Math.max(cor.getX(i), cor.getY(i), cor.getZ(i))
      expect(m).toBeGreaterThan(0)
      expect(m).toBeLessThanOrEqual(1.5 + 1e-6)
    }
    // cores diferentes existem (não é um céu monocromático)
    const cores = new Set()
    for (let i = 0; i < cor.count; i++) {
      cores.add(`${cor.getX(i).toFixed(3)},${cor.getY(i).toFixed(3)},${cor.getZ(i).toFixed(3)}`)
    }
    expect(cores.size).toBeGreaterThan(1)
  })
  it('dessaturação puxa a cor para o branco sem descaracterizar', () => {
    expect(dessaturar(0x000000, 0)).toBe(0x000000)
    expect(dessaturar(0x000000, 1)).toBe(0xffffff)
    const m = dessaturar(COSMOS.CORES.M) // laranja-avermelhada
    const r = (m >> 16) & 255, b = m & 255
    expect(r).toBeGreaterThan(b) // continua quente
    expect(b).toBeGreaterThan((COSMOS.CORES.M & 255)) // mas mais clara
  })
  it('nebulosas: esfera de céu contínua, aditiva, sem depthWrite, atrás de tudo', () => {
    const n = buildNebulosa()
    const esfera = n.getObjectByName('nebulosa-esfera')
    expect(esfera).toBeTruthy()
    expect(esfera.material.isShaderMaterial).toBe(true)
    expect(esfera.material.blending).toBe(2) // AdditiveBlending
    expect(esfera.material.depthWrite).toBe(false)
    expect(esfera.material.side).toBe(1) // BackSide: vista por dentro
    expect(esfera.renderOrder).toBeLessThan(0) // atrás das estrelas e do Al
    // o céu é maior que a casca das estrelas (40-60) e cabe no FAR (100)
    expect(esfera.geometry.parameters.radius).toBeGreaterThan(COSMOS.RAIO_MAX)
    expect(esfera.geometry.parameters.radius).toBeLessThan(100)
  })
  it('nebulosas são BEM sutis (opacidade máx ≤ 0.15) e usam a paleta roxa', () => {
    expect(COSMOS.NEBULOSA.OPACIDADE).toBeGreaterThan(0)
    expect(COSMOS.NEBULOSA.OPACIDADE).toBeLessThanOrEqual(0.15)
    const u = buildNebulosa().userData.mat.uniforms
    expect(u.uOpac.value).toBe(COSMOS.NEBULOSA.OPACIDADE)
    // COR1/COR2 são roxas/magenta: canal azul > verde
    const c1 = u.uCor1.value, c2 = u.uCor2.value
    expect(c1.b).toBeGreaterThan(c1.g)
    expect(c2.b).toBeGreaterThan(c2.g)
  })
  it('nebulosas: 3-4 lóbulos grandes, todos na periferia (longe do vazio)', () => {
    expect(COSMOS.NEBULOSA.LOBOS).toBeGreaterThanOrEqual(3)
    expect(COSMOS.NEBULOSA.LOBOS).toBeLessThanOrEqual(4)
    const n = buildNebulosa()
    const { lobos, voidDir } = n.userData
    expect(lobos).toHaveLength(6) // slots (máx. do GLSL); o shader usa LOBOS
    expect(n.userData.mat.uniforms.uLobos.value).toBe(COSMOS.NEBULOSA.LOBOS)
    // cada lóbulo fica FORA da zona do vazio (gás nas bordas)
    for (const d of lobos) {
      expect(d.angleTo(voidDir)).toBeGreaterThan(COSMOS.NEBULOSA.VOID_RAIO)
    }
    // e o vazio aponta para o fundo (-z), onde a câmera da frente olha
    expect(voidDir.z).toBeLessThan(-0.9)
  })
  it('nebulosas: determinísticas por seed e diferentes entre seeds (mesma sessão)', () => {
    const a = buildNebulosa(1).userData.lobos.map((v) => v.toArray())
    const b = buildNebulosa(1).userData.lobos.map((v) => v.toArray())
    const c = buildNebulosa(2).userData.lobos.map((v) => v.toArray())
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })
  it('nebulosas derivam MAIS DEVAGAR que as estrelas e a deriva avança o uAngulo', () => {
    expect(COSMOS.NEBULOSA.VEL).toBeGreaterThan(0)
    expect(COSMOS.NEBULOSA.VEL).toBeLessThan(COSMOS.DERIVA)
    const n = buildNebulosa()
    atualizarNebulosa(n, 100)
    expect(n.userData.mat.uniforms.uAngulo.value).toBeCloseTo(anguloDerivaNebulosa(100), 9)
    expect(n.userData.mat.uniforms.uAngulo.value).toBeGreaterThan(0)
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
  it('luz roxa nasce do buraco negro (posição = órbita dele)', () => {
    const sol = buildSol(1)
    expect(sol.isDirectionalLight).toBe(true)
    expect(sol.color.getHex()).toBe(COSMOS.SOL.COR)
    expect(sol.intensity).toBe(COSMOS.SOL.INT)
    // a luz parte da posição do buraco, em qualquer instante
    for (const t of [0, 10, 60, 300]) {
      expect(posicaoSol(t)).toEqual(posicaoOrbita(t))
    }
    // longe do Al o caminho todo
    for (const t of [0, 10, 20, 40, 60]) {
      expect(Math.hypot(...posicaoSol(t))).toBeGreaterThan(25)
    }
    // se move com ele: duas amostras distantes diferem
    const a = posicaoSol(0), b = posicaoSol(60)
    expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeGreaterThan(0.5)
  })
  it('a fase da sessão desloca a órbita inteira (buraco + luz)', () => {
    const fase = 2.5
    // posicaoSol com fase = posicaoOrbita com a mesma fase, em vários t
    for (const t of [0, 30, 120]) {
      expect(posicaoSol(t, fase)).toEqual(posicaoOrbita(t, fase))
    }
    // e a posição difere da fase padrão (órbita realmente deslocada)
    const a = posicaoSol(0), b = posicaoSol(0, fase)
    expect(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])).toBeGreaterThan(1)
    // buildSol/atualizarSol respeitam a fase
    const luz = buildSol(1, fase)
    expect(luz.position.toArray()).toEqual(posicaoOrbita(0, fase))
    atualizarSol(luz, 45, 1, fase)
    expect(luz.position.toArray()).toEqual(posicaoOrbita(45, fase))
  })
  it('o sol é só luz (sem corpo visível): atualizarSol move apenas a luz', () => {
    const sol = buildSol(1)
    atualizarSol(sol, 15, 1)
    expect(sol.position.toArray()).toEqual(posicaoSol(15))
  })
})
