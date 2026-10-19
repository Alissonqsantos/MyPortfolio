import * as THREE from 'three';
import { CHAPTERS, poseAt } from './choreography.js';

// Painéis-satélite: "prints" de projeto à deriva no espaço, EM VOLTA do Al.
// Teaser discreto — o destaque vem depois, no strip horizontal. Por isso
// os painéis ficam LONGE: casca esférica de raio 7..11 ao redor do Al
// (~9–13% da altura da tela, nunca destaque).
//
// Layout aleatório por sessão (seed): os 4 painéis são sorteados em
// casca esférica, um por quadrante de azimute (ordem embaralhada) —
// cada sessão espalha os painéis por lados diferentes (frente, lados,
// acima, atrás). Regras do sorteio:
//   - margem de 1.0 da bbox das letras (rejeição, com folga p/ a deriva);
//   - a câmera jamais se aproxima (≥ 4.5 em 21 poses da órbita);
//   - nunca um dentro do outro quando projetados (círculos NDC não se
//     tocam em nenhum capítulo onde ambos estão no quadro);
//   - nenhum painel cobre as letras em nenhum capítulo (na frente +
//     sobre a silhueta = rejeitado; atrás = ok, o depth buffer esconde);
//   - pelo menos 2 painéis abrem visíveis na entrada (capítulo 01), em
//     quadrantes diferentes, sem cobrir as letras (teste contra os
//     retângulos por letra, não contra a bbox cheia);
//   - k=0,1 aparecem em ≥2 capítulos; k=2,3 (livres) em ≥1 — pontos da
//     frente (+z) só cabem no cone de 1 câmera, e é assim que os painéis
//     ganham chance de cair em TODOS os lados (frente, lados, acima),
//     não apenas atrás;
//   - teto de tamanho aparente (≤ 15% na entrada, ≤ 17% em qualquer
//     capítulo): teaser, não destaque.
//
// Ajustes via `.env` (ver `.env.example`): VITE_SATS_VISIVEL, TAM, RAIO,
// ESPESSURA, TOMBO, DERIVA, BRILHO, SEED. Sem `.env`, valem os padrões.
// Matemática pura (sortearLayout/posicaoPainel/rotacaoPainel/configSats) —
// testável em Node. Prints reais: substituir texturaImagem por
// TextureLoader.load(url).
// ============================================================================
//  PADRÕES — o `.env` sobrescreve; o código nunca muda.
// ============================================================================
export const SATS = {
  VISIVEL: true,          // mostra os painéis (false = some da cena)
  SEED: null,             // layout fixo p/ debug (null = seed da sessão)
  TAM: 1,                 // × tamanho dos painéis
  RAIO: 0.09,             // arredondamento dos cantos (unidades)
  ESPESSURA: 0.035,       // espessura da laje (unidades)
  TOMBO: 1,               // × velocidade do tombo (0 = parados)
  DERIVA: 1,              // × amplitude da deriva (0 = fixos nas bases)
  BRILHO: 0.22,           // auto-iluminação da imagem (0 = apagada; menor = mais discreto)
  DERIVA_MUNDO: 0.35,     // flutuação da deriva em mundo (× DERIVA)
  CASCA_MIN: 7,           // casca esférica ao redor do Al: raio mínimo
  CASCA_MAX: 11,          // casca esférica ao redor do Al: raio máximo
  ACHATA_Y: 0.8,          // achatamento vertical da casca (evita pólos extremos)
  MARGEM_LETRAS: 1.0,     // folga mínima da bbox das letras (mesma da câmera)
  CAM_MIN: 4.5,           // distância mínima da câmera em qualquer pose
  ALT_MAX_ENTRADA: 0.15,  // teto da altura aparente na entrada (fração da tela)
  TETO_CAP: 0.17,         // teto da altura aparente em qualquer capítulo
  MIN_CH: 2,              // cada painel aparece em pelo menos N capítulos
  NX_MIN: 0.34, NX_MAX: 0.72, // faixa externa horizontal na entrada
  NY_MIN: 0.30, NY_MAX: 0.60, // faixa externa vertical na entrada
  VLIM: 0.72,             // limite NDC p/ "visível" (com folga da deriva)
  TENTATIVAS: 1500,       // tentativas por painel p/ achar vaga
  ROUNDS: 60,             // rodadas p/ achar layout com ≥2 visíveis na entrada
  // Cada painel: tam [largura, altura], vel de tombo (rad/s por eixo) e
  // duotone do placeholder.
  PAINEIS: [
    { tam: [1.70, 0.95], vel: [ 0.006, 0.009, 0.004], tons: ['#241046', '#5b3ba8'] },
    { tam: [1.40, 0.80], vel: [ 0.008, 0.005, 0.006], tons: ['#16102b', '#6d5bb5'] },
    { tam: [1.90, 1.05], vel: [ 0.004, 0.007, 0.009], tons: ['#0f0a24', '#8f7bd8'] },
    { tam: [1.20, 0.70], vel: [ 0.007, 0.004, 0.008], tons: ['#1e1240', '#7c68c4'] },
  ],
};

