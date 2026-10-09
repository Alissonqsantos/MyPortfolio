import * as THREE from 'three';

// "Al" — A (AFont.jpg, malha única) + l minúsculo (barra oblíqua chanfrada,
// estilo do A; inclinada ~14.3° p/ a esquerda), lado a lado sobre a mesma
// baseline (y=0), mesma altura 3.6.
// ============================================================================
//  CONFIG — TODOS os ajustes do projeto ficam AQUI. Mude um valor, recarregue
//  a página e pronto: não é preciso mexer em nenhuma outra parte do arquivo.
// ============================================================================
const CONFIG = {
  // -------- GEOMETRIA (formato e disposição das letras) --------
  ALTURA: 3.6,        // altura das letras; escala o conjunto INTEIRO (padrão 3.6)
  EXTRUSAO: 1.0,      // profundidade da extrusão (padrão 1.0)
  BEVEL_T: 0.03,      // chanfro em Z (quina)
  BEVEL_S: 0.025,     // chanfro no plano XY (< metade da parede mais fina)
  BEVEL_SEG: 3,       // suavidade do chanfro (1 = facetado, 6 = liso)
  A_OFF_X: -2.45,     // posição X do A (negativo = esquerda)
  L_OFF_X: 0.95,      // posição X do l (positivo = direita; gap ≈ 0.38)
  L_ESCALA: 0.9,      // escala do l (1.0 = mesma altura do A)
  L_ESPESSURA: 0.7,  // largura (horizontal) da barra do l — maior = mais grossa
  CANTO_RAIO: 0.0,    // raio do arredondamento das QUINAS das letras (0 = quinas como estão)
  CANTO_SEG: 6,       // suavidade do arredondamento (pontos por quina; 3 = facetado, 12 = liso)

  // -------- APARÊNCIA (material das letras) --------
  COR: 0x030303,        // cor quase-preto (visível no fundo preto)
  ROUGH: 0.75,          // rugosidade (0 = espelho, 1 = fosco)
  METAL: 0.15,          // metalicidade (0 = plástico, 1 = metal)   
  BUMP: 0.1,          // relevo fino da superfície
  CLEARCOAT: 0.1,      // verniz (brilho de camada por cima)
  CLEARCOAT_ROUGH: 0.2, // rugosidade do verniz
  FUNDO: 0x000000,      // cor do fundo da cena

  // -------- ANIMAÇÃO --------
  GIRO: 0.6,          // velocidade da rotação automática em rad/s (0 = não gira)
  PUSH: {             // empurrão de hover: o cursor "empurra" a parte da letra
    TRANSL: 0.02,     // deslocamento máximo no plano, em unidades (borda = máximo)
    ROLL: 0.7,        // inclinação no plano, em graus (máx. na borda)
    PITCH: 0.8,       // inclinação em profundidade, em graus (máx. na borda)
    SUAV: 0.12        // tempo de resposta em segundos (menor = mais rápido)
  },

  // -------- CÂMERA --------
  FOV: 35,            // campo de visão
  NEAR: 0.1,          // plano de corte próximo
  FAR: 100,           // plano de corte distante
  VISTAS: {           // posições salvas nas teclas 1 / 2 / 3
    1: [0, 1.8, 19],      // frente
    2: [9.5, 5.0, 15.0],  // 3/4
    3: [19, 1.8, 1.0]     // lado
  },

  // -------- LUZES --------
  // Brancas em baixa intensidade (apoio) + roxas do cosmos (protagonistas).
  LUZ_KEY:  { COR: 0xffffff, INT: 0.28, POS: [4, 7, 6] },   // principal (faz sombra)
  LUZ_FILL: { COR: 0xdfe8ff, INT: 0.28, POS: [-6, 2, 4] },  // preenchimento (azulado)
  LUZ_RIM:  { COR: 0xffffff, INT: 0.4, POS: [-2, 4, -6] },  // contorno (atrás)
  AMBIENTE: 0.01,     // reflexo do ambiente (RoomEnvironment) — contido

  // -------- SOMBRA --------
  SOMBRA_MAPA: 2048,  // resolução do mapa de sombra (maior = mais nítida)
  SOMBRA_ALCANCE: 8,  // metade do tamanho da área coberta pela sombra

  // -------- CHÃO (só recebe a sombra; não aparece) --------
  CHAO_Y: -2.35,        // altura do chão
  CHAO_TAM: 60,         // tamanho do chão
  CHAO_OPACIDADE: 0.22  // opacidade da sombra projetada
};

