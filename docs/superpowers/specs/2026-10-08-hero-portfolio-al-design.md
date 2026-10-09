# Hero do Portfólio "Al" — Design

Data: 2026-10-08
Status: aprovado em conversa (aguardando revisão do spec escrito)

## Objetivo

Primeira entrega do portfólio pessoal de **Alisson** (Engenheiro de Software):
uma seção **Hero** que apresenta o monograma 3D **"Al"** como peça central. O
visitante rola a página e a câmera **orbita o "Al" por 5 ângulos
cinematográficos**, enquanto o nome fica fixo à esquerda.

Sucesso = uma abertura que parece um estúdio de design premiado (referências
Visuvate, Salt & Pepper, Max Milkin), com o 3D como protagonista, e que roda
liso no desktop e no celular.

## Escopo

**Dentro:** apenas o Hero. A página termina ao fim do scroll do hero — nada
abaixo nesta entrega.

**Fora:** demais seções (trabalhos, sobre, contato), menu, rodapé, CMS,
deploy. Serão projetos/specs próprios depois.

## Referências de design (norte)

- **Visuvate** (foco principal): fundo preto, tipografia display grande,
  paleta monocromática, muito respiro, "View Project" sóbrio. Awwwards HM.
- **Salt & Pepper (snp.agency)**: obra em lista editorial numerada
  (100→00), cada item com categoria, stack e sub-números `01-05`; uppercase,
  minimal. **Origem da linguagem 01–05 dos capítulos.**
- **Max Milkin**: preto e branco quase xadrez, movimento suave, tipografia
  estruturada, "calma e precisão", foco em 3D/microanimações.

## Stack

