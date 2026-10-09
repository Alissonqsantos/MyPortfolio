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

  // -------- POSIÇÃO E TAMANHO (suas dimensões — não mexi) --------
  POS: [0, 3, -24],  // posição na cena (fundo central: lateral-direita no 01, lateral-esquerda no 05)
  ESCALA: 1.0,       // tamanho geral (0.5 = metade, 2.0 = dobro)
  ESFERA_R: 1.0,     // sombra: esfera preta que oculta o disco atrás dela
  DISCO_INT: 0.82,   // borda interna AFUNDADA na sombra (estilo Gargantua: a emissão nasce no limbo)
  DISCO_EXT: 2.4,    // borda externa do disco (diâmetro total = 2x)
  NUCLEO_EXT: 1.75,  // até onde vai a faixa quente branco-lavanda (borda interna)
  INCLINACAO: 0.35,  // abre o disco p/ a câmera em rad (~20° como na referência)

  // -------- CORPO DO DISCO (o que tira o ar "simples") --------
  MIOLO_OPAC: 0.95, // faixa densa e opaca: corta a esfera na frente como nas refs
  PELE_OFF: 0.09,    // espessura: 2 peles translúcidas ±isso do plano (disco fino com volume, não papel)
  PELE_OPAC: 0.3,    // opacidade das peles superior/inferior
  FOTON_R: 1.02,     // anel de fótons: fio de luz colado na sombra (× o raio da esfera)
  FOTON_TUBO: 0.02,  // espessura do fio
  FOTON_OPAC: 0.9,   // brilho do fio (o elemento mais brilhante do conjunto)
  FOTON_COR: [232, 228, 255], // branco-azulado elétrico
  AURA_R: 1.18,      // halo colado na sombra (× o raio da esfera)
  AURA_OPAC: 0.15,   // quase nada — só tinge a borda da sombra de roxo

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
  QUEDA: 2.2,        // quão rápido o brilho apaga p/ fora (refs: ~2.5-3, 80% da luz nos 30% internos)
  FILAMENTOS: 1.0,   // textura de fumaça em rotação (0 = disco liso, 2 = bem riscado)
  DOPPLER: 0.5,      // assimetria lateral: um lado mais quente (0 = simétrico, estilo Nolan)
  HOTSPOT_ANG: 0.0,  // direção do lado quente em rad (0 = +X, à direita visto de frente)
  LAMELAS: 5,        // anéis concêntricos do halo (camadas de cebola das refs)
  LAMELA_F: 0.3,     // força das lamelas (0 = halo liso)

  // -------- MOVIMENTO --------
  GIRO_MIOLO: 0.11,  // rad/s — faixa densa interna (a mais rápida: ~57s/volta)
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

// Cor de um ponto do disco: gradiente radial × filamentos cisalhados × doppler
// (brilho varia rápido com o ângulo, devagar com o raio — fumaça em rotação;
// um lado mais quente, como nas refs).
// Pura — testável em Node. Retorna [r,g,b] em 0..1.
export function corDisco(theta, r01) {
  const r = Math.min(1, Math.max(0, r01));
  const shear = 26 * theta + 30 / (0.35 + r); // estrias finas esticadas pelo giro kepleriano
  const fil =
    0.60 +
    BURACO.FILAMENTOS * (0.25 * Math.sin(3 * theta + 1.7) * Math.sin(2 * theta - 0.6)) +
    BURACO.FILAMENTOS * (0.15 * Math.sin(11 * theta + r * 9.0)) +
    BURACO.FILAMENTOS * (0.10 * Math.sin(shear));
  const f = Math.min(1, Math.max(0.12, fil));
  const env = Math.pow(1 - r, BURACO.QUEDA); // 1 no interior → 0 na borda
  const doppler = 1 + BURACO.DOPPLER * 0.55 * Math.cos(theta - BURACO.HOTSPOT_ANG);
  const k = (0.15 + 0.85 * env) * (0.45 + 0.55 * f) * BURACO.BRILHO * doppler;
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

// Camada do disco: anel com vertex colors (gradiente + filamentos + doppler),
// sem escrita de profundidade. Aditiva = glow; opaca (miolo) = corpo que corta.
// `lamelas=true` estratifica em anéis concêntricos (halo em camadas de cebola).
export function buildCamadaDisco(rInt, rExt, opacidade, nome, { aditivo = true, lamelas = false } = {}) {
  const geo = new THREE.RingGeometry(rInt, rExt, BURACO.SEG_T, BURACO.SEG_R);
  const pos = geo.attributes.position;
  const cores = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const th = Math.atan2(y, x);
    const r01 = (Math.hypot(x, y) - rInt) / (rExt - rInt);
    let [cr, cg, cb] = corDisco(th, r01);
    if (lamelas) {
      const l = lamela(r01);
      cr *= l; cg *= l; cb *= l;
    }
    cores[i * 3] = cr; cores[i * 3 + 1] = cg; cores[i * 3 + 2] = cb;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cores, 3));
  geo.rotateX(-Math.PI / 2); // deita no plano XZ (normal +Y)
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, opacity: opacidade,
    blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const malha = new THREE.Mesh(geo, mat);
  malha.name = nome;
  malha.frustumCulled = false;
  malha.renderOrder = aditivo ? 2 : 1; // corpo primeiro, glows por cima
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

