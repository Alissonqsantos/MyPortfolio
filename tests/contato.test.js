import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { forcaGravidade } from '../src/gravidade.js'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const ler = (p) => readFileSync(join(raiz, p), 'utf8')

describe('Contato — rodapé wordmark (preview 02)', () => {
  it('footer #contato com sociais, wordmark e volta ao topo', () => {
    const jsx = ler('src/Contato.jsx')
    expect(jsx).toContain('id="contato"')
    expect(jsx).toContain('<footer')
    expect(jsx).toContain("['A', 'L', 'I', 'S', 'S', 'O', 'N']")
    expect(jsx).toContain('contato-letra')
    expect(jsx).toContain('contato-asterisco')
    expect(jsx).toContain('/asterisco.png')
    expect(jsx).toContain('<img')
    expect(jsx).toContain('GitHub')
    expect(jsx).toContain('LinkedIn')
    expect(jsx).toContain('Email')
    expect(jsx).toContain('TODO-REAL')
    // Wordmark volta ao topo via cortina (seção→hero usa a dobra).
    expect(jsx).toContain("aoNavegar(e, '#topo')")
    expect(jsx).toContain('useReveal')
  })

  it('JSX mede a força por letra e ativa só sobre os glifos', () => {
    const jsx = ler('src/Contato.jsx')
    expect(jsx).toContain('forcaGravidade')
    expect(jsx).toContain('onFocus')
    expect(jsx).toContain('onBlur')
    expect(jsx).toContain('--g')
    expect(jsx).toContain('--dir')
    // Sem translate, ângulo ou escala no JS: só g/dir; o CSS faz o resto.
    expect(jsx).not.toContain('--tx')
    expect(jsx).not.toContain('--ty')
    expect(jsx).not.toContain('--ang')
    expect(jsx).not.toContain('--sx')
    expect(jsx).not.toContain('--sy')
    // Zona exata: delegação com filtro de glifo + buraco + classe, não :hover do link.
    expect(jsx).toContain('contato-ativo')
    expect(jsx).toContain('.contato-letra, .contato-asterisco')
    expect(jsx).not.toContain('onMouseEnter')
    expect(jsx).not.toContain('onMouseLeave')
    // Desligamento com tolerância: sem flicker ao cruzar letras, e o ícone
    // volta ao normal (a regra dele lê a classe, não --g).
    expect(jsx).toContain('desligar')
    expect(jsx).toContain('setTimeout')
    expect(jsx).toContain('clearTimeout')
    expect(jsx).toContain('(hover: hover)')
    expect(jsx).toContain('prefers-reduced-motion')
  })

  it('gradiente: N perto do ícone puxa mais que o A inicial', () => {
    const raio = 1000 // largura do wordmark
    const icone = { x: 950, y: 0 }
    const gN = forcaGravidade(icone, { x: 900, y: 0 }, raio).g
    const gA = forcaGravidade(icone, { x: 100, y: 0 }, raio).g
    expect(gN).toBeGreaterThan(0.5)
    expect(gA).toBeLessThan(0.2)
    expect(gN).toBeGreaterThan(gA)
  })

  it('CSS estira as letras em direção ao núcleo, glow sutil só no buraco', () => {
    const css = ler('src/Contato.css')
    expect(css).toContain('.contato-wordmark')
    expect(css).toContain('clamp(4rem, 14.5vw, 13rem)')
    expect(css).toContain('.contato-letra')
    // skewX puro com pivô na baseline: cisalhamento horizontal nunca muda
    // o Y — base, topo e altura cravados por construção; topo desliza rumo
    // ao núcleo. Sem translate, sem scale, sem rotate.
    expect(css).toContain('transform-origin: 50% 100%')
    expect(css).toContain('skewX(calc(var(--dir) * var(--g) * -7deg)')
    expect(css).not.toContain('rotate(var(--ang')
    expect(css).not.toContain('scale(var(--sx')
    expect(css).not.toContain('translate(var(--tx')
    // Blur reduzido (metade): distorção legível, sem derreter.
    expect(css).toContain('blur(calc(var(--g) * 0.7px))')
    // Ativação por classe (zona exata nos glifos), nunca :hover da caixa.
    expect(css).toContain('.contato-ativo')
    expect(css).not.toContain('.contato-wordmark:hover .contato-letra')
    // Zona exata em CSS: <a> sem hit (só glifos com auto); sociais acima
    // no hit-test, sempre clicáveis.
    expect(css).toContain('pointer-events: none')
    expect(css).toContain('pointer-events: auto')
    expect(css).toContain('z-index: 2')
    expect(css).not.toContain('contato-buraco-pulso')
    expect(css).toContain('scale(1.12)')
    expect(css).toContain('drop-shadow(0 0 4px rgba(151, 128, 255, 0.25))')
    expect(css).not.toContain('0 0 calc(var(--g) * 18px)')
    expect(css).toContain('(hover: hover)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('var(--al-out)')
  })

  it('App monta Contato após Trabalhos (resolve #contato do nav)', () => {
    const app = ler('src/App.jsx')
    expect(app).toContain("from './Contato.jsx'")
    expect(app).toContain('<Contato')
    const trabalhos = app.indexOf('<Trabalhos')
    const contato = app.indexOf('<Contato')
    expect(trabalhos).toBeGreaterThanOrEqual(0)
    expect(contato).toBeGreaterThan(trabalhos)
  })
})