function lerNum(env, chave, padrao) {
  const cru = env ? env[chave] : undefined;
  if (cru === undefined || cru === null || cru === '') return padrao;
  const n = Number(cru);
  return Number.isFinite(n) ? n : padrao;
}

// Config resolvida: padrões + `.env`. Aceita objeto p/ testes.
// `usarEnv=false` ignora o import.meta.env (p/ testes determinísticos,
// já que o Vitest carrega o `.env` local).
// (import.meta.env não existe fora do Vite — o fallback {} mantém Node puro.)
export function configSats(sobre = null, usarEnv = true) {
  let base = {};
  if (usarEnv) {
    try {
      base = (typeof import.meta !== 'undefined' && import.meta.env) || {};
    } catch { base = {}; }
  }
  const env = { ...base, ...(sobre || {}) };
  const seedCrua = env.VITE_SATS_SEED ?? SATS.SEED;
  const seedNum = seedCrua === null || seedCrua === undefined || seedCrua === '' ? null : Number(seedCrua);
  return {
    visivel: String(env.VITE_SATS_VISIVEL ?? SATS.VISIVEL).toLowerCase() !== 'false' && lerNum(env, 'VITE_SATS_VISIVEL', 1) !== 0,
    seed: Number.isFinite(seedNum) ? seedNum : null,
    tam: lerNum(env, 'VITE_SATS_TAM', SATS.TAM),
    raio: lerNum(env, 'VITE_SATS_RAIO', SATS.RAIO),
    espessura: lerNum(env, 'VITE_SATS_ESPESSURA', SATS.ESPESSURA),
    tombo: lerNum(env, 'VITE_SATS_TOMBO', SATS.TOMBO),
    deriva: lerNum(env, 'VITE_SATS_DERIVA', SATS.DERIVA),
    brilho: lerNum(env, 'VITE_SATS_BRILHO', SATS.BRILHO),
  };
}

