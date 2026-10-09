import * as THREE from 'three';

// Buraco negro lateral do hero — port do projeto 3D do scratch
// (`buraco-negro/index.html`): sombra + disco com shader animado (fbm em
// rotação kepleriana) + aura fresnel fina. Auto-emissivo (Basic + Shader,
// sem luz própria): a iluminação da cena não muda.
// Posição/escala/inclinação são as do hero; corpo (raios, cores, shaders)
// são os do projeto 3D.
// Módulo puro — sem renderer/DOM. Testável em Node.
// ============================================================================
//  CONFIG — TODOS os ajustes do buraco negro ficam AQUI. Mude um valor,
//  recarregue a página e pronto: não é preciso mexer em nenhuma outra parte.
// ============================================================================
export const BURACO = {
  // -------- LIGA / DESLIGA --------
  VISIVEL: true,     // mostra o buraco negro (false = some da cena)
  GIRA: true,        // anima o shader + balanço (false = congelado; respeita reduced-motion de todo jeito)

  // -------- DERIVA (bem de longe, bem sutil, SEMPRE visível) --------
  // O buraco mora no FUNDO, atrás do Al (a âncora abaixo), e deriva num
  // círculo PEQUENO em torno dela: a cada frame a posição é
  //   CENTRO + [R*cos(FASE+VEL*t), bob, R*sin(FASE+VEL*t)].
  // O raio é pequeno de propósito (NÃO é um círculo de 40 em volta do Al):
  // assim ele nunca passa atrás da câmera nem sai do quadro, por mais que a
  // fase sorteada da sessão gire — a câmera fica a ~9 do Al, e a ~40 daqui.
  ORBITA_CENTRO: [0, 5, -40], // âncora no fundo central (z=-40, altura 5)
  ORBITA_RAIO: 3,    // raio da deriva em torno da âncora (bem sutil; ≤10 = sempre no fundo)
  ORBITA_VEL: 0.015, // rad/s — uma volta em ~7min (deriva lenta e contínua)
  ORBITA_FASE: -1.5708, // ângulo inicial padrão (-PI/2); a cena usa a fase sorteada da sessão
  ORBITA_BOB_AMP: 0.4,  // flutuação vertical em Y (unidades; 0 = deriva plana)
  ORBITA_BOB_VEL: 0.15, // velocidade da flutuação (período ~42s)

  // -------- TAMANHO (modelo intacto) --------
  ESCALA: 0.9,      // compensa a distância (~40): mesmo tamanho aparente de antes, mas bem mais longe
  INCLINACAO: 0.35,  // abre o disco p/ a câmera em rad (~20°; 0 = fio de navalha edge-on)

  // -------- CORPO (do projeto 3D) --------
  ESFERA_R: 1.0,     // sombra: esfera preta que oculta o disco atrás dela
  DISCO_INT: 1.16,   // borda interna do disco, colada na sombra (1.16x o raio)
  DISCO_EXT: 3.9,    // borda externa do disco (diâmetro total = 2x)
  AURA_R: 1.14,      // halo colado na sombra (× o raio da esfera)
  AURA_EQ_W: 0.30,   // largura da faixa equatorial da aura (onde encontra o disco)

  // -------- CORES (hex, do projeto 3D) --------
  CORES: {
    INTERNA: '#7c3aed', // borda interna: violeta neon (gás mais quente)
    MEDIA: '#d8b4fe',   // zona média: lavanda clara
    VIOLETA: '#7c3aed', // corpo: violeta
    PROFUNDA: '#2a0a5e', // borda externa: roxo profundo (dissolve no preto)
  },

  // -------- BRILHO E OPACIDADE --------
  BRILHO_DISCO: 0.85, // ganho do shader do disco (2.6 = painel original claro; 0.85 = discreto no hero)
  OPAC_DISCO: 0.85,  // opacidade do disco
  BRILHO_AURA: 0.8,  // ganho do shader da aura
  OPAC_AURA: 0.5,    // opacidade da aura (fina por padrão)

  // -------- MOVIMENTO --------
  VEL_DISCO: 0.55,   // giro do gás no shader (dentro gira mais rápido: rev = t*VEL*(1.6-t*1.2))

  // -------- DETALHES TÉCNICOS (só mexa se souber) --------
  SEG_T: 256,        // segmentos angulares do anel (filamentos lisos; menor = mais leve)
  SEG_R: 8,          // anéis radiais do disco
};

