// Coreografia do hero: 5 capítulos de câmera sobre o "Al".
// Módulo puro — sem Three.js, sem DOM. Testável em Node.

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smoothstep = (x) => x * x * (3 - 2 * x);

export const CHAPTERS = [
  { n: '01', word: 'IDENTITY', pose: { pos: [1.8, 1.8, 7.5], target: [-0.6, 0.2, 0.0] } },
  { n: '02', word: 'CRAFT',    pose: { pos: [1.2, -1.5, 6.5], target: [-0.3, 1.0, 0.0] } },
  { n: '03', word: 'DETAIL',   pose: { pos: [0.2, 2.2, 3.0],  target: [-0.8, 2.0, 0.0] } },
  { n: '04', word: 'SYSTEMS',  pose: { pos: [1.0, 6.0, 4.0], target: [0.0, 0.0, 0.0] } },
  { n: '05', word: 'IMPACT',   pose: { pos: [0.0, 1.5, 12.0], target: [0.0, 0.3, 0.0] } },
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
  return {
    pos: lerp3(CHAPTERS[i].pose.pos, CHAPTERS[i + 1].pose.pos, f),
    target: lerp3(CHAPTERS[i].pose.target, CHAPTERS[i + 1].pose.target, f),
  };
}

// Reservado: o ScrollTrigger (Task 6) entrega self.progress já normalizado,
// então esta função não é usada pelo Hero — mantida para testes/scroll manual.
export function progressFromScroll(scrollY, heroTop, heroHeight) {
  return clamp01((scrollY - heroTop) / Math.max(heroHeight, 1e-6));
}