// PRNG determinístico (mulberry32): mesma seed = mesmo layout.
export function rng(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ponto do mundo → coordenadas na entrada: profundidade z + NDC.
// Pura — testável em Node.
export function projetarEntrada(b, P) {
  const rel = new THREE.Vector3(P[0], P[1], P[2]).sub(b.C);
  const z = rel.dot(b.Fw);
  return { z, nx: rel.dot(b.R) * b.F / (z * b.aspect), ny: rel.dot(b.U) * b.F / z };
}

// Raio NDC (bounding circle) do painel k à distância dist da câmera:
// metade da diagonal em mundo × F/dist. Conservador.
export function raioNDC(k, dist, b, tamMult = 1) {
  const p = SATS.PAINEIS[k % SATS.PAINEIS.length];
  const diag = Math.hypot(p.tam[0] * tamMult, p.tam[1] * tamMult);
  return (0.5 * diag * b.F) / Math.max(dist, 0.5);
}

// Altura aparente do painel k à distância dist (fração da altura da tela).
export function alturaAparente(k, dist, b, tamMult = 1) {
  const p = SATS.PAINEIS[k % SATS.PAINEIS.length];
  return (p.tam[1] * tamMult * b.F) / (2 * Math.max(dist, 0.5));
}

// Retângulos NDC de cada letra na câmera de entrada — o teste "cobre o
// Al?" usa as letras separadas (a bbox cheia é 69% da tela, a silhueta
// real ocupa ~31%: o vão entre as letras fica livre p/ os painéis).
export function retangulosLetras(modelo, entryCam) {
  const alvos = [];
  if (modelo && typeof modelo.getObjectByName === 'function') {
    const a = modelo.getObjectByName('letraA');
    const l = modelo.getObjectByName('letraL');
    if (a) alvos.push(a);
    if (l) alvos.push(l);
  }
  if (!alvos.length && modelo) alvos.push(modelo);
  return alvos.map((o) => {
    const box = new THREE.Box3().setFromObject(o);
    const r = { mnx: 99, mxx: -99, mny: 99, mxy: -99 };
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      ).project(entryCam);
      if (v.x < r.mnx) r.mnx = v.x;
      if (v.x > r.mxx) r.mxx = v.x;
      if (v.y < r.mny) r.mny = v.y;
      if (v.y > r.mxy) r.mxy = v.y;
    }
    return r;
  });
}

// Círculo NDC toca algum retângulo das letras?
export function tocaLetra(nx, ny, r, rects) {
  for (const q of rects) {
    if (!(nx + r < q.mnx || nx - r > q.mxx || ny + r < q.mny || ny - r > q.mxy)) return true;
  }
  return false;
}

// Contexto do sorteio: base da entrada + câmera real da entrada +
// câmeras dos 5 capítulos + poses densas p/ distância mínima + retângulos
// das letras. `distCaixa([x,y,z])` mede a distância à bbox do modelo.
export function montarContexto(camera, distCaixa, modelo = null) {
  const b = baseEntrada(camera);
  const entryCam = new THREE.PerspectiveCamera(35, b.aspect, 0.1, 100);
  entryCam.position.copy(b.C);
  entryCam.lookAt(b.T);
  entryCam.updateMatrixWorld();
  const chapterCams = CHAPTERS.map((ch) => {
    const c = new THREE.PerspectiveCamera(35, b.aspect, 0.1, 100);
    c.position.set(...ch.pose.pos);
    c.lookAt(new THREE.Vector3(...ch.pose.target));
    c.updateMatrixWorld();
    return c;
  });
  const camPos = [];
  for (let s = 0; s <= 20; s++) {
    const p = poseAt(s / 20);
    camPos.push(new THREE.Vector3(...p.pos));
  }
  const rects = modelo ? retangulosLetras(modelo, entryCam) : [];
  const chapterTargets = CHAPTERS.map((ch) => new THREE.Vector3(...ch.pose.target));
  const chapterRects = modelo ? chapterCams.map((c) => retangulosLetras(modelo, c)) : [];
  return { b, entryCam, chapterCams, chapterTargets, chapterRects, camPos, distCaixa, rects };
}

function distCamMin(ctx, P) {
  const v = new THREE.Vector3(P[0], P[1], P[2]);
  let m = Infinity;
  for (const q of ctx.camPos) {
    const d = q.distanceTo(v);
    if (d < m) m = d;
  }
  return m;
}

// Na frente da câmera? (project() sozinho espelha pontos atrás —
// precisa deste teste antes de qualquer NDC por capítulo.)
function naFrente(cam, v) {
  const dir = new THREE.Vector3();
  cam.getWorldDirection(dir);
  return v.clone().sub(cam.position).dot(dir) > 0.5;
}

// Em quantos capítulos o ponto aparece (|NDC| ≤ 0.9)?
function contarCapitulos(ctx, P) {
  const v = new THREE.Vector3(P[0], P[1], P[2]);
  let n = 0;
  for (const c of ctx.chapterCams) {
    if (!naFrente(c, v)) continue;
    const p = v.clone().project(c);
    if (p.z < 1 && Math.abs(p.x) <= 0.9 && Math.abs(p.y) <= 0.9) n++;
  }
  return n;
}

