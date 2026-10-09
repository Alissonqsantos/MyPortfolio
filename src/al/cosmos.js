import * as THREE from 'three';
import { posicaoOrbita } from './buracoNegro.js';

// Fundo cósmico do hero — céu limpo: só estrelas + cadentes ocasionais.
// Sem sprites visíveis (sem névoas, sem halo): nenhuma mancha no céu.
// A luz roxa que banha o Al nasce do buraco negro (luz invisível, sem corpo).
// Estrelas realistas: população espectral real, tamanho e cor por classe
// (M anãs pequenas e alaranjadas … B azuis raras, grandes e brilhantes).
// Tudo paramétrico e desligado sob prefers-reduced-motion.
// Módulo puro — sem renderer/DOM. Testável em Node.
export const COSMOS = {
  FUNDO: 0x0c0b0c,
  ESTRELAS: 900,
  RAIO_MIN: 40,
  RAIO_MAX: 60,
  SEED: 20261009, // seed padrão; a cena usa a seed sorteada da sessão do navegador
  DERIVA: 0.0025, // rad/s — volta completa em ~42min (quase parada)

  // -------- ESTRELAS: REALISMO (população, tamanho e cor) --------
  // Proporções REAIS do céu por classe espectral (M domina; B é raríssima).
  POPULACAO: { M: 0.76, K: 0.12, G: 0.076, F: 0.03, A: 0.009, B: 0.005 },
  // TAM: faixa de tamanho do ponto por classe (total 0.08–0.45).
  // BRILHO: multiplicador de brilho (1 = cor pura da classe).
  CLASSES: {
    M: { TAM: [0.08, 0.12], BRILHO: 0.7 },
    K: { TAM: [0.13, 0.18], BRILHO: 0.85 },
    G: { TAM: [0.19, 0.25], BRILHO: 1.0 },
    F: { TAM: [0.26, 0.31], BRILHO: 1.15 },
    A: { TAM: [0.32, 0.39], BRILHO: 1.3 },
    B: { TAM: [0.40, 0.45], BRILHO: 1.5 },
  },
  // Cor real aproximada (preto-corpo) por classe, ANTES da dessaturação.
  CORES: {
    M: 0xffb56b, // ~3000K — laranja-avermelhada
    K: 0xffd2a1, // ~4400K — laranja
    G: 0xfff4ea, // ~5800K — branca-amarelada (como o Sol)
    F: 0xf8f7ff, // ~6800K — branca
    A: 0xaabfff, // ~8600K — branca-azulada
    B: 0x9bb0ff, // ~15000K — azul
  },
  DESSAT: 0.22, // puxa todas as cores 22% para o branco (0 = puras, 1 = branco)
  ESCALA_PONTOS: 1.0, // multiplicador global do tamanho dos pontos (ajuste fino)

  // -------- NEBULOSAS (névoa colorida, bem sutil) --------
  // Esfera de céu gigante com ruído fbm: névoa CONTÍNUA (sem bordas de
  // sprite — não vira "mancha"). Gás concentrado na periferia, com um vazio
  // limpo atrás do Al. Deriva própria, mais lenta que as estrelas. Mesma
  // seed da sessão: muda junto com as estrelas ao reabrir o navegador.
  NEBULOSA: {
    ATIVO: true,
    RAIO: 85,          // raio da esfera de céu (maior que as estrelas 40-60; dentro do FAR 100)
    LOBOS: 4,          // número de nuvens grandes e macias (3-4 lê como "nebulosas")
    LOBOS_TAM: [0.75, 1.35], // raio angular de cada lóbulo, em rad (~43°-77°)
    OPACIDADE: 0.15,   // opacidade máxima — bem sutil (um sussurro de cor)
    COR1: 0x7a2bd6,    // violeta (identidade do site)
    COR2: 0xd23b8f,    // magenta
    ESCALA_RUIDO: 2.2, // escala do fbm (maior = nuvem mais recortada)
    VOID_DIR: [0, 0.1, -1], // direção do vazio (para onde a câmera da frente olha: atrás do Al)
    VOID_RAIO: 0.95,   // raio angular do vazio, em rad (~54°): limpo no centro, gás nas bordas
    VEL: 0.001,        // rad/s — deriva própria, MAIS LENTA que as estrelas (0.0025)
  },

  // Distribuídas ao redor da cena para cobrir as 5 poses da coreografia
  // (inclusive a 04, que olha de trás para frente).
  CADENTE: {
    ESPERA_MIN: 5, ESPERA_MAX: 11,    // uma a cada 5–13s
    DUR_MIN: 0.5, DUR_MAX: 0.9,      // rastro bem rápido
    COMP_MIN: 6, COMP_MAX: 10,       // rastro curto e discreto
    OPAC_MAX: 0.5,                   // tênue, não chama atenção
    RAIO_MIN: 42, RAIO_MAX: 50,      // longe das letras e da câmera
  },
  // Luz roxa do cosmos: ENTIDADE ÚNICA — toda a luz roxa que banha o Al vem
  // daqui. A posição é a do buraco negro (posicaoOrbita): a luz nasce dele e
  // se move com ele. Luz invisível (sem corpo visível no céu): só ilumina.
  SOL: {
    COR: 0x7322f2, INT: 1.3,
  },
};