- **Vite + React** (projeto novo em `C:\Users\Alisson\Downloads\portfolio\`).
- **Three.js puro** para o "Al" (não React Three Fiber): o canvas é dirigido
  por um módulo próprio; o React cuida só de layout/texto.
- **GSAP + ScrollTrigger** para a coreografia de scroll (pin + scrub).
- Fontes Google: **Space Grotesk** (display) + **Archivo** (corpo).

## Arquitetura

Três camadas independentes, cada uma com uma responsabilidade só. A interface
entre elas é **uma função**: `scene.setProgress(t)` com `t ∈ [0, 1]`.

| Camada | Arquivo | Responsabilidade | Depende de |
|---|---|---|---|
| Geometria | `src/al/geometry.js` | Bloco `<<GEO-START>>/<<GEO-END>>` extraído do Al3D: `CONFIG`, contornos, `aplicarEspessura`, `arredondarCantos`, `shapeFrom`, `getGeometrias`, `buildAl`. Sem DOM. | Three.js |
| Cena | `src/al/scene.js` | Renderer, câmera, luzes, chão, hover-push, loop de render. Expõe `createAlScene(canvas) -> { setProgress, dispose, resize }`. | geometry.js |
| UI | `src/Hero.jsx` + `src/App.jsx` | Layout, texto (nome, cargo, legenda do capítulo), monta a cena num `useEffect`, liga o ScrollTrigger, dirige `setProgress`. | scene.js, GSAP |

**Por que essa fronteira:** a cena não sabe nada de React nem de scroll; recebe
um número e interpola a câmera. Isso a mantém testável headless (script Node
chama `setProgress` e confere a câmera) — a mesma disciplina já usada no Al3D.

## Os 5 capítulos de câmera

O hero é **pinned** por 500vh (5 "telas"). O scroll não move elementos na tela
— só interpola a câmera entre os ângulos. Transição **fluida** (interpolação
contínua com easing) entre todos.

| # | Palavra | Ângulo | Sensação |
|---|---|---|---|
| 01 | **IDENTITY** | Frontal 3/4, Al à direita | Apresentação — letras inteiras |
| 02 | **CRAFT** | Contra-plongée (de baixo, olhando p/ cima) | As letras torreiam, drama |
| 03 | **DETAIL** | Macro no ápice do A / vão entre as letras | Revela o chanfro e o acabamento |
| 04 | **SYSTEMS** | Picado (de cima) | Vista gráfica, letras quase 2D |
| 05 | **IMPACT** | Plano geral, recuado | Recuo cinematográfico |

Progresso: `t = scrollAtual / (500vh)`. Capítulo `i` = `t ∈ [(i-1)/5, i/5]`.
A câmera tem 5 poses fixas (posição + alvo) e interpola linearmente com easing
entre poses vizinhas.

## Layout e comportamento

- **Hero**: nome **à esquerda** ("Alisson" grande; "Engenheiro de Software"
  abaixo, discreto), Al **à direita**, ligeiramente deslocado. Nome fica
  **fixo** durante os 5 capítulos e some (fade) no fim do hero.
- **Legenda do capítulo**: número `01–05` + palavra, em **âmbar**, discreta
  (canto), troca com fade ao entrar no capítulo. Único uso do acento.
- **Sem barra de progresso**, sem menu, sem redes sociais — minimalismo total.
- **Interação**: apenas o **empurrão no hover** (cursor "empurra" a letra que
  toca, ela pende e volta). Sem arrastar/orbitar, sem auto-girar, sem teclas.
- **Al**: exatamente o visual atual do Al3D (quase-preto `0x030303`, quinas
  chanfradas, `L_ESPESSURA: 0.7`, sem arredondamento, bump/clearcoat atuais).
  Nenhuma alteração de geometria.
- **Celular** (< 768px): Al no topo dominando, texto embaixo — **os mesmos 5
  ângulos** de câmera.
- **Reduced motion** (`prefers-reduced-motion: reduce`): o pin/scrub é
  desligado; os capítulos viram cortes estáticos legíveis, sem parallax. O
  conteúdo continua acessível na ordem de leitura do DOM.

## Paleta e tipografia

- Preto `#000000` (fundo) + branco `#FFFFFF` (texto).
- Acento âmbar **só na legenda do capítulo** — `#F59E0B`.
- Display: **Space Grotesk** 600/700. Corpo/legenda: **Archivo** 400/500.
- Contraste texto/fundo ≥ 4.5:1.

## Estados e erros

- **WebGL indisponível**: fallback estático — mostra o nome, o cargo e uma
  imagem/placeholder do Al; o scroll continua normal, sem 3D.
- **Resize**: canvas e câmera recalculam (`resize()`).
- **Desmontagem**: `dispose()` libera renderer, geometrias, materiais e o
  ScrollTrigger (evita vazamento no HMR do Vite).

## Testes / verificação (sem navegador)

1. **Geometria**: mesma bateria headless do Al3D — zero vértices não-finitos,
   contagem de malhas esperada, bbox sã, silhueta ASCII que lê "Al".
2. **Cena**: script Node importa `scene.js`, chama `setProgress` em
   `0, .2, .4, .6, .8, 1` e confere que a câmera atinge cada um dos 5 alvos e
   que os valores são finitos; `setProgress(0)` e `setProgress(1)` reproduzem
   as poses 01 e 05 exatamente.
3. **Sintaxe**: `node --check` no bundle após cada edição estrutural.
4. **Build**: `npm run build` conclui sem erro.

Verificação visual interativa fica com o usuário (sem navegador automatizado),
conforme combinado no projeto Al3D.

## Riscos e mitigação

- **ScrollTrigger + canvas fixado**: pin/scrub é sensível a layout; manter o
  canvas em `position: fixed` dentro de um wrapper de 500vh e chamar
  `ScrollTrigger.refresh()` no resize.
- **Performance mobile**: reduzir `pixelRatio` e resolução do shadow map no
  mobile; pausar o loop de render quando o hero sai da viewport.
- **Peso do Three.js**: importmap/ESM com tree-shaking; build do Vite já faz.

## Próximo passo

Aprovado este spec → invocar a skill **writing-plans** para o plano de
implementação (faseado, com critérios de aceite por fase). Nenhum código de
produto antes do plano aprovado.