// Maior altura aparente do painel k no ponto P entre os capítulos onde
// ele está no quadro.
function alturaMaxCapitulos(ctx, k, P, tamMult) {
  const v = new THREE.Vector3(P[0], P[1], P[2]);
  let m = 0;
  for (const c of ctx.chapterCams) {
    if (!naFrente(c, v)) continue;
    const p = v.clone().project(c);
    if (p.z < 1 && Math.abs(p.x) < 1 && Math.abs(p.y) < 1) {
      const h = alturaAparente(k, c.position.distanceTo(v), ctx.b, tamMult);
      if (h > m) m = h;
    }
  }
  return m;
}

// O painel k em P cobre as letras em algum capítulo? Só conta quando
// está NA FRENTE do alvo (entre câmera e letras) + sobre a silhueta.
// Atrás, o depth buffer esconde — ok.
export function cobreEmCapitulo(ctx, k, P, tamMult = 1) {
  if (!ctx.chapterRects.length) return false;
  const v = new THREE.Vector3(P[0], P[1], P[2]);
  for (let i = 0; i < ctx.chapterCams.length; i++) {
    const c = ctx.chapterCams[i];
    if (!naFrente(c, v)) continue;
    const p = v.clone().project(c);
    if (p.z >= 1 || Math.abs(p.x) >= 1 || Math.abs(p.y) >= 1) continue;
    const dPainel = c.position.distanceTo(v);
    const dAlvo = c.position.distanceTo(ctx.chapterTargets[i]);
    if (dPainel > dAlvo - 0.5) continue; // atrás ou junto — depth buffer resolve
    const r = raioNDC(k, dPainel, ctx.b, tamMult);
    if (tocaLetra(p.x, p.y, r + 0.03, ctx.chapterRects[i])) return true;
  }
  return false;
}

// Ponto na casca esférica (raio CASCA_MIN..MAX) ao longo do raio que sai
// da câmera de entrada e cruza o pixel (nx, ny): resolve a interseção
// raio×esfera e sorteia a profundidade no lado DISTANTE (atrás do Al —
// o lado perto fica a ~1 unidade da câmera e viola CAM_MIN/teto).
// `u` ∈ [0,1) escolhe a profundidade. Pura — testável em Node.
// Retorna null se o raio não cruza a casca (não acontece na faixa usada).
export function pontoCasca(b, nx, ny, u) {
  const ux = b.Fw.x + b.R.x * ((nx * b.aspect) / b.F) + b.U.x * (ny / b.F);
  const uy = b.Fw.y + b.R.y * ((nx * b.aspect) / b.F) + b.U.y * (ny / b.F);
  const uz = b.Fw.z + b.R.z * ((nx * b.aspect) / b.F) + b.U.z * (ny / b.F);
  const A = ux * ux + uy * uy + uz * uz;
  const B = b.C.x * ux + b.C.y * uy + b.C.z * uz;
  const C0 = b.C.x * b.C.x + b.C.y * b.C.y + b.C.z * b.C.z;
  const cruz = (r) => {
    const disc = B * B - A * (C0 - r * r);
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    return [(-B - sq) / A, (-B + sq) / A];
  };
  const iMin = cruz(SATS.CASCA_MIN), iMax = cruz(SATS.CASCA_MAX);
  if (!iMin || !iMax) return null;
  const lo = Math.max(iMin[1], 0.6), hi = iMax[1];
  if (!(hi > lo)) return null;
  const t = lo + u * (hi - lo);
  return [b.C.x + ux * t, b.C.y + uy * t, b.C.z + uz * t];
}

