import * as THREE from 'three';

// Fundo cósmico do hero — tokens reais do design system Superconscious do vault:
// deep #000060, violeta #7322F2, lilás #E296FF, névoa #F4D6FF, lavanda #9780FF.
// Estrelas (Points) + névoas (Sprites com gradiente radial). Estático por
// construção: sem animação, sem custo por frame, reduced-motion atendido.
// Módulo puro — sem renderer/DOM (nebulosa via DataTexture). Testável em Node.
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
  NEVOAS: [
    { cor: [115, 34, 242], opacidade: 0.16, pos: [-22, 6, -24], escala: 34 },
    { cor: [226, 150, 255], opacidade: 0.12, pos: [24, -4, -20], escala: 28 },
    { cor: [0, 0, 96], opacidade: 0.20, pos: [0, 18, 20], escala: 44 },
    { cor: [151, 128, 255], opacidade: 0.10, pos: [-6, -10, 26], escala: 30 },
  ],
  CADENTE: {
    ESPERA_MIN: 9, ESPERA_MAX: 22,   // raras: uma a cada 9–22s
    DUR_MIN: 0.5, DUR_MAX: 0.9,      // rastro bem rápido
    COMP_MIN: 10, COMP_MAX: 16,      // comprimento do rastro
    OPAC_MAX: 0.5,                   // tênue, não chama atenção
    RAIO_MIN: 42, RAIO_MAX: 50,      // longe das letras e da câmera
  },
  // Luzes que amarram o Al ao cosmo: mesma direção das névoas,
  // intensidade baixa para não brigar com key/fill/rim aprovadas.
  LUZES: [
    { COR: 0x7322f2, INT: 0.55, POS: [-22, 6, -24] },
    { COR: 0xe296ff, INT: 0.28, POS: [24, -4, -20] },
  ],
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

function nevoaTexture([r, g, b], tam = 128) {
  const data = new Uint8Array(tam * tam * 4);
  const c = tam / 2;
  for (let y = 0; y < tam; y++) {
    for (let x = 0; x < tam; x++) {
      const d = Math.hypot(x - c + 0.5, y - c + 0.5) / c;
      const queda = Math.max(0, 1 - d) ** 2;
      const i = (y * tam + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b;
      data[i + 3] = Math.round(255 * queda);
    }
  }
  const tex = new THREE.DataTexture(data, tam, tam);
  tex.needsUpdate = true;
  return tex;
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

  for (const n of COSMOS.NEVOAS) {
    const smat = new THREE.SpriteMaterial({
      map: nevoaTexture(n.cor), transparent: true, opacity: n.opacidade,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const spr = new THREE.Sprite(smat);
    spr.position.set(...n.pos);
    spr.scale.set(n.escala, n.escala, 1);
    grupo.add(spr);
  }
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

// Luzes que amarram o Al ao cosmo: mesma direção das névoas.
export function buildLuzesCosmos(esc = 1) {
  return COSMOS.LUZES.map((l) => {
    const luz = new THREE.DirectionalLight(l.COR, l.INT);
    luz.position.set(l.POS[0] * esc, l.POS[1] * esc, l.POS[2] * esc);
    return luz;
  });
}
