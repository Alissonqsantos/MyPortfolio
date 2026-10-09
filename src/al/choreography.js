// Coreografia do hero: 5 capítulos de câmera sobre o "Al".
// Módulo puro — sem Three.js, sem DOM. Testável em Node.

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (x) => x * x * (3 - 2 * x);

export const CHAPTERS = [
  { n: '01', word: 'IDENTITY', pose: { pos: [1.8, 1.8, 7.5], target: [-0.6, 0.2, 0.0] } },
  { n: '02', word: 'CRAFT',    pose: { pos: [-6.0, -1.3, 4.5], target: [-2.4, 0.4, 0.0] } },
  { n: '03', word: 'DETAIL',   pose: { pos: [3.4, 5.4, 4.3],  target: [-0.8, 1.5, 0.0] } },
  { n: '04', word: 'SYSTEMS',  pose: { pos: [-0.8, 5.2, -5.8], target: [0.0, 0.3, 0.0] } },
  { n: '05', word: 'IMPACT',   pose: { pos: [0.0, 0.5, 12.0], target: [0.0, 1.0, 0.0] } },
];

export function chapterIndexFor(t) {
  return Math.min(4, Math.floor(clamp01(t) * 5));
}

const lerp3 = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];

export function poseAt(t) {
  const x = clamp01(t) * 4;
  if (x <= 0) return CHAPTERS[0].pose;
  if (x >= 4) return CHAPTERS[4].pose;
  const i = Math.min(3, Math.floor(x));
  const f = smoothstep(x - i);
  const A = CHAPTERS[i].pose, B = CHAPTERS[i + 1].pose;
  // A câmera orbita POR FORA das letras: interpola a direção por slerp
  // em torno da origem e o raio linearmente, em vez de cortar reto
  // (lerp cartesiano atravessava a caixa das letras no meio do caminho).
  const r0 = Math.hypot(...A.pos), r1 = Math.hypot(...B.pos);
  const d0 = A.pos.map((v) => v / r0), d1 = B.pos.map((v) => v / r1);
  const dot = Math.min(1, Math.max(-1, d0[0] * d1[0] + d0[1] * d1[1] + d0[2] * d1[2]));
  const ang = Math.acos(dot);
  let dir;
  if (ang < 1e-4 || Math.abs(Math.sin(ang)) < 1e-6) {
    const nx = d0[0] + (d1[0] - d0[0]) * f;
    const ny = d0[1] + (d1[1] - d0[1]) * f;
    const nz = d0[2] + (d1[2] - d0[2]) * f;
    const n = Math.hypot(nx, ny, nz) || 1;
    dir = [nx / n, ny / n, nz / n];
  } else {
    const s = Math.sin(ang);
    const a = Math.sin((1 - f) * ang) / s, b = Math.sin(f * ang) / s;
    dir = [a * d0[0] + b * d1[0], a * d0[1] + b * d1[1], a * d0[2] + b * d1[2]];
  }
  const r = r0 + (r1 - r0) * f;
  return {
    pos: [dir[0] * r, dir[1] * r, dir[2] * r],
    target: lerp3(A.target, B.target, f),
  };
}

// Reservado: o ScrollTrigger (Task 6) entrega self.progress já normalizado,
// então esta função não é usada pelo Hero — mantida para testes/scroll manual.
export function progressFromScroll(scrollY, heroTop, heroHeight) {
  return clamp01((scrollY - heroTop) / Math.max(heroHeight, 1e-6));
}