// Os dois círculos NDC se tocam em algum capítulo onde ambos estão no
// quadro? (na frente da câmera + |NDC| < 1). Inclui a folga da deriva:
// os painéis flutuam ±A em mundo, então os raios ganham A·F·(1/d1+1/d2).
// Pura.
function colideProjetado(ctx, k, P, a, j, cfgR) {
  const v = new THREE.Vector3(P[0], P[1], P[2]);
  const w = new THREE.Vector3(a.P[0], a.P[1], a.P[2]);
  const A = SATS.DERIVA_MUNDO * cfgR.deriva;
  for (const c of ctx.chapterCams) {
    if (!naFrente(c, v) || !naFrente(c, w)) continue;
    const p = v.clone().project(c);
    const q = w.clone().project(c);
    if (p.z >= 1 || q.z >= 1) continue;
    if (Math.abs(p.x) >= 1 || Math.abs(q.x) >= 1) continue;
    if (Math.abs(p.y) >= 1 || Math.abs(q.y) >= 1) continue;
    const d1 = c.position.distanceTo(v), d2 = c.position.distanceTo(w);
    const rp = raioNDC(k, d1, ctx.b, cfgR.tam);
    const rq = raioNDC(j, d2, ctx.b, cfgR.tam);
    const folga = (A * ctx.b.F * (1 / d1 + 1 / d2));
    if (Math.hypot(p.x - q.x, p.y - q.y) <= rp + rq + folga) return true;
  }
  return false;
}

// Sorteia os 4 painéis na casca esférica ao redor do Al, em dois grupos:
//   - k=0,1 nascem DENTRO da faixa visível da entrada (2 quadrantes do
//     quadro, ordem embaralhada por rodada) e afundam para o lado
//     distante — garantem ≥2 visíveis na abertura, em lados diferentes;
//   - k=2,3 livres na esfera, cada um restrito a um quadrante de azimute;
//     k=3 sempre na metade da frente (quadrantes 0–1, z>0 por construção)
//     — toda sessão tem ≥1 painel fora do fundão de trás; k=2 varia nos
//     3 quadrantes restantes. A órbita da câmera (5 capítulos) mostra
//     painéis de todos os lados ao longo do scroll.
// Determinístico. Sem ctx (chamada simples p/ testes de determinismo),
// monta um contexto padrão sem bbox nem letras.
export function pontoEsfera(rnd) {
  const az = rnd() * Math.PI * 2;
  const y = rnd() * 2 - 1;
  const rr = SATS.CASCA_MIN + rnd() * (SATS.CASCA_MAX - SATS.CASCA_MIN);
  const s = Math.sqrt(Math.max(0, 1 - y * y));
  return [rr * s * Math.cos(az), rr * SATS.ACHATA_Y * y, rr * s * Math.sin(az)];
}

// Ponto na casca restrito ao quadrante de azimute q (0..3): az ∈
// [q·90°, (q+1)·90°). Pura.
export function pontoEsferaQuad(rnd, q) {
  const az = (q + rnd()) * Math.PI / 2;
  const y = rnd() * 2 - 1;
  const rr = SATS.CASCA_MIN + rnd() * (SATS.CASCA_MAX - SATS.CASCA_MIN);
  const s = Math.sqrt(Math.max(0, 1 - y * y));
  return [rr * s * Math.cos(az), rr * SATS.ACHATA_Y * y, rr * s * Math.sin(az)];
}