// Lamelas: estratificação concêntrica do véu (camadas de cebola do halo).
// Pura — testável em Node. Retorna 1 no centro, oscilando até 1-LAMELA_F.
export function lamela(r01) {
  const r = Math.min(1, Math.max(0, r01));
  return 1 - BURACO.LAMELA_F * (0.5 - 0.5 * Math.cos(r * Math.PI * 2 * BURACO.LAMELAS));
}

// Anel de fótons: fio de luz colado na sombra (o elemento mais brilhante).
export function buildFoton() {
  const geo = new THREE.TorusGeometry(BURACO.ESFERA_R * BURACO.FOTON_R, BURACO.FOTON_TUBO, 8, 160);
  geo.rotateX(Math.PI / 2); // paralelo ao disco (plano XZ)
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(...BURACO.FOTON_COR.map((v) => v / 255)),
    transparent: true, opacity: BURACO.FOTON_OPAC,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const malha = new THREE.Mesh(geo, mat);
  malha.name = 'foton';
  malha.frustumCulled = false;
  malha.renderOrder = 2;
  return malha;
}

// Aura: casca que abraça a sombra e tinge a borda de roxo (BackSide = só a
// borda aparece). Quase invisível por padrão — só tira o corte seco.
export function buildAura() {
  const geo = new THREE.SphereGeometry(BURACO.ESFERA_R * BURACO.AURA_R, 32, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(...BURACO.CORES.MEIO.map((v) => v / 255)),
    transparent: true, opacity: BURACO.AURA_OPAC,
    blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
  });
  const malha = new THREE.Mesh(geo, mat);
  malha.name = 'aura';
  malha.frustumCulled = false;
  malha.renderOrder = 2;
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

  // Corpo opaco (corta a esfera na frente) + glows aditivos por cima.
  const miolo = buildCamadaDisco(BURACO.DISCO_INT, BURACO.DISCO_EXT, BURACO.MIOLO_OPAC, 'miolo', { aditivo: false });
  const nucleo = buildCamadaDisco(BURACO.DISCO_INT, BURACO.NUCLEO_EXT, BURACO.OPAC_NUCLEO, 'nucleo');
  const disco = buildCamadaDisco(BURACO.DISCO_INT, BURACO.DISCO_EXT, BURACO.OPAC_DISCO, 'disco');
  const veu = buildCamadaDisco(BURACO.VEU_INT, BURACO.DISCO_EXT, BURACO.VEU_OPAC, 'veu', { lamelas: true });
  grupo.add(miolo, nucleo, disco, veu);
  // Espessura: peles translúcidas ±PELE_OFF (disco fino com volume, não papel).
  const peleSup = buildCamadaDisco(BURACO.DISCO_INT, BURACO.DISCO_EXT, BURACO.PELE_OPAC, 'pele-sup');
  peleSup.position.y = BURACO.PELE_OFF;
  const peleInf = buildCamadaDisco(BURACO.DISCO_INT, BURACO.DISCO_EXT, BURACO.PELE_OPAC, 'pele-inf');
  peleInf.position.y = -BURACO.PELE_OFF;
  grupo.add(peleSup, peleInf);
  grupo.add(buildFoton());
  grupo.add(buildAura());
  grupo.add(buildArcoLente(BURACO.ARCO_OFF, BURACO.ARCO_OPAC_SUP, 'arco-sup'));
  grupo.add(buildArcoLente(-BURACO.ARCO_OFF, BURACO.ARCO_OPAC_INF, 'arco-inf'));

  grupo.visible = BURACO.VISIVEL;
  grupo.scale.setScalar(BURACO.ESCALA);
  grupo.userData = {
    miolo, nucleo, disco, veu,
    opacMiolo: BURACO.MIOLO_OPAC, opacNucleo: BURACO.OPAC_NUCLEO,
    opacDisco: BURACO.OPAC_DISCO, opacVeu: BURACO.VEU_OPAC,
  };
  return grupo;
}

// Uma chamada por frame: giro diferencial + cintilação sutil.
// Em t=0, rotações zeradas e opacidades na base.
// Congelado quando GIRA=false (a cena também congela sob reduced-motion).
export function atualizarBuracoNegro(grupo, t) {
  if (!BURACO.GIRA) return;
  const u = grupo.userData;
  u.miolo.rotation.y = t * BURACO.GIRO_MIOLO;
  u.nucleo.rotation.y = t * BURACO.GIRO_NUCLEO;
  u.disco.rotation.y = t * BURACO.GIRO_DISCO;
  u.veu.rotation.y = t * BURACO.GIRO_VEU;
  const c = 1 + BURACO.CINTILA_AMP * Math.sin(t * BURACO.CINTILA_VEL);
  u.miolo.material.opacity = u.opacMiolo * c;
  u.nucleo.material.opacity = u.opacNucleo * c;
  u.disco.material.opacity = u.opacDisco * c;
  u.veu.material.opacity = u.opacVeu * c;
}
