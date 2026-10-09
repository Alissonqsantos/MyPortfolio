# Hero do Portfólio "Al" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a seção Hero do portfólio de Alisson, com o monograma 3D "Al" ao centro-direita e uma câmera que orbita 5 ângulos cinematográficos conforme o scroll.

**Architecture:** Três camadas independentes — geometria pura (extraída do Al3D), coreografia pura (capítulos/poses, sem Three.js), e cena WebGL que consome as duas e expõe `applyProgress(t, camera, target)`. O React monta a cena num `useEffect` e o GSAP/ScrollTrigger converte o scroll num `t ∈ [0,1]` que dirige a câmera.

**Tech Stack:** Vite, React 18, Three.js (r160), GSAP + ScrollTrigger, Vitest, Space Grotesk + Archivo.

**Spec:** `docs/superpowers/specs/2026-10-08-hero-portfolio-al-design.md`

## Global Constraints

- Projeto em `C:\Users\Alisson\Downloads\portfolio\` (novo).
- Three.js **r160** (mesma versão do Al3D) — importar como `three` e addons via `three/addons/`.
- `new RoomEnvironment(renderer)` **exige** o renderer como argumento no r160.
- Fontes: **Space Grotesk** (display) + **Archivo** (corpo), Google Fonts.
- Cores: fundo `#000000`, texto `#FFFFFF`, acento âmbar `#F59E0B` **só na legenda do capítulo**.
- Al **exatamente** como no Al3D atual: `COR: 0x030303`, `L_ESPESSURA: 0.7`, `CANTO_RAIO: 0.0`, demais valores do `CONFIG` copiados verbatim do bloco GEO.
- Interação: **apenas** empurrão no hover. Sem arrastar/orbitar, sem auto-girar, sem teclas.
- Hero **pinned** por 500vh; 5 capítulos; transição fluida; `prefers-reduced-motion` respeitado.
- Nome fixo à esquerda durante os 5 capítulos, fade no fim.
- Mobile (<768px): Al no topo, texto embaixo, mesmos 5 ângulos.
- Sem barra de progresso, sem menu, sem redes sociais.
- Verificação **headless** (Vitest/Node) — sem navegador automatizado.

## Review Focus

- **`t` fora de [0,1]** (overscroll/bounce do iOS manda `t<0` ou `t>1`): a câmera deve **clamp** em [0,1], nunca extrapolar para uma pose inexistente.
- **`t` exatamente `1` ou em fronteira de capítulo** (0.2, 0.4, 0.6, 0.8): `chapterIndexFor` deve devolver índice válido `0..4`, sem `undefined`.
- **WebGL indisponível**: a página deve continuar legível (nome + cargo + placeholder), sem lançar exceção.
- **Reduced motion ativo**: o pin/scrub não pode ser criado; o conteúdo deve aparecer no estado final legível.
- **Desmontagem/HMR do Vite**: `dispose()` deve liberar renderer, geometrias, materiais e o ScrollTrigger, sem "Cannot read properties of null".

---

### Task 1: Scaffold do projeto

**Files:**
- Create: `portfolio/` (Vite React), `portfolio/package.json`, `portfolio/vitest.config.js`, `portfolio/.gitignore`

**Interfaces:**
- Consumes: nada.
- Produces: scripts npm `dev`, `build`, `test`; dependências `three@0.160.0`, `gsap`.

- [ ] **Step 1: Criar o projeto Vite + React**

A pasta `portfolio/` já existe (contém `docs/`), então o scaffold roda **dentro** dela:

Run:
```bash
cd "C:/Users/Alisson/Downloads/portfolio" && npm create vite@latest . -- --template react
```
Quando o Vite avisar que o diretório não está vazio e perguntar se quer continuar, escolher **"Ignore files and continue"** (ele preserva `docs/`). Depois:
```bash
npm install
```
Expected: `src/App.jsx`, `src/main.jsx`, `package.json` criados; `docs/` intacto.

- [ ] **Step 2: Instalar dependências de produção e teste**

Run:
```bash
npm install three@0.160.0 gsap
npm install -D vitest
```
Expected: `package.json` com `three`, `gsap` em dependencies e `vitest` em devDependencies.

- [ ] **Step 3: Configurar o Vitest e o script de teste**