export function sortearLayout(seed, ctx = null, cfg = null) {
  const cfgR = cfg || configSats({}, false);
  let ctxR = ctx;
  if (!ctxR || !ctxR.b || !ctxR.camPos) {
    ctxR = montarContexto(null, (ctxR && ctxR.distCaixa) || null, null);
  }
  const rnd = rng(seed);
  const FOLGA = SATS.MARGEM_LETRAS + 0.45;
  let melhor = null, melhorNota = -1;

  for (let round = 0; round < SATS.ROUNDS; round++) {
    const quads = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    for (let i = quads.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [quads[i], quads[j]] = [quads[j], quads[i]];
    }
    // k=3 sempre nos quadrantes de azimute da frente (q=0: x>0,z>0;
    // q=1: x<0,z>0 — z>0 por construção); k=2 varia nos 3 restantes.
    const q3 = Math.floor(rnd() * 2);
    const resto = [0, 1, 2, 3].filter((q) => q !== q3);
    const q2 = resto[Math.floor(rnd() * resto.length)];
    const binDe = { 2: q2, 3: q3 };
    const ace = [];
    let ok = true;
    // k=2,3 (livres, raros — ex. frente tem ~4% de aceitação) colocam
    // PRIMEIRO; k=0,1 (abertura, ~59%) desviam depois. Colocar os raros
    // por último enviesava o retry contra eles (colisão → rodada
    // descartada → layouts só com o comum).
    for (const k of [2, 3, 0, 1]) {
      let pick = null;
      for (let t = 0; t < SATS.TENTATIVAS; t++) {
        // k=0,1: nascem na faixa visível da entrada (2 quadrantes
        // embaralhados) e afundam p/ o lado distante. k=2,3: livres na
        // esfera, cada um num quadrante de azimute sorteado — lados
        // diferentes a cada sessão.
        let P;
        if (k < 2) {
          const sx = quads[k][0], sy = quads[k][1];
          const nx = sx * (SATS.NX_MIN + rnd() * (SATS.NX_MAX - SATS.NX_MIN));
          const ny = sy * (SATS.NY_MIN + rnd() * (SATS.NY_MAX - SATS.NY_MIN));
          P = pontoCasca(ctxR.b, nx, ny, rnd());
          if (!P) continue;
        } else {
          P = pontoEsferaQuad(rnd, binDe[k]);
        }
        if (ctxR.distCaixa && ctxR.distCaixa(P) < FOLGA) continue;
        if (distCamMin(ctxR, P) < SATS.CAM_MIN) continue;
        let colide = false;
        for (const a of ace) {
          if (colideProjetado(ctxR, k, P, a, a.k, cfgR)) { colide = true; break; }
        }
        if (colide) continue;
        const e = projetarEntrada(ctxR.b, P);
        const r = raioNDC(k, Math.max(e.z, 1), ctxR.b, cfgR.tam);
        const inBand = e.z > 0.5
          && Math.abs(e.nx) >= SATS.NX_MIN && Math.abs(e.nx) <= SATS.NX_MAX
          && Math.abs(e.ny) >= SATS.NY_MIN && Math.abs(e.ny) <= SATS.NY_MAX;
        if (inBand && alturaAparente(k, e.z, ctxR.b, cfgR.tam) > SATS.ALT_MAX_ENTRADA) continue;
        if (cobreEmCapitulo(ctxR, k, P, cfgR.tam)) continue;
        if (alturaMaxCapitulos(ctxR, k, P, cfgR.tam) > SATS.TETO_CAP) continue;
        const nch = contarCapitulos(ctxR, P);
        // k=0,1 (abertura): ≥2 capítulos. k=2,3 (livres): ≥1 — pontos da
        // frente (+z) só cabem no cone de 1 câmera.
        if (nch < (k < 2 ? SATS.MIN_CH : 1)) continue;
        pick = {
          k, P, z: e.z, nx: e.nx, ny: e.ny, inBand, nch,
          wx: (Math.PI * 2) / (20 + rnd() * 20),
          wy: (Math.PI * 2) / (20 + rnd() * 20),
          wz: (Math.PI * 2) / (20 + rnd() * 20),
          px: rnd() * Math.PI * 2,
          py: rnd() * Math.PI * 2,
          pz: rnd() * Math.PI * 2,
          rot: [rnd() * Math.PI * 2, rnd() * Math.PI * 2, rnd() * Math.PI * 2],
        };
        break;
      }
      if (!pick) { ok = false; break; }
      ace.push(pick);
    }
    if (!ok) continue;
    ace.sort((a, b) => a.k - b.k);
    const vis = ace.filter((a) => a.inBand);
    const quadSet = new Set(vis.map((a) => `${Math.sign(a.nx)},${Math.sign(a.ny)}`));
    const nota = vis.length * 10 + quadSet.size;
    if (vis.length >= 2 && quadSet.size >= 2) return ace;
    if (nota > melhorNota) { melhorNota = nota; melhor = ace; }
  }
  if (melhor) return melhor;
  // Fallback determinístico: 4 atrás, na faixa externa (nunca null).
  return SATS.PAINEIS.map((p, k) => {
    const sx = k % 2 === 0 ? -1 : 1, sy = k < 2 ? -1 : 1;
    const c = SATS.CASCA_MIN + 1 + k * 0.5;
    const w = ndcParaMundo(ctxR.b, sx * 0.55, sy * 0.45, c);
    const P = [w.x, w.y, w.z];
    return {
      k, P, z: c + ctxR.b.D,
      nx: sx * 0.55, ny: sy * 0.45, inBand: true, nch: SATS.MIN_CH,
      wx: 0.25, wy: 0.2, wz: 0.22, px: k, py: k * 2, pz: k * 3,
      rot: [k, k * 2, k * 3],
    };
  });
}

