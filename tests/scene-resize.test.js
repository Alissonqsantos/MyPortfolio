import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

describe('Resize anti-estico do fundo 3D', () => {
  it('scene mede a CAIXA do wrap (não só o canvas)', () => {
    const scene = ler('src/al/scene.js')
    expect(scene).toContain('canvas.parentElement')
    expect(scene).toContain('camera.aspect = w / h')
    expect(scene).toContain('renderer.setSize(w, h, false)')
  })

  it('scene pula resize redundante (setSize realoca o buffer)', () => {
    const scene = ler('src/al/scene.js')
    expect(scene).toContain('ultimaCaixa')
    expect(scene).toContain('resizeTo')
  })

  it('scene ressincroniza via ResizeObserver com backstop sem-trava', () => {
    const scene = ler('src/al/scene.js')
    expect(scene).toContain('ResizeObserver')
    expect(scene).toContain('requestAnimationFrame(resize)')
    expect(scene).toContain('setTimeout(resize, 120)')
    expect(scene).not.toContain('caixaPendente')
    expect(scene).toContain('observadorCaixa.disconnect()')
  })

  it('Hero mede DEPOIS do layout (refresh primeiro, rAF + backstop)', () => {
    const hero = ler('src/Hero.jsx')
    const refresh = hero.indexOf('ScrollTrigger.refresh()')
    // O resize IMEDIATO (caso comum) vem logo após o refresh; os
    // DEFERIDOS (pós-layout) vêm depois do rAF. indexOf pega o primeiro.
    const rafResize = hero.indexOf('requestAnimationFrame(() => scene.resize())')
    expect(refresh).toBeGreaterThanOrEqual(0)
    expect(rafResize).toBeGreaterThan(refresh)
    expect(hero).toContain('cancelAnimationFrame(resizeRaf)')
    expect(hero).toContain('setTimeout(() => scene.resize(), 150)')
    expect(hero).toContain('clearTimeout(resizeTimer)')
  })
})