Create `portfolio/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config'
export default defineConfig({ test: { environment: 'node', include: ['tests/**/*.test.js'] } })
```
Adicionar em `package.json` → `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 4: Escrever um teste-smoke que falha**

Create `portfolio/tests/smoke.test.js`:
```js
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
describe('ambiente', () => {
  it('three r160 carrega e cria uma câmera', () => {
    const c = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    expect(c.fov).toBe(35)
  })
})
```

- [ ] **Step 5: Rodar o teste e verificar que passa**

Run: `npm test`
Expected: PASS (1 teste).

- [ ] **Step 6: Inicializar git e commitar**

```bash
git init && git add -A && git commit -m "chore: scaffold Vite+React com three, gsap e vitest"
```

---

### Task 2: Módulo de geometria do "Al"

**Files:**
- Create: `portfolio/src/al/geometry.js`
- Test: `portfolio/tests/geometry.test.js`

**Interfaces:**
- Consumes: `three`.
- Produces: `CONFIG`, `CONTORNO_A`, `CONTORNO_L`, `shapeFrom(pts, furos)`, `getGeometrias() -> { aGeo, lGeo }`, `buildAl(matA, matL) -> THREE.Group`, `aplicarEspessura(pts, largura)`, `arredondarCantos(pts, raio, seg)`.

- [ ] **Step 1: Escrever o teste que falha**

Create `portfolio/tests/geometry.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { CONFIG, getGeometrias, buildAl } from '../src/al/geometry.js'
import * as THREE from 'three'

const finito = (arr) => arr.every(Number.isFinite)