export function getGeometrias() {
  return {
    disk: new THREE.RingGeometry(BURACO.DISCO_INT, BURACO.DISCO_EXT, BURACO.SEG_T, BURACO.SEG_R),
    hole: new THREE.SphereGeometry(BURACO.ESFERA_R, 96, 64),
    aura: new THREE.SphereGeometry(BURACO.AURA_R, 96, 64),
  };
}

// Posição do buraco na deriva no instante t (s) para o ângulo inicial dado
// (padrão: ORBITA_FASE). A cena passa a fase sorteada da sessão do navegador,
// então a deriva inteira desloca. Pura — testável em Node.
export function posicaoOrbita(t, fase = BURACO.ORBITA_FASE) {
  const a = fase + BURACO.ORBITA_VEL * t;
  const [cx, cy, cz] = BURACO.ORBITA_CENTRO;
  return [
    cx + BURACO.ORBITA_RAIO * Math.cos(a),
    cy + BURACO.ORBITA_BOB_AMP * Math.sin(t * BURACO.ORBITA_BOB_VEL),
    cz + BURACO.ORBITA_RAIO * Math.sin(a),
  ];
}

const DISK_VERT = /* glsl */`
varying vec2 vP;
varying vec2 vUvR;
void main(){
  vP = position.xy;
  vUvR = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

const DISK_FRAG = /* glsl */`
precision highp float;
varying vec2 vP;
uniform float uTime;
uniform vec3 uInner, uMid, uViolet, uDeep;
uniform float uInnerR, uOuterR, uBoost, uAlpha, uVel;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y);
}
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*vnoise(p); p*=2.03; a*=.5;} return s; }
void main(){
  float r = length(vP);
  float t = clamp((r - uInnerR)/(uOuterR - uInnerR), 0., 1.);
  float ang = atan(vP.y, vP.x);
  float rev = uTime*uVel*(1.6 - t*1.2);
  float streak = fbm(vec2(ang*9.0 + rev*2.0, r*7.0 - rev*3.0));
  float streak2 = fbm(vec2(ang*22.0 - rev*3.0, r*13.0 + rev));
  float lanes = mix(0.55, 1.25, streak*0.65 + streak2*0.35);
  vec3 col = mix(uInner, uMid, smoothstep(0.0,0.32,t));
  col = mix(col, uViolet, smoothstep(0.28,0.68,t));
  col = mix(col, uDeep, smoothstep(0.62,1.0,t));
  col *= lanes * uBoost;
  float aIn = smoothstep(0.0,0.06,t);
  float aOut = 1.0 - smoothstep(0.55,1.0,t);
  float a = aIn*aOut*uAlpha;
  if(a < 0.003) discard;
  gl_FragColor = vec4(col*a, a);
}`;

export function makeDiskMaterial(boost = BURACO.BRILHO_DISCO, alpha = BURACO.OPAC_DISCO) {
  return new THREE.ShaderMaterial({
    vertexShader: DISK_VERT, fragmentShader: DISK_FRAG,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: new THREE.Color(BURACO.CORES.INTERNA) },
      uMid: { value: new THREE.Color(BURACO.CORES.MEDIA) },
      uViolet: { value: new THREE.Color(BURACO.CORES.VIOLETA) },
      uDeep: { value: new THREE.Color(BURACO.CORES.PROFUNDA) },
      uInnerR: { value: BURACO.DISCO_INT }, uOuterR: { value: BURACO.DISCO_EXT },
      uBoost: { value: boost }, uAlpha: { value: alpha },
      uVel: { value: BURACO.VEL_DISCO },
    },
  });
}

const AURA_VERT = /* glsl */`
varying vec3 vN;
varying vec3 vV;
varying vec3 vPos;
void main(){
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vV = normalize(-mv.xyz);
  vPos = normalize(position);
  gl_Position = projectionMatrix * mv;
}`;
const AURA_FRAG = /* glsl */`
precision highp float;
varying vec3 vN;
varying vec3 vV;
varying vec3 vPos;
uniform float uTime; uniform vec3 uInner,uMid,uViolet; uniform float uEqW,uBoost,uAlpha;
void main(){
  float fr = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(fr, 3.0);
  float eq = 1.0 - smoothstep(0.0, uEqW, abs(vPos.y));
  float shimmer = 0.8 + 0.2 * sin(uTime * 1.1 + atan(vPos.x, vPos.z) * 6.0);
  vec3 col = mix(uViolet, uMid, eq * 0.7);
  col = mix(col, uInner, eq * rim * 0.8);
  float a = (rim * 0.45 + eq * rim * 1.6) * uAlpha * shimmer;
  if(a < 0.004) discard;
  gl_FragColor = vec4(col * uBoost * a, a);
}`;

export function makeAuraMaterial(boost = BURACO.BRILHO_AURA, alpha = BURACO.OPAC_AURA) {
  return new THREE.ShaderMaterial({
    vertexShader: AURA_VERT, fragmentShader: AURA_FRAG,
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uInner: { value: new THREE.Color(BURACO.CORES.INTERNA) },
      uMid: { value: new THREE.Color(BURACO.CORES.MEDIA) },
      uViolet: { value: new THREE.Color(BURACO.CORES.VIOLETA) },
      uEqW: { value: BURACO.AURA_EQ_W }, uBoost: { value: boost }, uAlpha: { value: alpha },
    },
  });
}

export function buildBuracoNegro(fase = BURACO.ORBITA_FASE) {
  const G = getGeometrias();
  const grupo = new THREE.Group();
  grupo.name = 'buraco-negro';
  grupo.position.set(...posicaoOrbita(0, fase));
  grupo.rotation.x = BURACO.INCLINACAO;

  const horizonte = new THREE.Mesh(G.hole, new THREE.MeshBasicMaterial({ color: 0x000000 }));
  horizonte.name = 'horizonte';
  horizonte.renderOrder = 1;
  grupo.add(horizonte);

  const diskMat = makeDiskMaterial();
  const disco = new THREE.Mesh(G.disk, diskMat);
  disco.rotation.x = -Math.PI / 2; // deita no plano XZ (normal +Y)
  disco.name = 'disco';
  disco.renderOrder = 3;
  disco.frustumCulled = false;
  grupo.add(disco);

  const auraMat = makeAuraMaterial();
  const aura = new THREE.Mesh(G.aura, auraMat);
  aura.scale.set(1, 0.92, 1);
  aura.name = 'aura';
  aura.renderOrder = 2;
  aura.frustumCulled = false;
  grupo.add(aura);

  grupo.visible = BURACO.VISIVEL;
  grupo.scale.setScalar(BURACO.ESCALA);
  grupo.userData = { diskMat, auraMat, fase };
  return grupo;
}

// Uma chamada por frame: avança o tempo dos shaders + move o grupo na órbita.
// Em t=0, uTime zerado e grupo em posicaoOrbita(0).
// Congelado quando GIRA=false (a cena também congela sob reduced-motion).
export function atualizarBuracoNegro(grupo, t) {
  if (!BURACO.GIRA) return;
  const u = grupo.userData;
  u.diskMat.uniforms.uTime.value = t;
  u.auraMat.uniforms.uTime.value = t;
  grupo.position.set(...posicaoOrbita(t, u.fase));
}
