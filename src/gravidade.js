// Gravidade do nav — lente em coordenadas de tela (px do viewport).
// A cena (scene.js) projeta o centro do buraco: NDC → px, e escreve
// --bh-px/--bh-py/--bh-vis no <body>. O Nav mede cada link e escreve
// --g/--dir por link; o CSS distorce. Aqui mora só a matemática pura,
// sem Three.js e sem DOM — testável em Node.
export const GRAVIDADE_RAIO = 260; // px de influência ao redor do disco

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const suave = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

// bh, link: {x, y} em px do viewport. Retorna {g, dir}:
// g cai em smoothstep de 1 (colado) a 0 (borda do raio); dir aponta
// para o lado do buraco (+1 direita, -1 esquerda, 0 em cima/neutro).
export function forcaGravidade(bh, link, raio = GRAVIDADE_RAIO) {
  if (!(raio > 0)) return { g: 0, dir: 0 };
  const dx = bh.x - link.x;
  const dy = bh.y - link.y;
  const d = Math.hypot(dx, dy);
  if (!(d < raio)) return { g: 0, dir: 0 };
  return { g: suave(1 - d / raio), dir: Math.sign(dx) };
}

// NDC (-1..1) → px do viewport, dado o rect do canvas
// (canvas.getBoundingClientRect()).
export function ndcParaPx(ndc, rect) {
  return {
    x: rect.left + (ndc.x * 0.5 + 0.5) * rect.width,
    y: rect.top + (-ndc.y * 0.5 + 0.5) * rect.height,
  };
}