describe('geometria do Al', () => {
  it('mantém os valores do Al3D', () => {
    expect(CONFIG.ALTURA).toBe(3.6)
    expect(CONFIG.L_ESPESSURA).toBe(0.7)
    expect(CONFIG.CANTO_RAIO).toBe(0.0)
    expect(CONFIG.COR).toBe(0x030303)
  })
  it('gera as duas geometrias sem vértices não-finitos', () => {
    const { aGeo, lGeo } = getGeometrias()
    expect(finito(aGeo.attributes.position.array)).toBe(true)
    expect(finito(lGeo.attributes.position.array)).toBe(true)
    expect(aGeo.attributes.position.count).toBeGreaterThan(0)
    expect(lGeo.attributes.position.count).toBeGreaterThan(0)
  })
  it('produz um grupo com as letras A e l na altura certa', () => {
    const g = buildAl(new THREE.MeshPhysicalMaterial(), new THREE.MeshPhysicalMaterial())
    expect(g.getObjectByName('letraA')).toBeTruthy()
    expect(g.getObjectByName('letraL')).toBeTruthy()
    const bb = new THREE.Box3().setFromObject(g)
    expect(bb.max.y - bb.min.y).toBeCloseTo(CONFIG.ALTURA, 0)
  })
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npm test -- geometry`
Expected: FAIL — `Failed to resolve import "../src/al/geometry.js"`.

- [ ] **Step 3: Criar `src/al/geometry.js`**

Copiar **verbatim** de `C:\Users\Alisson\Downloads\Al3D\index.html`, linhas **33–287** (todo o bloco `// <<GEO-START>>` … `// <<GEO-END>>`), preservando: `CONFIG`, `ESC`, `CONTORNO_A`, `CONTORNO_L`, `FUROS_L`, `L_LARGURA_REF`, `aplicarEspessura`, `arredondarCantos`, `shapeFrom`, `GEO_CACHE`, `getGeometrias`, `buildAl`.

Trocar a 1ª linha (`import * as THREE from 'three';`) por:
```js
import * as THREE from 'three';
```
(igual — o arquivo já usa essa forma). Remover os marcadores `// <<GEO-START>>` / `// <<GEO-END>>`. Acrescentar ao final:
```js
export { CONFIG, CONTORNO_A, CONTORNO_L, FUROS_L, shapeFrom, getGeometrias, buildAl, aplicarEspessura, arredondarCantos };
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npm test -- geometry`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/al/geometry.js tests/geometry.test.js
git commit -m "feat: extrai o módulo de geometria do Al do Al3D"
```

---

### Task 3: Coreografia (capítulos, poses e mapeamento de scroll)

**Files:**
- Create: `portfolio/src/al/choreography.js`
- Test: `portfolio/tests/choreography.test.js`

**Interfaces:**
- Consumes: nada (puro, sem Three.js).
- Produces:
  - `CHAPTERS: Array<{ n: string, word: string, pose: { pos: [number,number,number], target: [number,number,number] } }>` (5 itens)
  - `chapterIndexFor(t: number) -> number` (0..4, com clamp)
  - `poseAt(t: number) -> { pos: [number,number,number], target: [number,number,number] }`

- [ ] **Step 1: Escrever o teste que falha**

Create `portfolio/tests/choreography.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { CHAPTERS, chapterIndexFor, poseAt } from '../src/al/choreography.js'

describe('coreografia', () => {
  it('tem 5 capítulos com as palavras aprovadas', () => {
    expect(CHAPTERS.map(c => c.n)).toEqual(['01','02','03','04','05'])
    expect(CHAPTERS.map(c => c.word)).toEqual(['IDENTITY','CRAFT','DETAIL','SYSTEMS','IMPACT'])
  })
  it('mapeia t para o capítulo, com clamp nas bordas', () => {
    expect(chapterIndexFor(0)).toBe(0)
    expect(chapterIndexFor(0.2)).toBe(1)
    expect(chapterIndexFor(0.4)).toBe(2)
    expect(chapterIndexFor(0.6)).toBe(3)
    expect(chapterIndexFor(0.8)).toBe(4)
    expect(chapterIndexFor(1)).toBe(4)
    expect(chapterIndexFor(-0.5)).toBe(0)   // overscroll iOS
    expect(chapterIndexFor(1.5)).toBe(4)    // overscroll iOS
  })
  it('as fronteiras caem em 20% de cada capítulo (hero de 500vh)', () => {
    // end='+=400%' => 5 telas; fronteiras em 100/200/300/400 de 500
    const idx = (y) => chapterIndexFor(y / 500)
    expect(idx(0)).toBe(0)
    expect(idx(99)).toBe(0)
    expect(idx(100)).toBe(1)
    expect(idx(299)).toBe(2)
    expect(idx(300)).toBe(3)
    expect(idx(400)).toBe(4)
    expect(idx(500)).toBe(4)
  })
  it('poseAt reproduz exatamente as poses inicial e final', () => {
    expect(poseAt(0)).toEqual(CHAPTERS[0].pose)
    expect(poseAt(1)).toEqual(CHAPTERS[4].pose)
  })
  it('poseAt é finito e clamped em toda a faixa', () => {
    for (const t of [-1, 0, 0.1, 0.37, 0.5, 0.99, 1, 2]) {
      const p = poseAt(t)
      expect([...p.pos, ...p.target].every(Number.isFinite)).toBe(true)
    }
    expect(poseAt(-1)).toEqual(CHAPTERS[0].pose)
    expect(poseAt(2)).toEqual(CHAPTERS[4].pose)
  })
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npm test -- choreography`
Expected: FAIL — `Failed to resolve import "../src/al/choreography.js"`.

- [ ] **Step 3: Criar `src/al/choreography.js`**

Escrever o módulo com: `clamp01`, `smoothstep(x) = x*x*(3-2*x)`, o array `CHAPTERS` com as 5 poses abaixo, `chapterIndexFor` e `poseAt`.

Valores das poses (posição da câmera → alvo; cena com o Al centrado, ~4.2 de largura × 3.6 de altura):
```js
export const CHAPTERS = [
  { n: '01', word: 'IDENTITY', pose: { pos: [9.5, 5.0, 15.0], target: [-1.5, 0.0, 0.0] } },
  { n: '02', word: 'CRAFT',    pose: { pos: [4.0, -3.5, 13.0], target: [0.0, 1.2, 0.0] } },
  { n: '03', word: 'DETAIL',   pose: { pos: [0.6, 3.2, 4.5],  target: [-1.7, 2.6, 0.0] } },
  { n: '04', word: 'SYSTEMS',  pose: { pos: [3.0, 12.0, 8.0], target: [0.0, 0.0, 0.0] } },
  { n: '05', word: 'IMPACT',   pose: { pos: [0.0, 2.0, 30.0], target: [0.0, 0.0, 0.0] } },
];
```
- `chapterIndexFor(t)`: `Math.min(4, Math.floor(clamp01(t) * 5))`.
- `poseAt(t)`: `x = clamp01(t) * 4`; `i = Math.min(3, Math.floor(x))`; `f = smoothstep(x - i)`; interpolar linearmente `CHAPTERS[i].pose` → `CHAPTERS[i+1].pose` (pos e target). Em `t=0` e `t=1` retornar a pose exata (sem interpolação) para casar com o teste `toEqual`.
- `progressFromScroll(scrollY, heroTop, heroHeight)`: `clamp01((scrollY - heroTop) / Math.max(heroHeight, 1e-6))`.

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npm test -- choreography`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/al/choreography.js tests/choreography.test.js
git commit -m "feat: adiciona coreografia dos 5 capítulos e mapeamento de scroll"
```

---

### Task 4: Cena WebGL e `applyProgress`

**Files:**
- Create: `portfolio/src/al/scene.js`
- Test: `portfolio/tests/scene.test.js`

**Interfaces:**
- Consumes: `geometry.js` (`CONFIG`, `buildAl`), `choreography.js` (`poseAt`, `CHAPTERS`), `three`, `three/addons/environments/RoomEnvironment.js`.
- Produces:
  - `applyProgress(t: number, camera: THREE.PerspectiveCamera, target: THREE.Vector3) -> void` — puro, sem renderer (testável em Node).
  - `createAlScene(canvas: HTMLCanvasElement) -> { setProgress(t), resize(), dispose() }`.

- [ ] **Step 1: Escrever o teste que falha**

Create `portfolio/tests/scene.test.js`:
```js
import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { applyProgress } from '../src/al/scene.js'
import { CHAPTERS } from '../src/al/choreography.js'

const cam = () => new THREE.PerspectiveCamera(35, 1.6, 0.1, 100)
const tgt = () => new THREE.Vector3()

describe('applyProgress', () => {
  it('coloca a câmera na pose do capítulo 01 em t=0', () => {
    const c = cam(), t = tgt()
    applyProgress(0, c, t)
    expect(c.position.toArray()).toEqual(CHAPTERS[0].pose.pos)
    expect(t.toArray()).toEqual(CHAPTERS[0].pose.target)
  })
  it('coloca a câmera na pose do capítulo 05 em t=1', () => {
    const c = cam(), t = tgt()
    applyProgress(1, c, t)
    expect(c.position.toArray()).toEqual(CHAPTERS[4].pose.pos)
    expect(t.toArray()).toEqual(CHAPTERS[4].pose.target)
  })
  it('permanece finito e clamped fora de [0,1]', () => {
    for (const v of [-1, 0, 0.25, 0.5, 0.75, 1, 2]) {
      const c = cam(), t = tgt()
      applyProgress(v, c, t)
      expect([...c.position.toArray(), ...t.toArray()].every(Number.isFinite)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npm test -- scene`
Expected: FAIL — `Failed to resolve import "../src/al/scene.js"`.

- [ ] **Step 3: Implementar `applyProgress` e `createAlScene`**

`applyProgress(t, camera, target)`: `const p = poseAt(t); camera.position.set(...p.pos); target.set(...p.target); camera.lookAt(target);` — deve ser **exportada** e não depender de renderer/DOM.

`createAlScene(canvas)`:
- `WebGLRenderer({ canvas, antialias: true })`; `setPixelRatio(Math.min(devicePixelRatio, 2))`; sombras `PCFSoftShadowMap`; `toneMapping = ACESFilmicToneMapping`.
- `Scene` com `background = CONFIG.FUNDO`.
- `PerspectiveCamera(CONFIG.FOV, aspecto, CONFIG.NEAR, CONFIG.FAR)` + `Vector3` alvo.
- `PMREMGenerator` → `RoomEnvironment(renderer)` (passar o renderer!) com `CONFIG.AMBIENTE`.
- Luzes/chão/sombra exatamente como no Al3D (key/fill/rim, `ShadowMaterial`, `CHAO_*`), escaladas por `ESC`.
- `buildAl(new MeshPhysicalMaterial({...}), new MeshPhysicalMaterial({...}))` com os valores do `CONFIG`; `castShadow/receiveShadow` em cada mesh.
- **Hover-push**: `Raycaster` + `pointermove` no canvas; aplicar a mesma matemática do Al3D (offset `(ox,oy)` normalizado pelo centro/meias-dimensões, roll/pitch/transl suavizados por `PUSH.SUAV`), reusando `CONFIG.PUSH`. Sem OrbitControls, sem teclas, sem auto-girar.
- Loop `requestAnimationFrame` que: lê o `t` corrente (guardado por `setProgress`), chama `applyProgress`, atualiza o hover-push e renderiza.
- `setProgress(t)` guarda o `t` (clamped) e chama `applyProgress` imediatamente.
- `resize()`: atualiza `aspect` + `updateProjectionMatrix` + `renderer.setSize` a partir de `canvas.clientWidth/Height`.
- `dispose()`: `cancelAnimationFrame`, remover os listeners de `pointermove` e do `IntersectionObserver`, `renderer.dispose()`, percorrer a cena e dar `geometry.dispose()`/`material.dispose()`.
- **Pausa fora da tela**: um `IntersectionObserver` no canvas guarda um booleano `visivel`; o loop só renderiza (e só avança o hover-push) quando `visivel` for `true`, para não gastar GPU com o hero fora da viewport.
- `setPixelRatio(Math.min(devicePixelRatio, 2))` e, quando `innerWidth < 768`, usar `SOMBRA_MAPA / 2` — mitigação de performance mobile do spec.

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npm test -- scene`
Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/al/scene.js tests/scene.test.js
git commit -m "feat: adiciona a cena WebGL com applyProgress e hover-push"
```

---

### Task 5: Layout estático do Hero (React + tipografia)

**Files:**
- Create: `portfolio/src/Hero.jsx`, `portfolio/src/App.jsx` (substituir), `portfolio/src/index.css` (substituir)
- Modify: `portfolio/index.html` (título, fontes, `lang="pt-BR"`)

**Interfaces:**
- Consumes: `createAlScene` de `scene.js`, `CHAPTERS`/`chapterIndexFor` de `choreography.js`.
- Produces: `<Hero />` montável em `App.jsx`.

- [ ] **Step 1: Escrever o teste que falha**

Create `portfolio/tests/hero-copy.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { HERO } from '../src/hero-copy.js'

describe('copy do hero', () => {
  it('traz nome e cargo aprovados', () => {
    expect(HERO.nome).toBe('Alisson')
    expect(HERO.cargo).toBe('Engenheiro de Software')
  })
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npm test -- hero-copy`
Expected: FAIL — `Failed to resolve import "../src/hero-copy.js"`.

- [ ] **Step 3: Criar `src/hero-copy.js`**

```js
export const HERO = { nome: 'Alisson', cargo: 'Engenheiro de Software' };
```

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npm test -- hero-copy`
Expected: PASS.

- [ ] **Step 5: Criar `src/Hero.jsx` (layout, sem scroll ainda)**

Estrutura: `<section className="hero" ref={heroRef}>` com um `<div className="hero-canvas-wrap"><canvas ref={canvasRef} /></div>`, um `<div className="hero-ident">` (esquerda: `<h1>{HERO.nome}</h1>` + `<p>{HERO.cargo}</p>`) e um `<div className="hero-chapter">` (canto: número + palavra do capítulo, cor âmbar). Montar a cena num `useEffect` (`createAlScene(canvas)`, guardar em ref, `dispose()` no cleanup). Por enquanto, sem GSAP — a câmera fica na pose 01 via `scene.setProgress(0)`.

- [ ] **Step 6: Estilizar `src/index.css` e `index.html`**

`index.html`: `lang="pt-BR"`, título "Alisson — Portfólio", `<link>` para Space Grotesk + Archivo. `index.css`: reset, `body { background:#000; color:#fff; font-family: Archivo }`, `.hero-canvas-wrap` fixado, `.hero-ident` à esquerda com `h1` em Space Grotesk grande, `.hero-chapter` com `color:#F59E0B`. Layout mobile-first: abaixo de 768px o Al fica no topo e o texto embaixo (`flex-direction: column`).

- [ ] **Step 7: Rodar o build e o conjunto de testes**

Run: `npm run build && npm test`
Expected: build sem erro; todos os testes PASS.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: layout estático do hero com nome, cargo e canvas do Al"
```

---

### Task 6: Ligação do scroll (GSAP pin + scrub) e reduced motion

**Files:**
- Modify: `portfolio/src/Hero.jsx`

**Interfaces:**
- Consumes: `createAlScene(...).setProgress`, `chapterIndexFor`, `CHAPTERS`, `gsap`, `gsap/ScrollTrigger`.
- Produces: hero com pin de 500vh dirigindo `setProgress`; estado de capítulo exposto no DOM (para a legenda).

- [ ] **Step 1: Ligar o GSAP no `Hero.jsx`**

No `useEffect`, após criar a cena: registrar `gsap.registerPlugin(ScrollTrigger)`. Se `prefereReduzirMovimento()` for **verdadeiro** (função da Task 7; nesta tarefa use `matchMedia('(prefers-reduced-motion: reduce)').matches` e troque na Task 7), **não** criar o ScrollTrigger — apenas `scene.setProgress(0)` e marcar o estado como "reduced" (o CSS mostra todos os capítulos empilhados e legíveis). Caso contrário, criar:
```js
const st = ScrollTrigger.create({
  trigger: heroRef.current,
  start: 'top top',
  end: '+=400%',            // 5 telas no total
  pin: true,
  scrub: true,
  onUpdate: (self) => {
    const t = self.progress;               // 0..1 já normalizado pelo GSAP
    sceneRef.current.setProgress(t);
    setCapitulo(chapterIndexFor(t));
  },
});
```
Guardar `st` numa ref e chamar `.kill()` no cleanup, junto do `scene.dispose()`. Chamar `ScrollTrigger.refresh()` no `resize`.

- [ ] **Step 2: Renderizar a legenda do capítulo**

Trocar o texto da legenda por `CHAPTERS[capitulo].n` + `CHAPTERS[capitulo].word`, com uma transição de fade (CSS) quando o índice muda.

- [ ] **Step 3: Rodar os testes e o build**

Run: `npm test && npm run build`
Expected: todos os testes PASS; build sem erro.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: liga o scroll ao hero com GSAP pin+scrub e reduced motion"
```

---

### Task 7: Robustez (fallback sem WebGL, resize, dispose)

**Files:**
- Create: `portfolio/src/al/webgl.js`
- Test: `portfolio/tests/webgl.test.js`
- Modify: `portfolio/src/Hero.jsx` (usar o detector e renderizar o fallback)

**Interfaces:**
- Consumes: nada.
- Produces: `temWebGL() -> boolean`, `prefereReduzirMovimento(matchMediaFn) -> boolean` (injetável para teste).

- [ ] **Step 1: Escrever o teste que falha**

Create `portfolio/tests/webgl.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { temWebGL, prefereReduzirMovimento } from '../src/al/webgl.js'

describe('detecção de capacidades', () => {
  it('temWebGL devolve booleano sem lançar', () => {
    expect(typeof temWebGL()).toBe('boolean')
  })
  it('prefereReduzirMovimento lê o matchMedia injetado', () => {
    const fake = () => ({ matches: true })
    expect(prefereReduzirMovimento(fake)).toBe(true)
    const fake2 = () => ({ matches: false })
    expect(prefereReduzirMovimento(fake2)).toBe(false)
  })
  it('prefereReduzirMovimento é falso quando não há matchMedia', () => {
    expect(prefereReduzirMovimento(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste e verificar que falha**

Run: `npm test -- webgl`
Expected: FAIL — `Failed to resolve import "../src/al/webgl.js"`.

- [ ] **Step 3: Criar `src/al/webgl.js`**

- `temWebGL()`: tenta criar um contexto `webgl2`/`webgl` num `<canvas>` descartável, dentro de `try/catch`; devolve `false` se lançar ou se não houver contexto (trata também `document` indefinido devolvendo `false`).
- `prefereReduzirMovimento(mm = typeof matchMedia !== 'undefined' ? matchMedia : undefined)`: se `mm` for indefinido → `false`; senão `mm('(prefers-reduced-motion: reduce)').matches`.

- [ ] **Step 4: Rodar o teste e verificar que passa**

Run: `npm test -- webgl`
Expected: PASS (3 testes).

- [ ] **Step 5: Usar o detector no `Hero.jsx`**

Se `!temWebGL()`, não chamar `createAlScene`; renderizar o fallback: um bloco com o nome + cargo e um placeholder visual do Al (um `div` com a inicial ou uma imagem), mantendo o texto legível e o scroll normal. Usar `prefereReduzirMovimento()` no lugar do `matchMedia` inline da Task 6.

- [ ] **Step 6: Rodar a suíte completa e o build**

Run: `npm test && npm run build`
Expected: todos os testes PASS; build sem erro.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: fallback sem WebGL, resize e dispose robustos"
```

---

## Verificação final (após todas as tarefas)

- [ ] `npm test` — todos os testes PASS.
- [ ] `npm run build` — sem erro.
- [ ] `npm run dev` — o usuário abre no navegador e confere visualmente: hero com o Al à direita, nome à esquerda, 5 capítulos de câmera ao rolar, empurrão no hover, legenda âmbar trocando, mobile empilhado, reduced-motion estático.