// Escala global derivada da ALTURA (1.0 no padrão). Aplica-se ao conjunto todo,
// às luzes, à sombra e ao chão — assim mudar a ALTURA não desalinha a cena.
const ESC = CONFIG.ALTURA / 3.6;

// Contorno do A medido da silhueta real (y para cima, pés em y=0, topo em y=3.6).
const CONTORNO_A = [
  [0.5617, 3.6000],
  [0.8005, 3.6000],
  [1.4108, 1.2118],
  [1.4550, 1.1941],
  [2.0830, 1.2206],
  [1.8442, 0.9641],
  [1.5700, 0.9641],
  [1.4816, 0.9464],
  [1.6850, 0.1415],
  [0.6855, 0.1061],
  [0.6236, 0.3892],
  [0.6059, 0.4069],
  [-0.5882, 0.3715],
  [0.0044, 1.1587],
  [0.0929, 1.1499],
  [0.4378, 1.1764],
  [0.3052, 1.7867],
  [0.2875, 1.7956],
  [-1.0570, 0.0531],
  [-1.0835, 0.0354],
  [-2.0830, 0.0000],
  [-0.7032, 1.7248],
  [-0.1017, 1.7514],
  [0.0663, 1.9459],
  [-0.0752, 1.9548],
  [-0.5351, 1.9371],
  [-0.4644, 2.0256],
  [-0.4644, 2.0521],
  [-1.1720, 2.0256],
  [-1.1278, 2.0698],
  [-1.1101, 2.0963],
  [-1.1189, 2.1052],
  [-1.6939, 2.0786],
  [-1.4816, 2.2644],
  [-0.9332, 2.2909],
  [-0.8270, 2.4059],
  [-0.7828, 2.4147],
  [-0.1459, 2.4324],
  [-0.0398, 2.5563],
  [-0.0929, 2.7951],
  [0.5528, 3.5912],
];

// Contorno do l minúsculo: barra oblíqua pesada no estilo do A.
// Inclinada ~14.3° para a ESQUERDA (topo à esquerda, base à direita),
// paralela à perna direita do A. Cantos chanfrados (mesma linguagem do A).
const CONTORNO_L = [
  [-0.6000, 0.0000],
  [0.3200, 0.0000],
  [0.6000, 0.2800],
  [-0.3176, 3.6000],
  [-1.2376, 3.6000],
  [-1.5176, 3.3200],
];

// Sem furos: o l minúsculo não tem laços.
const FUROS_L = [];

// Largura horizontal atual da barra do l — é a referência do CONFIG.L_ESPESSURA
// (0.92 = como está hoje; 1.1 = 20% mais grossa; 0.7 = bem fina).
const L_LARGURA_REF = 0.92;

// Espessura do l: escala a largura HORIZONTAL em torno do centro do contorno.
// Mantém a base (y) intacta; só a grossura muda.
function aplicarEspessura(pts, largura) {
  const f = largura / L_LARGURA_REF;
  if (Math.abs(f - 1) < 1e-9) return pts;
  let minX = Infinity, maxX = -Infinity;
  for (const p of pts) { if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; }
  const cx = (minX + maxX) / 2;
  return pts.map(([x, y]) => [cx + (x - cx) * f, y]);
}

