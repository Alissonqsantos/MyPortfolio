import * as THREE from 'three';

// Fundo cósmico do hero — céu limpo: só estrelas + cadentes ocasionais.
// Sem sprites visíveis (sem névoas, sem halo): nenhuma mancha no céu.
// A luz roxa do sol continua banhando o Al (luz invisível, sem corpo).
// Tudo paramétrico e desligado sob prefers-reduced-motion.
// Módulo puro — sem renderer/DOM. Testável em Node.
export const COSMOS = {
  FUNDO: 0x0c0b0c,
  ESTRELAS: 900,
  RAIO_MIN: 40,
  RAIO_MAX: 60,
  TAMANHO: 0.18,
  COR_ESTRELA: 0xe6dff0,
  SEED: 20261009,
  DERIVA: 0.0025, // rad/s — volta completa em ~42min (quase parada)
  // Distribuídas ao redor da cena para cobrir as 5 poses da coreografia
  // (inclusive a 04, que olha de trás para frente).
  CADENTE: {
    ESPERA_MIN: 5, ESPERA_MAX: 13,    // uma a cada 5–13s
    DUR_MIN: 0.5, DUR_MAX: 0.9,      // rastro bem rápido
    COMP_MIN: 6, COMP_MAX: 10,       // rastro curto e discreto
    OPAC_MAX: 0.5,                   // tênue, não chama atenção
    RAIO_MIN: 42, RAIO_MAX: 50,      // longe das letras e da câmera
  },
  // Sol do cosmos: ENTIDADE ÚNICA de luz roxa em órbita — toda a luz roxa
  // que banha o Al vem daqui (direção = posição do sol → origem).
  // Luz invisível (sem corpo visível no céu): só ilumina, não aparece.
  SOL: {
    COR: 0x7322f2, INT: 1.3,
    RAIO: 28, ALTURA: 9, OSC: 4,
    VEL: 0.08, FASE: 4.0, // órbita completa em ~79s
  },
};

function mulberry32(seed) {
  return semente(seed);
}

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

export function buildCosmos() {
  const grupo = new THREE.Group();
  grupo.name = 'cosmos';
  const rand = mulberry32(COSMOS.SEED);

  const pos = new Float32Array(COSMOS.ESTRELAS * 3);
  for (let i = 0; i < COSMOS.ESTRELAS; i++) {
    const u = rand() * 2 - 1, th = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = COSMOS.RAIO_MIN + rand() * (COSMOS.RAIO_MAX - COSMOS.RAIO_MIN);
    pos[i * 3] = s * Math.cos(th) * r;
    pos[i * 3 + 1] = u * r;
    pos[i * 3 + 2] = s * Math.sin(th) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: COSMOS.COR_ESTRELA, size: COSMOS.TAMANHO, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false,
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

// Posição do sol no instante t (s): órbita circular de raio RAIO com a
// altura oscilando entre ALTURA±OSC. Puro — testável em Node.
export function posicaoSol(t) {
  const S = COSMOS.SOL;
  const a = t * S.VEL + S.FASE;
  return [Math.cos(a) * S.RAIO, S.ALTURA + Math.sin(a) * S.OSC, Math.sin(a) * S.RAIO];
}

// O sol: UMA DirectionalLight roxa. A direção da luz no Al é sempre
// (posição do sol → origem). A cena ativa castShadow nela.
export function buildSol(esc = 1) {
  const S = COSMOS.SOL;
  const luz = new THREE.DirectionalLight(S.COR, S.INT);
  const p = posicaoSol(0);
  luz.position.set(p[0] * esc, p[1] * esc, p[2] * esc);
  return luz;
}

// Move o sol para o instante t (uma chamada por frame na cena).
// Só a luz se move — não há corpo visível no céu.
export function atualizarSol(luz, t, esc = 1) {
  const p = posicaoSol(t);
  luz.position.set(p[0] * esc, p[1] * esc, p[2] * esc);
}