// Base da câmera de entrada (capítulo 01): posição, alvo, direita, cima,
// distância ao alvo e fator de projeção. Pura — testável em Node
// (camera só p/ o aspect).
export function baseEntrada(camera) {
  const pose = poseAt(0);
  const C = new THREE.Vector3(...pose.pos);
  const T = new THREE.Vector3(...pose.target);
  const Fw = T.clone().sub(C);
  const D = Fw.length();
  Fw.normalize();
  const R = new THREE.Vector3().crossVectors(Fw, new THREE.Vector3(0, 1, 0)).normalize();
  const U = new THREE.Vector3().crossVectors(R, Fw);
  const fov = 35;
  return { C, T, Fw, R, U, D, fov, F: 1 / Math.tan((fov * Math.PI) / 360), aspect: camera ? camera.aspect : 1.6 };
}

// NDC (nx, ny) + fundo c → ponto no mundo. Pura — testável em Node.
export function ndcParaMundo(b, nx, ny, c) {
  const z = b.D + c;
  return b.C.clone()
    .addScaledVector(b.Fw, z)
    .addScaledVector(b.R, ((nx * z * b.aspect) / b.F))
    .addScaledVector(b.U, ((ny * z) / b.F));
}

// Posição do painel no instante t (s): base na casca + deriva em mundo
// ao longo dos eixos da entrada. Pura.
export function posicaoPainel(b, def, t, cfg = null) {
  const cfgR = cfg || configSats({}, false);
  const a = SATS.DERIVA_MUNDO * cfgR.deriva;
  const ox = a * Math.sin(def.wx * t + def.px);
  const oy = a * Math.sin(def.wy * t + def.py);
  const oz = a * 0.5 * Math.sin((def.wz ?? def.wy) * t + (def.pz ?? def.py));
  const p = new THREE.Vector3(def.P[0], def.P[1], def.P[2])
    .addScaledVector(b.R, ox)
    .addScaledVector(b.U, oy)
    .addScaledVector(b.Fw, oz);
  return [p.x, p.y, p.z];
}

// Orientação do painel i no instante t (rad): sorteada + tombo bem lento.
export function rotacaoPainel(def, i, t, cfg = null) {
  const cfgR = cfg || configSats({}, false);
  const vel = SATS.PAINEIS[i % SATS.PAINEIS.length].vel;
  const k = cfgR.tombo;
  return [def.rot[0] + vel[0] * k * t, def.rot[1] + vel[1] * k * t, def.rot[2] + vel[2] * k * t];
}