// Arredonda as QUINAS de um contorno fechado. Em cada vértice encaixa um arco
// de círculo de raio `raio` (limitado a 45% das arestas vizinhas, p/ não invadir).
// `seg` = pontos por quina (3 = facetado, 12 = liso). raio 0 = contorno original.
function arredondarCantos(pts, raio, seg) {
  const n = pts.length;
  if (!(raio > 0) || n < 3) return pts;
  const segs = Math.max(2, Math.round(seg));
  const out = [];
  for (let i = 0; i < n; i++) {
    const P = pts[i], A = pts[(i - 1 + n) % n], B = pts[(i + 1) % n];
    let ux = A[0] - P[0], uy = A[1] - P[1];
    let vx = B[0] - P[0], vy = B[1] - P[1];
    const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy);
    if (lu < 1e-9 || lv < 1e-9) { out.push(P); continue; }
    ux /= lu; uy /= lu; vx /= lv; vy /= lv;
    const dot = Math.max(-1, Math.min(1, ux * vx + uy * vy));
    const ang = Math.acos(dot);                       // ângulo entre as arestas
    // quina quase reta (contornos rastreados têm muitos vértices colineares):
    // passa direto, senão a malha explode sem ganho visual
    if (ang > Math.PI - 0.06 || ang < 1e-3) { out.push(P); continue; }
    let d = raio / Math.tan(ang / 2);                 // distância até a tangência
    d = Math.min(d, lu * 0.45, lv * 0.45);
    if (d < 1e-7) { out.push(P); continue; }
    const r = d * Math.tan(ang / 2);                  // raio efetivo após o limite
    // arco sub-pixel (vértice de ruído em contorno rastreado): não vale a pena,
    // só inflaria a malha sem mudar nada visível
    if (r < 0.02) { out.push(P); continue; }
    const t1 = [P[0] + ux * d, P[1] + uy * d];
    const t2 = [P[0] + vx * d, P[1] + vy * d];
    let bx = ux + vx, by = uy + vy;                   // bissetriz -> centro do arco
    const lb = Math.hypot(bx, by);
    if (lb < 1e-9) { out.push(P); continue; }
    bx /= lb; by /= lb;
    const cc = r / Math.sin(ang / 2);
    const cx = P[0] + bx * cc, cy = P[1] + by * cc;
    const a1 = Math.atan2(t1[1] - cy, t1[0] - cx);
    const a2 = Math.atan2(t2[1] - cy, t2[0] - cx);
    let sh = a2 - a1;                                 // varredura curta
    while (sh <= -Math.PI) sh += Math.PI * 2;
    while (sh > Math.PI) sh -= Math.PI * 2;
    const lg = sh > 0 ? sh - Math.PI * 2 : sh + Math.PI * 2;
    const meio = (sw) => { const a = a1 + sw / 2; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
    const dP = (p) => Math.hypot(p[0] - P[0], p[1] - P[1]);
    // escolhe o sentido cujo meio do arco fica mais perto do vértice (abaulando p/ P)
    const sweep = dP(meio(sh)) <= dP(meio(lg)) ? sh : lg;
    out.push(t1);
    for (let s = 1; s < segs; s++) {
      const a = a1 + sweep * (s / segs);
      out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
    out.push(t2);
  }
  return out;
}

function shapeFrom(pts, furos) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  for (const f of (furos || [])) {
    const p = new THREE.Path();
    p.moveTo(f[0][0], f[0][1]);
    for (let i = 1; i < f.length; i++) p.lineTo(f[i][0], f[i][1]);
    p.closePath();
    s.holes.push(p);
  }
  return s;
}

let GEO_CACHE = null;

function getGeometrias() {
  if (GEO_CACHE) return GEO_CACHE;
  const opt = {
    depth: CONFIG.EXTRUSAO, bevelEnabled: true,
    bevelThickness: CONFIG.BEVEL_T, bevelSize: CONFIG.BEVEL_S, bevelSegments: CONFIG.BEVEL_SEG
  };
  const raio = CONFIG.CANTO_RAIO, cseg = CONFIG.CANTO_SEG;
  const aPts = arredondarCantos(CONTORNO_A, raio, cseg);
  const lBase = aplicarEspessura(CONTORNO_L, CONFIG.L_ESPESSURA);
  const lPts = arredondarCantos(lBase, raio, cseg);
  const aGeo = new THREE.ExtrudeGeometry(shapeFrom(aPts), opt);
  aGeo.translate(0, 0, -CONFIG.EXTRUSAO / 2);
  const lGeo = new THREE.ExtrudeGeometry(shapeFrom(lPts, FUROS_L), opt);
  lGeo.translate(0, 0, -CONFIG.EXTRUSAO / 2);
  GEO_CACHE = { aGeo, lGeo };
  return GEO_CACHE;
}

function buildAl(matA, matL) {
  const { aGeo, lGeo } = getGeometrias();
  const grupo = new THREE.Group();
  const mA = new THREE.Mesh(aGeo, matA);
  mA.name = 'letraA';
  mA.position.x = CONFIG.A_OFF_X;
  const mL = new THREE.Mesh(lGeo, matL);
  mL.name = 'letraL';
  mL.scale.setScalar(CONFIG.L_ESCALA);   // l minúsculo: mesma altura do A
  mL.position.x = CONFIG.L_OFF_X;        // base em y=0 preservada (escala a partir da baseline)
  grupo.add(mA, mL);
  grupo.updateMatrixWorld(true);
  const centro = new THREE.Box3().setFromObject(grupo).getCenter(new THREE.Vector3());
  const interno = new THREE.Group();   // preserva o pivô ao recentralizar
  grupo.position.sub(centro);
  interno.add(grupo);
  interno.scale.setScalar(ESC);        // escala global vinda de CONFIG.ALTURA
  return interno;
}

export { CONFIG, CONTORNO_A, CONTORNO_L, FUROS_L, shapeFrom, getGeometrias, buildAl, aplicarEspessura, arredondarCantos };
