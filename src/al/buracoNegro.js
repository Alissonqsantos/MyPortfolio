import * as THREE from 'three';

// Buraco negro lateral do hero — esfera negra + disco roxo em acreção,
// discreto no céu sem competir com as letras. Auto-emissivo (MeshBasic,
// sem luz própria): a iluminação da cena não muda.
// Módulo puro — sem renderer/DOM. Testável em Node.
// ============================================================================
//  CONFIG — TODOS os ajustes do buraco negro ficam AQUI. Mude um valor,
//  recarregue a página e pronto: não é preciso mexer em nenhuma outra parte.
// ============================================================================
export const BURACO = {
  // -------- LIGA / DESLIGA --------
  VISIVEL: true,     // mostra o buraco negro (false = some da cena)
  GIRA: true,        // gira o disco + cintila (false = congelado; respeita reduced-motion de todo jeito)

  // -------- POSIÇÃO E TAMANHO --------
  POS: [0, 3, -24],  // posição na cena (fundo central: lateral-direita no 01, lateral-esquerda no 05)
  ESCALA: 1.0,       // tamanho geral (0.5 = metade, 2.0 = dobro)
  ESFERA_R: 1.0,     // horizonte de eventos: esfera preta que oculta o disco atrás dela
  DISCO_INT: 1.12,   // borda interna do disco (quase colada na esfera; ≥1.1x evita z-fight)
  DISCO_EXT: 3.4,    // borda externa do disco (diâmetro total = 2x; presença discreta)
  NUCLEO_EXT: 1.75,  // até onde vai a faixa quente branco-lavanda (borda interna)
  INCLINACAO: 0.35,  // abre o disco p/ a câmera em rad (~20° como na referência)

  // -------- BRILHO E OPACIDADE --------
  BRILHO: 1.0,       // brilho geral do disco (0.5 = metade, 2.0 = dobro)
  OPAC_NUCLEO: 0.85, // opacidade da faixa quente interna
  OPAC_DISCO: 0.6,   // opacidade do disco principal
  VEU_INT: 1.3,      // onde o véu externo começa (largo e fraco, p/ o halo)
  VEU_OPAC: 0.22,    // opacidade do véu externo
  ARCO_OPAC_SUP: 0.4,// arco-lente de cima (finge a luz curvada pela gravidade)
  ARCO_OPAC_INF: 0.28, // arco-lente de baixo (mais fraco, como na referência)

  // -------- CORES (0-255) --------
  CORES: {
    QUENTE: [248, 237, 255], // borda interna: branco-lavanda (gás mais quente)
    MEIO: [168, 90, 247],    // zona média: magenta-violeta neon
    BORDA: [60, 26, 110],    // borda externa: roxo profundo (dissolve no preto)
  },
  QUENTE_POS: 0.32,  // onde o branco-lavanda vira violeta (0 = tudo violeta, 1 = tudo branco)
  QUEDA: 1.25,       // quão rápido o brilho apaga p/ fora (maior = borda mais curta)
  FILAMENTOS: 1.0,   // textura de fumaça em rotação (0 = disco liso, 2 = bem riscado)

  // -------- MOVIMENTO --------
  GIRO_NUCLEO: 0.08, // rad/s — faixa quente (volta em ~78s; dentro gira mais rápido)
  GIRO_DISCO: 0.035, // rad/s — disco principal (volta em ~3min)
  GIRO_VEU: 0.02,    // rad/s — véu externo (quase parado)
  CINTILA_AMP: 0.06, // cintilação: ±6% de opacidade (0 = apagada)
  CINTILA_VEL: 0.9,  // velocidade da cintilação (período ~7s)

  // -------- DETALHES TÉCNICOS (só mexa se souber) --------
  ARCO_R: 1.38,      // raio dos anéis-lente
  ARCO_TUBO: 0.06,   // espessura dos anéis-lente
  ARCO_OFF: 0.42,    // altura dos arcos acima/abaixo do disco
  SEG_T: 160,        // segmentos angulares (filamentos lisos; menor = mais leve)
  SEG_R: 10,         // anéis radiais
};

// Cor de um ponto do disco: gradiente radial × filamentos keplerianos
// (brilho varia rápido com o ângulo, devagar com o raio — fumaça em rotação).
// Pura — testável em Node. Retorna [r,g,b] em 0..1.
export function corDisco(theta, r01) {
  const r = Math.min(1, Math.max(0, r01));
  const fil =
    0.60 +
    BURACO.FILAMENTOS * (0.25 * Math.sin(3 * theta + 1.7) * Math.sin(2 * theta - 0.6)) +
    BURACO.FILAMENTOS * (0.15 * Math.sin(11 * theta + r * 9.0));
  const f = Math.min(1, Math.max(0.12, fil));
  const env = Math.pow(1 - r, BURACO.QUEDA); // 1 no interior → 0 na borda
  const k = (0.15 + 0.85 * env) * (0.45 + 0.55 * f) * BURACO.BRILHO;
  const C = BURACO.CORES;
  const QP = BURACO.QUENTE_POS;
  const mix = (a, b, t) => a + (b - a) * t;
  let c;
  if (r < QP) {
    const t = QP > 0 ? r / QP : 1;
    c = [mix(C.QUENTE[0], C.MEIO[0], t), mix(C.QUENTE[1], C.MEIO[1], t), mix(C.QUENTE[2], C.MEIO[2], t)];
  } else {
    const t = QP < 1 ? (r - QP) / (1 - QP) : 0;
    c = [mix(C.MEIO[0], C.BORDA[0], t), mix(C.MEIO[1], C.BORDA[1], t), mix(C.MEIO[2], C.BORDA[2], t)];
  }
  return c.map((v) => Math.min(1, (v / 255) * k));
}

