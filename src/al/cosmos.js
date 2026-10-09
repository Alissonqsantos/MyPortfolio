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
  // Distribuídas ao redor da cena para cobrir as 5 poses da coreografia
  // (inclusive a 04, que olha de trás para frente).
  NEVOAS: [
    { cor: [115, 34, 242], opacidade: 0.16, pos: [-22, 6, -24], escala: 34 },
    { cor: [226, 150, 255], opacidade: 0.12, pos: [24, -4, -20], escala: 28 },
    { cor: [0, 0, 96], opacidade: 0.20, pos: [0, 18, 20], escala: 44 },
    { cor: [151, 128, 255], opacidade: 0.10, pos: [-6, -10, 26], escala: 30 },
  ],
};

function mulberry32(seed) {
  let a = seed >>> 0;
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
  grupo.add(new THREE.Points(geo, mat));

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
