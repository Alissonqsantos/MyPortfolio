import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { NAV_LINKS, NAV_MOBILE_QUERY } from '../src/nav-links.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

describe('links do nav', () => {
  it('traz os 4 links das seções futuras, com hrefs únicos em #', () => {
    expect(NAV_LINKS).toHaveLength(4)
    const hrefs = NAV_LINKS.map((l) => l.href)
    expect(new Set(hrefs).size).toBe(4)
    for (const l of NAV_LINKS) {
      expect(l.href.startsWith('#')).toBe(true)
      expect(l.label.length).toBeGreaterThan(0)
    }
  })

  it('usa o breakpoint mobile do projeto (767px)', () => {
    expect(NAV_MOBILE_QUERY).toBe('(max-width: 767px)')
  })
})

describe('contrato do Nav.jsx', () => {
  const jsx = ler('src/Nav.jsx')

  it('importa os links do módulo puro', () => {
    expect(jsx).toContain("from './nav-links.js'")
    expect(jsx).toContain('NAV_LINKS')
  })

  it('fecha com ESC e trava o scroll com o overlay aberto', () => {
    expect(jsx).toContain('Escape')
    expect(jsx).toContain('overflow')
  })

  it('expõe o estado do menu para tecnologia assistiva', () => {
    expect(jsx).toContain('aria-expanded')
    expect(jsx).toContain('aria-controls="nav-overlay"')
    expect(jsx).toContain('aria-label="Principal"')
    expect(jsx).toContain('aria-label="Menu"')
  })

  it('só monta o overlay no mobile e o fecha ao sair do mobile', () => {
    expect(jsx).toContain('isMobile')
    expect(jsx).toContain('matchMedia')
  })

  it('move o foco para o fechar ao abrir', () => {
    expect(jsx).toContain("getElementById('nav-fechar')")
  })
})

describe('contrato do Nav.css', () => {
  const css = ler('src/Nav.css')

  it('usa blend-difference sem caixa (Yakushev) e lavanda do hero', () => {
    expect(css).toContain('mix-blend-mode: difference')
    expect(css).toContain('#9780ff')
    expect(css).not.toContain('border-radius: 999px')
  })

  it('empilha certo: canvas < nav < overlay < header-aberto < burger', () => {
    expect(css).toContain('z-index: 50')
    expect(css).toContain('z-index: 60')
    expect(css).toContain('z-index: 61')
    expect(css).toContain('z-index: 62')
  })

  it('tem hit-area mínima 44px e foco visível com anel lavanda', () => {
    expect(css).toContain('44px')
    expect(css).toContain(':focus-visible')
    expect(css).toContain('outline: 2px solid #9780ff')
  })

  it('congela o motion sob prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion')
  })

  it('overlay tem blur e links gigantes com stagger por --i', () => {
    expect(css).toContain('backdrop-filter: blur(18px)')
    expect(css).toContain('clamp(2.6rem, 13vw, 5rem)')
    expect(css).toContain('var(--i)')
  })
})

describe('integração no App', () => {
  const app = ler('src/App.jsx')

  it('renderiza o Nav acima do Hero dentro de main#topo', () => {
    expect(app).toContain('<Nav')
    expect(app).toContain('id="topo"')
    expect(app.indexOf('<Nav')).toBeLessThan(app.indexOf('<Hero'))
  })
})
