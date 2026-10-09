import * as THREE from 'three';

// Buraco negro lateral do hero — esfera negra + disco roxo em acreção,
// discreto no céu sem competir com as letras. Auto-emissivo (MeshBasic,
// sem luz própria): a iluminação da cena não muda.
// Módulo puro — sem renderer/DOM. Testável em Node.
export const BURACO = {
  POS: [0, 3, -24], // fundo central: lateral-direita no 01, lateral-esquerda no 05
  ESFERA_R: 1.0,    // horizonte de eventos (oclusor preto, sem luz)
  DISCO_INT: 1.12,  // gap interno: quase colado (≥1.1x a esfera)
  DISCO_EXT: 3.4,   // diâmetro total 6.8 — presença discreta
  NUCLEO_EXT: 1.75, // faixa quente interna (branco-lavanda)
  VEU_OPAC: 0.22,   // véu externo largo e fraco
  INCLINACAO: 0.35, // ~20°: disco aberto como na referência, visto das poses
  GIRO_NUCLEO: 0.08,// rad/s — volta em ~78s (kepleriano: dentro gira mais rápido)
  GIRO_DISCO: 0.035,// rad/s — volta em ~3min
  GIRO_VEU: 0.02,   // rad/s — quase parado
  CINTILA_AMP: 0.06,// cintilação sutil: ±6% de opacidade
  CINTILA_VEL: 0.9, // período ~7s
  CORES: {
    QUENTE: [248, 237, 255], // branco-lavanda (borda interna)
    MEIO: [168, 90, 247],    // magenta-violeta neon (zona média)
    BORDA: [60, 26, 110],    // roxo profundo (dissolve no preto)
  },
  ARCO_R: 1.38,     // anéis-lente (fingem a imagem secundária/terciária)
  ARCO_TUBO: 0.06,
  ARCO_OFF: 0.42,   // deslocamento ao longo da normal do disco
  SEG_T: 160,       // segmentos angulares do disco (filamentos lisos)
  SEG_R: 10,        // anéis radiais
};

// Cor de um ponto do disco: gradiente radial × filamentos keplerianos
// (brilho varia rápido com o ângulo, devagar com o raio — fumaça em rotação).
// Pura — testável em Node. Retorna [r,g,b] em 0..1.
export function corDisco(theta, r01) {
  const r = Math.min(1, Math.max(0, r01));
  const fil =
    0.60 +
    0.25 * Math.sin(3 * theta + 1.7) * Math.sin(2 * theta - 0.6) +
    0.15 * Math.sin(11 * theta + r * 9.0);
  const f = Math.min(1, Math.max(0.12, fil));
  const env = Math.pow(1 - r, 1.25); // 1 no interior → 0 na borda
  const k = (0.15 + 0.85 * env) * (0.45 + 0.55 * f);
  const C = BURACO.CORES;
  const mix = (a, b, t) => a + (b - a) * t;
  let c;
  if (r < 0.32) {
    const t = r / 0.32;
    c = [mix(C.QUENTE[0], C.MEIO[0], t), mix(C.QUENTE[1], C.MEIO[1], t), mix(C.QUENTE[2], C.MEIO[2], t)];
  } else {
    const t = (r - 0.32) / 0.68;
    c = [mix(C.MEIO[0], C.BORDA[0], t), mix(C.MEIO[1], C.BORDA[1], t), mix(C.MEIO[2], C.BORDA[2], t)];
  }
  return c.map((v) => (v / 255) * k);
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

  const nucleo = buildCamadaDisco(BURACO.DISCO_INT, BURACO.NUCLEO_EXT, 0.85, 'nucleo');
  const disco = buildCamadaDisco(BURACO.DISCO_INT, BURACO.DISCO_EXT, 0.6, 'disco');
  const veu = buildCamadaDisco(1.3, BURACO.DISCO_EXT, BURACO.VEU_OPAC, 'veu');
  grupo.add(nucleo, disco, veu);
  grupo.add(buildArcoLente(BURACO.ARCO_OFF, 0.4, 'arco-sup'));
  grupo.add(buildArcoLente(-BURACO.ARCO_OFF, 0.28, 'arco-inf'));

  grupo.userData = {
    nucleo, disco, veu,
    opacNucleo: 0.85, opacDisco: 0.6, opacVeu: BURACO.VEU_OPAC,
  };
  return grupo;
}

// Uma chamada por frame: giro diferencial + cintilação sutil.
// Em t=0, rotações zeradas e opacidades na base.
export function atualizarBuracoNegro(grupo, t) {
  const u = grupo.userData;
  u.nucleo.rotation.y = t * BURACO.GIRO_NUCLEO;
  u.disco.rotation.y = t * BURACO.GIRO_DISCO;
  u.veu.rotation.y = t * BURACO.GIRO_VEU;
  const c = 1 + BURACO.CINTILA_AMP * Math.sin(t * BURACO.CINTILA_VEL);
  u.nucleo.material.opacity = u.opacNucleo * c;
  u.disco.material.opacity = u.opacDisco * c;
  u.veu.material.opacity = u.opacVeu * c;
}
