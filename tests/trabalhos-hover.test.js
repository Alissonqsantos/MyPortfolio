import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

describe('Trabalhos sem contador + hover premium', () => {
  it('contador removido do JSX e do CSS', () => {
    const jsx = ler('src/Trabalhos.jsx')
    const css = ler('src/Trabalhos.css')
    expect(jsx).not.toContain('trabalhos-contador')
    expect(jsx).not.toContain('setIndice')
    expect(jsx).not.toContain('useState')
    expect(css).not.toContain('.trabalhos-contador {')
  })

  it('thumb em camadas com CTA e glow que segue o mouse', () => {
    const jsx = ler('src/Trabalhos.jsx')
    expect(jsx).toContain('trabalho-thumb-fundo')
    expect(jsx).toContain('trabalho-thumb-veu')
    expect(jsx).toContain('trabalho-thumb-cta')
    expect(jsx).toContain('definirBrilho')
    expect(jsx).toContain('onMouseMove')
    expect(jsx).toContain('--mx')
    expect(jsx).toContain('--my')
  })

  it('último card termina visível: espaçador real + medida no viewport', () => {
    const jsx = ler('src/Trabalhos.jsx')
    const css = ler('src/Trabalhos.css')
    // Espaçador final como elemento real (padding-right é ignorado no
    // scrollWidth pelo Chromium e encurtava o tween).
    expect(css).toContain('.trabalhos-trilho::after')
    expect(css).toContain('flex: 0 0 8vw')
    // Medição contra o viewport real, não window.innerWidth.
    expect(jsx).toContain('viewportRef')
    expect(jsx).toContain('trilho.scrollWidth - viewport.clientWidth')
    expect(jsx).not.toContain('scrollWidth - window.innerWidth')
  })

  it('hover não é clipado no topo: sangria vertical no viewport', () => {
    const css = ler('src/Trabalhos.css')
    expect(css).toContain('padding-block: 24px')
    expect(css).toContain('margin-block: -24px')
    // Sem espaçador horizontal na pilha vertical (mobile/reduced-motion).
    expect(css).toContain('.trabalhos-trilho::after')
  })

  it('pin tem sala: secao com min-height 104svh no desktop', () => {
    const css = ler('src/Trabalhos.css')
    expect(css).toContain('@media (min-width: 768px)')
    expect(css).toContain('min-height: 104svh')
    // Reduced-motion volta a pilha sem altura mínima (sem pin lá).
    expect(css).toContain('min-height: 0')
  })

  it('CSS cobre hover, teclado, touch e reduced-motion', () => {
    const css = ler('src/Trabalhos.css')
    expect(css).toContain('.trabalho-card:hover .trabalho-thumb-fundo')
    expect(css).toContain('.trabalho-card:focus-within .trabalho-thumb-veu')
    expect(css).toContain('.trabalho-card:focus-within .trabalho-thumb-cta')
    expect(css).toContain('.trabalho-nome::after')
    expect(css).toContain('@media (hover: none)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    // Easings do DS alisson, não valores mágicos soltos no hover.
    expect(css).toContain('var(--al-out)')
  })
})