// RNG com seed — determinismo nos testes (e mesma distribuição a cada load).
export function semente(n) {
  let a = n >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Dessaturação: puxa a cor k em direção ao branco (0 = pura, 1 = branca).
// Pura (hex → hex) — testável em Node.
export function dessaturar(hex, k = COSMOS.DESSAT) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  const mix = (c) => Math.round(c + (255 - c) * k);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

// Classe espectral sorteada com as proporções reais (M 76% … B 0.5%).
export function sortearClasse(rand = Math.random) {
  const r = rand();
  let acc = 0;
  for (const classe of Object.keys(COSMOS.POPULACAO)) {
    acc += COSMOS.POPULACAO[classe];
    if (r < acc) return classe;
  }
  return 'M'; // sobras de arredondamento caem na classe dominante
}

const ESTRELAS_VERT = /* glsl */`
attribute float aTamanho;
attribute vec3 aCor;
uniform float uEscala;
varying vec3 vCor;
void main(){
  vCor = aCor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aTamanho * uEscala / max(-mv.z, 0.001);
  gl_Position = projectionMatrix * mv;
}`;

// Ponto redondo com queda macia (estrela de foto, não quadradinho).
const ESTRELAS_FRAG = /* glsl */`
precision highp float;
varying vec3 vCor;
void main(){
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.05, 0.5, d);
  a = pow(a, 1.6);
  if (a < 0.004) discard;
  gl_FragColor = vec4(vCor, a);
}`;

// -------- NEBULOSAS: esfera de céu com ruído fbm (névoa contínua) --------
// Máximo de lóbulos (limite de arrays de uniform no GLSL). O CONFIG pede
// LOBOS; o builder usa min(LOBOS, MAX).
const NEBULOSA_MAX = 6;

const NEBULOSA_VERT = /* glsl */`
varying vec3 vDir;
void main(){
  vDir = position; // esfera centrada na origem: posição local = direção
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const NEBULOSA_FRAG = /* glsl */`
precision highp float;
varying vec3 vDir;
uniform float uAngulo;   // deriva (gira o ruído e os lóbulos)
uniform vec3 uCor1, uCor2;
uniform float uOpac, uEscala, uVoidRaio;
uniform vec3 uVoidDir;
uniform int uLobos;
uniform vec3 uLoboDir[${NEBULOSA_MAX}];
uniform float uLoboTam[${NEBULOSA_MAX}];
float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float vnoise(vec3 p){
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=hash(i), b=hash(i+vec3(1,0,0)), c=hash(i+vec3(0,1,0)), d=hash(i+vec3(1,1,0));
  float e=hash(i+vec3(0,0,1)), g=hash(i+vec3(1,0,1)), h=hash(i+vec3(0,1,1)), k=hash(i+vec3(1,1,1));
  return mix(mix(mix(a,b,f.x), mix(c,d,f.x), f.y), mix(mix(e,g,f.x), mix(h,k,f.x), f.y), f.z);
}
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=.5;} return s; }
void main(){
  vec3 d = normalize(vDir);
  // Deriva: gira SÓ o ruído e os lóbulos (o vazio fica fixo atrás do Al).
  float ca = cos(uAngulo), sa = sin(uAngulo);
  vec3 dr = vec3(d.x*ca - d.z*sa, d.y, d.x*sa + d.z*ca);
  float n = fbm(dr * uEscala);
  // Lóbulos: soma de gaussianas angulares (nuvens grandes e macias).
  float lobos = 0.0;
  for (int i = 0; i < ${NEBULOSA_MAX}; i++) {
    if (i >= uLobos) break;
    float ang = acos(clamp(dot(dr, uLoboDir[i]), -1.0, 1.0));
    // 1 no centro do lóbulo, 0 fora dele (smoothstep crescente: edge0 < edge1)
    lobos += 1.0 - smoothstep(0.0, uLoboTam[i], ang);
  }
  lobos = clamp(lobos, 0.0, 1.0);
  // Vazio central (periferia): 0 atrás do Al, 1 nas bordas -> gás nas bordas.
  float angV = acos(clamp(dot(d, normalize(uVoidDir)), -1.0, 1.0));
  float voidMask = smoothstep(uVoidRaio, uVoidRaio * 1.7, angV);
  float dens = n * lobos * voidMask;
  dens = pow(dens, 1.6);
  vec3 col = mix(uCor1, uCor2, clamp(n * 1.3, 0.0, 1.0));
  float al = dens * uOpac;
  if (al < 0.002) discard;
  gl_FragColor = vec4(col, al);
}`;

// Esfera de céu gigante com a névoa. Determinística pela seed da sessão.
// Devolve um grupo com a malha; os dados ficam em userData p/ testes.
export function buildNebulosa(seed = COSMOS.SEED) {
  const N = COSMOS.NEBULOSA;
  const grupo = new THREE.Group();
  grupo.name = 'nebulosa';
  const rand = semente((seed ^ 0x9e3779b9) >>> 0);

  const voidDir = new THREE.Vector3(...N.VOID_DIR).normalize();
  const dirs = [], tams = [];
  for (let i = 0; i < NEBULOSA_MAX; i++) {
    let dir = voidDir.clone();
    // lóbulo longe do vazio: fica na região de gás (periferia)
    for (let t = 0; t < 24; t++) {
      const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      dir = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
      if (dir.angleTo(voidDir) > N.VOID_RAIO * 1.05) break;
    }
    dirs.push(dir);
    tams.push(N.LOBOS_TAM[0] + rand() * (N.LOBOS_TAM[1] - N.LOBOS_TAM[0]));
  }

  const mat = new THREE.ShaderMaterial({
    vertexShader: NEBULOSA_VERT, fragmentShader: NEBULOSA_FRAG,
    transparent: true, depthWrite: false, side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uAngulo: { value: 0 },
      uCor1: { value: new THREE.Color(N.COR1) },
      uCor2: { value: new THREE.Color(N.COR2) },
      uOpac: { value: N.OPACIDADE },
      uEscala: { value: N.ESCALA_RUIDO },
      uVoidDir: { value: voidDir },
      uVoidRaio: { value: N.VOID_RAIO },
      uLobos: { value: Math.min(N.LOBOS, NEBULOSA_MAX) },
      uLoboDir: { value: dirs },
      uLoboTam: { value: tams },
    },
  });
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(N.RAIO, 48, 32), mat);
  esfera.name = 'nebulosa-esfera';
  esfera.frustumCulled = false;
  esfera.renderOrder = -1; // atrás de tudo (estrelas e Al por cima)
  grupo.add(esfera);

  grupo.userData = { mat, lobos: dirs, voidDir, esfera };
  return grupo;
}

// Deriva das nebulosas: ângulo (rad) para um tempo decorrido em segundos.
// Mais lenta que a das estrelas (o céu de fundo se move mais devagar).
export function anguloDerivaNebulosa(tempoS) {
  return tempoS * COSMOS.NEBULOSA.VEL;
}

// Uma chamada por frame: avança a deriva da névoa.
export function atualizarNebulosa(grupo, t) {
  grupo.userData.mat.uniforms.uAngulo.value = anguloDerivaNebulosa(t);
}

export function buildCosmos(seed = COSMOS.SEED) {
  const grupo = new THREE.Group();
  grupo.name = 'cosmos';
  const rand = semente(seed);

  const pos = new Float32Array(COSMOS.ESTRELAS * 3);
  const cores = new Float32Array(COSMOS.ESTRELAS * 3);
  const tamanhos = new Float32Array(COSMOS.ESTRELAS);
  const cor = new THREE.Color();
  for (let i = 0; i < COSMOS.ESTRELAS; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = COSMOS.RAIO_MIN + rand() * (COSMOS.RAIO_MAX - COSMOS.RAIO_MIN);
    pos[i * 3] = s * Math.cos(th) * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = s * Math.sin(th) * r;

    // Classe espectral → tamanho (faixa da classe, com variação própria) e
    // cor preto-corpo dessaturada, multiplicada pelo brilho da classe.
    const classe = sortearClasse(rand);
    const C = COSMOS.CLASSES[classe];
    tamanhos[i] = C.TAM[0] + rand() * (C.TAM[1] - C.TAM[0]);
    cor.setHex(dessaturar(COSMOS.CORES[classe])).multiplyScalar(C.BRILHO);
    cores[i * 3] = cor.r;
    cores[i * 3 + 1] = cor.g;
    cores[i * 3 + 2] = cor.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aCor', new THREE.BufferAttribute(cores, 3));
  geo.setAttribute('aTamanho', new THREE.BufferAttribute(tamanhos, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: ESTRELAS_VERT, fragmentShader: ESTRELAS_FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uEscala: { value: 1 } },
  });
  const estrelas = new THREE.Points(geo, mat);
  estrelas.name = 'estrelas';
  estrelas.frustumCulled = false;
  grupo.add(estrelas);

  return grupo;
}

// Deriva das estrelas: ângulo (rad) para um tempo decorrido em segundos.
export function anguloDeriva(tempoS) {
  return tempoS * COSMOS.DERIVA;
}

// Sorteia uma cadente: origem na casca distante, direção tangencial com
// leve queda (como na vida real), duração curta e próxima espera agendada.
export function sortearCadente(rand = Math.random) {
  const C = COSMOS.CADENTE;
  const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  const r = C.RAIO_MIN + rand() * (C.RAIO_MAX - C.RAIO_MIN);
  const origem = [s * Math.cos(th) * r, u * r, s * Math.sin(th) * r];
  const dx = rand() * 2 - 1, dy = -(0.25 + rand() * 0.45), dz = rand() * 2 - 1;
  const n = Math.hypot(dx, dy, dz) || 1;
  return {
    origem,
    dir: [dx / n, dy / n, dz / n],
    dur: C.DUR_MIN + rand() * (C.DUR_MAX - C.DUR_MIN),
    comp: C.COMP_MIN + rand() * (C.COMP_MAX - C.COMP_MIN),
    espera: C.ESPERA_MIN + rand() * (C.ESPERA_MAX - C.ESPERA_MIN),
  };
}

// Pose da cadente num instante t (s): cabeça, cauda e opacidade com
// envelope senoidal (nasce e morre tênue, pico no meio do voo).
export function poseCadente(cad, t) {
  const f = Math.min(1, Math.max(0, t / cad.dur));
  const vel = (cad.comp * 2.5) / cad.dur;
  const d = vel * t;
  const head = [
    cad.origem[0] + cad.dir[0] * d,
    cad.origem[1] + cad.dir[1] * d,
    cad.origem[2] + cad.dir[2] * d,
  ];
  const ext = cad.comp * Math.min(1, f * 4);
  return {
    head,
    tail: [head[0] - cad.dir[0] * ext, head[1] - cad.dir[1] * ext, head[2] - cad.dir[2] * ext],
    opacidade: Math.sin(Math.PI * f) * COSMOS.CADENTE.OPAC_MAX,
  };
}

// Linha do rastro (1px, aditiva): criada uma vez e reutilizada.
export function criarLinhaCadente() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const mat = new THREE.LineBasicMaterial({
    color: 0xf4d6ff, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const linha = new THREE.Line(geo, mat);
  linha.name = 'cadente';
  linha.visible = false;
  linha.frustumCulled = false;
  return linha;
}

export function atualizarLinhaCadente(linha, cad, t) {
  const p = poseCadente(cad, t);
  const attr = linha.geometry.attributes.position;
  attr.setXYZ(0, ...p.head);
  attr.setXYZ(1, ...p.tail);
  attr.needsUpdate = true;
  linha.material.opacity = p.opacidade;
}

// Posição da luz roxa no instante t (s): a do buraco negro na órbita dele —
// a luz nasce do buraco e se move com ele. A fase (ângulo inicial) vem da
// sessão do navegador; sem ela, vale a fase padrão do buraco. Pura.
export function posicaoSol(t, fase) {
  return posicaoOrbita(t, fase);
}

// A luz roxa: UMA DirectionalLight. A direção da luz no Al é sempre
// (posição do buraco negro → origem). A cena ativa castShadow nela.
export function buildSol(esc = 1, fase) {
  const S = COSMOS.SOL;
  const luz = new THREE.DirectionalLight(S.COR, S.INT);
  const p = posicaoSol(0, fase);
  luz.position.set(p[0] * esc, p[1] * esc, p[2] * esc);
  return luz;
}

// Move a luz para a posição do buraco negro no instante t (uma por frame).
// Só a luz se move — não há corpo visível no céu.
export function atualizarSol(luz, t, esc = 1, fase) {
  const p = posicaoSol(t, fase);
  luz.position.set(p[0] * esc, p[1] * esc, p[2] * esc);
}
