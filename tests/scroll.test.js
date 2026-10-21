import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

describe('Lenis (receita portfolio-alisson)', () => {
  it('usa Lenis 1.x com lagSmoothing 0', () => {
    const pkg = JSON.parse(ler('package.json'))
    expect(pkg.dependencies.lenis).toMatch(/^(\^|~)?1\./)
    expect(ler('src/useLenis.js')).toContain('lagSmoothing: 0')
  })

  it('liga ScrollTrigger.update + ticker.raf e destrói ao desmontar', () => {
    const hook = ler('src/useLenis.js')
    expect(hook).toContain("lenis.on('scroll', ScrollTrigger.update)")
    expect(hook).toContain('gsap.ticker.add')
    expect(hook).toContain('gsap.ticker.lagSmoothing(0)')
    expect(hook).toContain('lenis.destroy()')
  })

  it('não instancia sob reduced-motion (fallback nativo)', () => {
    expect(ler('src/useLenis.js')).toContain('prefereReduzirMovimento')
  })

  it('App detém a única instância e trava no overlay', () => {
    const app = ler('src/App.jsx')
    expect(app).toContain('useLenis()')
    expect(app).toContain('lenis.stop()')
    expect(app).toContain('lenis.start()')
    expect(ler('src/Hero.jsx')).not.toContain('useLenis')
  })
})

describe('Âncoras do nav via Lenis', () => {
  it('Nav delega o clique ao App com fallback nativo', () => {
    const nav = ler('src/Nav.jsx')
    expect(nav).toContain('aoNavegar?.(e, l.href)')
    const app = ler('src/App.jsx')
    expect(app).toContain('lenis.scrollTo(alvo)')
    expect(app).toContain('scrollIntoView({ behavior:')
    expect(app).toContain("'smooth'")
  })

  it('CSS tem fallback smooth quando o Lenis está off', () => {
    expect(ler('src/index.css')).toContain('scroll-behavior: smooth')
  })
})

describe('Reveals + scrub + progresso', () => {
  it('hero usa scrub amortecido + snap suave nos limites de capítulo', () => {
    const hero = ler('src/Hero.jsx')
    expect(hero).toContain('scrub: 1')
    expect(hero).toContain('limitesCapitulos()')
    expect(hero).toContain('snapTo')
    expect(hero).toContain('duration: 1')
    expect(hero).toContain("ease: 'expo.out'")
  })

  it('useReveal observa threshold .18 e marca uma vez', () => {
    const hook = ler('src/useReveal.js')
    expect(hook).toContain('threshold: 0.18')
    expect(hook).toContain('reveal-visivel')
    expect(hook).toContain('unobserve')
  })

  it('hero-ident entra em reveal', () => {
    const hero = ler('src/Hero.jsx')
    expect(hero).toContain('hero-ident reveal')
    expect(hero).not.toContain('scroll-progresso')
  })

  it('tokens de motion do DS + reduced-motion resolvem sem JS', () => {
    const css = ler('src/index.css')
    expect(css).toContain('--al-ease: cubic-bezier(0.22, 0.61, 0.36, 1)')
    expect(css).toContain('--al-out: cubic-bezier(0.16, 1, 0.3, 1)')
    expect(css).toContain('--al-roll: cubic-bezier(0.11, 0.82, 0.39, 0.92)')
    expect(css).toContain('--al-blue: #0099ff')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('seleção só troca a cor da fonte, sem marca-texto', () => {
    const css = ler('src/index.css')
    expect(css).toContain('::selection')
    expect(css).toContain('::-moz-selection')
    expect(css).toContain('color: #9780ff')
    expect(css).toContain('background: transparent')
  })
})