// Retângulo de cantos arredondados centrado na origem. Puro — roda em Node.
export function formaArredondada(w, h, r) {
  const rr = Math.min(Math.max(r, 0), w / 2, h / 2);
  const x = -w / 2, y = -h / 2;
  const s = new THREE.Shape();
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - rr);
  s.absarc(x + w - rr, y + h - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + h);
  s.absarc(x + rr, y + h - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

// Laje extrudada do retângulo arredondado, centrada em z.
// Grupo 0 = faces (frente+verso); grupo 1 = laterais.
export function geometriaLaje(w, h, r, esp) {
  const geo = new THREE.ExtrudeGeometry(formaArredondada(w, h, r), {
    depth: esp, bevelEnabled: false, curveSegments: 6,
  });
  geo.translate(0, 0, -esp / 2);
  return geo;
}

// Placeholder duotone + esqueleto de interface (SÓ imagem, sem texto).
// Tons apagados: teaser de fundo, não destaque.
export function texturaImagem(p, w, h) {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 360;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 640, 360);
  grad.addColorStop(0, p.tons[0]);
  grad.addColorStop(1, p.tons[1]);
  g.fillStyle = grad;
  g.fillRect(0, 0, 640, 360);
  const orbe = g.createRadialGradient(510, 90, 8, 510, 90, 280);
  orbe.addColorStop(0, 'rgba(255,255,255,0.20)');
  orbe.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = orbe;
  g.fillRect(0, 0, 640, 360);
  g.fillStyle = 'rgba(255,255,255,0.07)';
  g.fillRect(0, 0, 640, 46);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(48, 110, 320, 28);
  g.fillStyle = 'rgba(255,255,255,0.06)';
  g.fillRect(48, 162, 470, 12);
  g.fillRect(48, 188, 400, 12);
  g.fillRect(48, 236, 172, 96);
  g.fillRect(236, 236, 172, 96);
  g.fillRect(424, 236, 168, 96);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.repeat.set(1 / w, 1 / h);
  tex.offset.set(0.5, 0.5);
  return tex;
}

const temDOM = () => typeof document !== 'undefined';

export function buildSatelites(seed, camera, cfg = null, distCaixa = null, modelo = null) {
  const cfgR = cfg || configSats();
  const semente = cfgR.seed ?? seed;
  const ctx = montarContexto(camera, distCaixa, modelo);
  const layout = sortearLayout(semente, ctx, cfgR);
  const grupo = new THREE.Group();
  grupo.name = 'satelites';
  grupo.visible = cfgR.visivel;
  const refs = [];
  SATS.PAINEIS.forEach((p, i) => {
    const w = p.tam[0] * cfgR.tam, h = p.tam[1] * cfgR.tam;
    const geo = geometriaLaje(w, h, Math.min(cfgR.raio, w / 2, h / 2), cfgR.espessura);
    const tex = temDOM() ? texturaImagem(p, w, h) : null;
    const imgMat = new THREE.MeshStandardMaterial({
      map: tex, color: tex ? 0xffffff : new THREE.Color(p.tons[1]),
      emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: tex ? cfgR.brilho : 0,
      roughness: 0.6, metalness: 0.15,
    });
    const bordaMat = new THREE.MeshStandardMaterial({ color: 0x0b0b14, roughness: 0.85, metalness: 0.25 });
    const mesh = new THREE.Mesh(geo, [imgMat, bordaMat]);
    mesh.name = `painel-${i}`;
    mesh.position.set(...posicaoPainel(ctx.b, layout[i], 0, cfgR));
    mesh.rotation.set(...rotacaoPainel(layout[i], i, 0, cfgR));
    grupo.add(mesh);
    refs.push({ mesh, def: layout[i] });
  });
  grupo.userData.sats = refs;
  grupo.userData.cfg = cfgR;
  grupo.userData.base = ctx.b;
  return grupo;
}

// Uma chamada por frame. t null/undefined = congela (reduced-motion).
export function atualizarSatelites(grupo, t) {
  if (t === null || t === undefined) return;
  const cfg = (grupo && grupo.userData && grupo.userData.cfg) || configSats({}, false);
  const b = grupo && grupo.userData && grupo.userData.base;
  const sats = (grupo && grupo.userData && grupo.userData.sats) || [];
  if (!b) return;
  for (let i = 0; i < sats.length; i++) {
    sats[i].mesh.position.set(...posicaoPainel(b, sats[i].def, t, cfg));
    sats[i].mesh.rotation.set(...rotacaoPainel(sats[i].def, i, t, cfg));
  }
}
