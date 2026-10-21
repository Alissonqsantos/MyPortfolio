import { describe, it, expect } from 'vitest'
import { SESSAO, sortearSessao, sessaoValida, tempoDaSessao, obterSessao } from '../src/al/sessao.js'

// Storage falso em memória, para testar persistência sem navegador.
function storageFalso(inicial = null) {
  const mapa = new Map()
  if (inicial) mapa.set(SESSAO.CHAVE, JSON.stringify(inicial))
  return {
    getItem: (k) => (mapa.has(k) ? mapa.get(k) : null),
    setItem: (k, v) => mapa.set(k, String(v)),
  }
}

describe('sessão do navegador', () => {
  it('sorteia seed (1..2^31), fase (0..2π) e início', () => {
    const rand = () => 0.5
    const s = sortearSessao(rand, 1000)
    expect(s.seed).toBeGreaterThanOrEqual(1)
    expect(s.seed).toBeLessThanOrEqual(0x7fffffff)
    expect(s.fase).toBeGreaterThanOrEqual(0)
    expect(s.fase).toBeLessThan(Math.PI * 2)
    expect(s.inicio).toBe(1000)
    expect(sessaoValida(s, 1000)).toBe(true)
  })
  it('recarregar (F5) NÃO reinicia: mesma sessão volta do storage', () => {
    const st = storageFalso()
    const a = obterSessao(st, () => 0.25, 5000)
    const b = obterSessao(st, () => 0.99, 9000) // "F5" logo depois
    expect(b).toEqual(a) // seed e fase idênticos: o céu não reinicia
    expect(tempoDaSessao(b, 9000)).toBe(4) // e o relógio continua de onde estava
  })
  it('fechar e abrir o navegador reinicia: storage vazio sorteia tudo de novo', () => {
    const a = obterSessao(storageFalso(), () => 0.1, 1000)
    const b = obterSessao(storageFalso(), () => 0.8, 2000)
    expect(b.seed).not.toBe(a.seed)
    expect(b.fase).not.toBe(a.fase)
  })
  it('sessão vencida (> VALIDADE_H) é tratada como nova', () => {
    const velha = { seed: 7, fase: 1.0, inicio: 0 }
    expect(sessaoValida(velha, SESSAO.VALIDADE_H * 3600e3 + 1)).toBe(false)
    const nova = obterSessao(storageFalso(velha), () => 0.3, SESSAO.VALIDADE_H * 3600e3 + 10)
    expect(nova.seed).not.toBe(7)
  })
  it('sessão corrompida é substituída por uma nova', () => {
    const st = storageFalso({ seed: 'x', fase: null, inicio: 'y' })
    const s = obterSessao(st, () => 0.42, 1000)
    expect(sessaoValida(s, 1000)).toBe(true)
    expect(Number.isFinite(s.seed)).toBe(true)
  })
  it('sem storage (Node/privado) funciona em memória e persiste no processo', () => {
    const a = obterSessao(null, () => 0.6, 100)
    const b = obterSessao(null, () => 0.9, 200) // mesmo processo = mesma sessão
    expect(b).toEqual(a)
  })
  it('o relógio da sessão nunca fica negativo', () => {
    expect(tempoDaSessao({ inicio: 5000 }, 4000)).toBe(0)
  })
})