// Camada do disco: anel com vertex colors (gradiente + filamentos),
// aditivo e sem escrita de profundidade — brilho contido, sem mancha.
export function buildCamadaDisco(rInt, rExt, opacidade, nome) {
  const geo = new THREE.RingGeometry(rInt, rExt, BURACO.SEG_T, BURACO.SEG_R);
  const pos = geo.attributes.position;
  const cores = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const th = Math.atan2(y, x);
    const r01 = (Math.hypot(x, y) - rInt) / (rExt - rInt);
    const [cr, cg, cb] = corDisco(th, r01);
    cores[i * 3] = cr; cores[i * 3 + 1] = cg; cores[i * 3 + 2] = cb;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  geo.rotateX(-Math.PI / 2); // deita no plano XZ (normal +Y)
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: opacidade,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
  });
  const malha = new THREE.Mesh(geo, mat);
  malha.name = nome;
  malha.frustumCulled = false;
  return malha;
}

// Anel-lente: círculo fino paralelo ao disco, deslocado na normal —
// de frente, projeta-se como os arcos acima/abaixo da esfera (lente gravitacional).
export function buildArcoLente(offsetY, opacidade, nome) {
  const geo = new THREE.TorusGeometry(BURACO.ARCO_R, BURACO.ARCO_TUBO, 10, 128);
  geo.rotateX(Math.PI / 2); // paralelo ao disco (plano XZ)
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(...BURACO.CORES.MEIO.map((v) => v / 255)),
    transparent: true, opacity: opacidade,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const malha = new THREE.Mesh(geo, mat);
  malha.name = nome;
  malha.position.y = offsetY;
  malha.frustumCulled = false;
  return malha;
}

export function buildBuracoNegro() {
  const grupo = new THREE.Group();
  grupo.name = 'buraco-negro';
  grupo.position.set(...BURACO.POS);
  grupo.rotation.x = BURACO.INCLINACAO;

  const horizonte = new THREE.Mesh(
    new THREE.SphereGeometry(BURACO.ESFERA_R, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 }),
  );
  horizonte.name = 'horizonte';
  grupo.add(horizonte);

  const nucleo = buildCamadaDisco(BURACO.DISCO_INT, BURACO.NUCLEO_EXT, BURACO.OPAC_NUCLEO, 'nucleo');
  const disco = buildCamadaDisco(BURACO.DISCO_INT, BURACO.DISCO_EXT, BURACO.OPAC_DISCO, 'disco');
  const veu = buildCamadaDisco(BURACO.VEU_INT, BURACO.DISCO_EXT, BURACO.VEU_OPAC, 'veu');
  grupo.add(nucleo, disco, veu);
  grupo.add(buildArcoLente(BURACO.ARCO_OFF, BURACO.ARCO_OPAC_SUP, 'arco-sup'));
  grupo.add(buildArcoLente(-BURACO.ARCO_OFF, BURACO.ARCO_OPAC_INF, 'arco-inf'));

  grupo.visible = BURACO.VISIVEL;
  grupo.scale.setScalar(BURACO.ESCALA);
  grupo.userData = {
    nucleo, disco, veu,
    opacNucleo: BURACO.OPAC_NUCLEO, opacDisco: BURACO.OPAC_DISCO, opacVeu: BURACO.VEU_OPAC,
  };
  return grupo;
}

// Uma chamada por frame: giro diferencial + cintilação sutil.
// Em t=0, rotações zeradas e opacidades na base.
// Congelado quando GIRA=false (a cena também congela sob reduced-motion).
export function atualizarBuracoNegro(grupo, t) {
  if (!BURACO.GIRA) return;
  const u = grupo.userData;
  u.nucleo.rotation.y = t * BURACO.GIRO_NUCLEO;
  u.disco.rotation.y = t * BURACO.GIRO_DISCO;
  u.veu.rotation.y = t * BURACO.GIRO_VEU;
  const c = 1 + BURACO.CINTILA_AMP * Math.sin(t * BURACO.CINTILA_VEL);
  u.nucleo.material.opacity = u.opacNucleo * c;
  u.disco.material.opacity = u.opacDisco * c;
  u.veu.material.opacity = u.opacVeu * c;
}
