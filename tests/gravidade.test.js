import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { forcaGravidade, ndcParaPx, GRAVIDADE_RAIO } from '../src/gravidade.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

describe('forcaGravidade (lente em px)', () => {
  it('é zero fora do raio de influência', () => {
    expect(forcaGravidade({ x: 0, y: 0 }, { x: GRAVIDADE_RAIO + 50, y: 0 })).toEqual({ g: 0, dir: 0 })
    expect(forcaGravidade({ x: 0, y: 0 }, { x: 0, y: -GRAVIDADE_RAIO - 1 })).toEqual({ g: 0, dir: 0 })
  })

  it('é máxima colada no disco e aponta para o lado certo', () => {
    const perto = forcaGravidade({ x: 100, y: 50 }, { x: 101, y: 50 })
    expect(perto.g).toBeGreaterThan(0.99)
    expect(perto.dir).toBe(-1) // buraco à esquerda do link
    const dir = forcaGravidade({ x: 100, y: 50 }, { x: 99, y: 50 })
    expect(dir.dir).toBe(1) // buraco à direita do link
  })

  it('cai suavemente com a distância (meio do raio ≈ 0,5)', () => {
    const { g } = forcaGravidade({ x: 0, y: 0 }, { x: GRAVIDADE_RAIO / 2, y: 0 })
    expect(g).toBeCloseTo(0.5, 1)
  })

  it('dir é 0 quando o link está exatamente em cima do disco', () => {
    expect(forcaGravidade({ x: 10, y: 10 }, { x: 10, y: 10 }).dir).toBe(0)
  })

  it('raio inválido zera sem quebrar', () => {
    expect(forcaGravidade({ x: 0, y: 0 }, { x: 0, y: 0 }, 0)).toEqual({ g: 0, dir: 0 })
  })
})

describe('ndcParaPx', () => {
  it('centro do NDC vira centro do canvas', () => {
    const r = { left: 0, top: 0, width: 1600, height: 900 }
    expect(ndcParaPx({ x: 0, y: 0 }, r)).toEqual({ x: 800, y: 450 })
  })

  it('canto superior-direito do NDC vira canto do canvas', () => {
    const r = { left: 0, top: 0, width: 1600, height: 900 }
    expect(ndcParaPx({ x: 1, y: 1 }, r)).toEqual({ x: 1600, y: 0 })
  })

  it('respeita o offset do canvas na página', () => {
    const r = { left: 100, top: 50, width: 800, height: 600 }
    expect(ndcParaPx({ x: -1, y: -1 }, r)).toEqual({ x: 100, y: 650 })
  })
})

describe('contrato cena ↔ Nav da gravidade', () => {
  it('cena projeta o buraco e publica --bh-* no body a ~10Hz', () => {
    const scene = ler('src/al/scene.js')
    expect(scene).toContain('.project(camera)')
    expect(scene).toContain('--bh-px')
    expect(scene).toContain('--bh-py')
    expect(scene).toContain('--bh-vis')
    expect(scene).toContain('frameGrav')
  })

  it('Nav mede cada link e escreve --g/--dir, pausando no overlay e em reduced-motion', () => {
    const jsx = ler('src/Nav.jsx')
    expect(jsx).toContain('forcaGravidade')
    expect(jsx).toContain('--g')
    expect(jsx).toContain('--dir')
    expect(jsx).toContain('prefers-reduced-motion: reduce')
    expect(jsx).toContain('linksRef')
  })

  it('Nav.css distorce pela proximidade e zera com motion reduzido', () => {
    const css = ler('src/Nav.css')
    expect(css).toContain('skewX(calc(var(--dir) * var(--g) * 14deg))')
    expect(css).toContain('prefers-reduced-motion: no-preference')
  })
})
