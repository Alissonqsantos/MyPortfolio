import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG, buildAl } from './geometry.js';
import { poseAt } from './choreography.js';

// Escala global derivada da ALTURA (1.0 no padrão) — mesma do Al3D.
const ESC = CONFIG.ALTURA / 3.6;

// Puro, sem renderer/DOM: testável em Node.
export function applyProgress(t, camera, target) {
  const p = poseAt(t);
  camera.position.set(...p.pos);
  target.set(...p.target);
  camera.lookAt(target);
}

function makeLetterMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: CONFIG.COR, roughness: CONFIG.ROUGH, metalness: CONFIG.METAL,
    clearcoat: CONFIG.CLEARCOAT, clearcoatRoughness: CONFIG.CLEARCOAT_ROUGH, bumpScale: CONFIG.BUMP
  });
}

export function createAlScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const cena = new THREE.Scene();
  cena.background = new THREE.Color(CONFIG.FUNDO);

  const camera = new THREE.PerspectiveCamera(CONFIG.FOV, 1.6, CONFIG.NEAR, CONFIG.FAR);
  const alvo = new THREE.Vector3();

  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(renderer), CONFIG.AMBIENTE).texture;

  const mobile = typeof innerWidth !== 'undefined' && innerWidth < 768;
  const sombraRes = mobile ? CONFIG.SOMBRA_MAPA / 2 : CONFIG.SOMBRA_MAPA;

  const key = new THREE.DirectionalLight(CONFIG.LUZ_KEY.COR, CONFIG.LUZ_KEY.INT);
  key.position.set(...CONFIG.LUZ_KEY.POS).multiplyScalar(ESC);
  key.castShadow = true;
  key.shadow.mapSize.set(sombraRes, sombraRes);
  key.shadow.camera.left = -CONFIG.SOMBRA_ALCANCE * ESC; key.shadow.camera.right = CONFIG.SOMBRA_ALCANCE * ESC;
  key.shadow.camera.top = CONFIG.SOMBRA_ALCANCE * ESC; key.shadow.camera.bottom = -CONFIG.SOMBRA_ALCANCE * ESC;
  cena.add(key);
  const fill = new THREE.DirectionalLight(CONFIG.LUZ_FILL.COR, CONFIG.LUZ_FILL.INT);
  fill.position.set(...CONFIG.LUZ_FILL.POS).multiplyScalar(ESC);
  cena.add(fill);
  const rim = new THREE.DirectionalLight(CONFIG.LUZ_RIM.COR, CONFIG.LUZ_RIM.INT);
  rim.position.set(...CONFIG.LUZ_RIM.POS).multiplyScalar(ESC);
  cena.add(rim);

  const modelo = buildAl(makeLetterMaterial(), makeLetterMaterial());
  modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  cena.add(modelo);

  // Pose de repouso de cada letra — mesma lógica do Al3D.
  const malhaA = modelo.getObjectByName('letraA');
  const malhaL = modelo.getObjectByName('letraL');
  for (const malha of [malhaA, malhaL]) {
    malha.geometry.computeBoundingBox();
    const bb = malha.geometry.boundingBox;
    const tam = bb.getSize(new THREE.Vector3());
    malha.userData.centro = bb.getCenter(new THREE.Vector3());
    malha.userData.meia = new THREE.Vector2(
      Math.max(tam.x, 1e-3) / 2, Math.max(tam.y, 1e-3) / 2);
    malha.userData.repouso = new THREE.Vector3(malha.position.x, malha.position.y, malha.position.z);
    malha.userData.empurrao = new THREE.Vector3();
    malha.userData.tombo = new THREE.Vector3();
  }

  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.CHAO_TAM, CONFIG.CHAO_TAM),
    new THREE.ShadowMaterial({ opacity: CONFIG.CHAO_OPACIDADE })
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = CONFIG.CHAO_Y * ESC;
  chao.receiveShadow = true;
  cena.add(chao);

  // Hover-push: mesma matemática do Al3D. O ponteiro é normalizado pelo
  // retângulo do canvas (não pela janela), pois o canvas não é fullscreen.
  const raycaster = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2(-10, -10);
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const onLeave = () => ponteiro.set(-10, -10);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);

  const relogio = new THREE.Clock();
  const _alvoPos = new THREE.Vector3();
  const _rc = new THREE.Vector3();
  const RAD = Math.PI / 180;

  function atualizarEmpurrao(dt) {
    raycaster.setFromCamera(ponteiro, camera);
    const hitA = raycaster.intersectObject(malhaA, false)[0];
    const hitL = raycaster.intersectObject(malhaL, false)[0];
    const k = 1 - Math.exp(-dt / Math.max(CONFIG.PUSH.SUAV, 1e-4));
    for (const [malha, hit] of [[malhaA, hitA], [malhaL, hitL]]) {
      const ud = malha.userData;
      _alvoPos.set(0, 0, 0);
      let tx = 0, ty = 0, tz = 0;
      if (hit) {
        const pLocal = malha.worldToLocal(hit.point.clone());
        const ox = Math.max(-1, Math.min(1, (pLocal.x - ud.centro.x) / ud.meia.x));
        const oy = Math.max(-1, Math.min(1, (pLocal.y - ud.centro.y) / ud.meia.y));
        _alvoPos.set(ox * CONFIG.PUSH.TRANSL, oy * CONFIG.PUSH.TRANSL, 0);
        tx = -CONFIG.PUSH.PITCH * RAD * oy;
        ty = CONFIG.PUSH.PITCH * RAD * ox;
        tz = -CONFIG.PUSH.ROLL * RAD * ox;
      }
      ud.empurrao.lerp(_alvoPos, k);
      ud.tombo.x += (tx - ud.tombo.x) * k;
      ud.tombo.y += (ty - ud.tombo.y) * k;
      ud.tombo.z += (tz - ud.tombo.z) * k;
      const s = malha.scale.x;
      const c = ud.centro;
      malha.rotation.set(ud.tombo.x, ud.tombo.y, ud.tombo.z);
      _rc.copy(c).multiplyScalar(s).applyEuler(malha.rotation);
      malha.position.copy(ud.repouso).addScaledVector(c, s).add(ud.empurrao).sub(_rc);
    }
  }

  let tAtual = 0;
  let visivel = true;
  let observador = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observador = new IntersectionObserver((entries) => {
      visivel = entries[0].isIntersecting;
    });
    observador.observe(canvas);
  }

  function resize() {
    const w = Math.max(canvas.clientWidth, 1);
    const h = Math.max(canvas.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  let rafId = 0;
  (function loop() {
    rafId = requestAnimationFrame(loop);
    const dt = Math.min(relogio.getDelta(), 0.05);
    if (!visivel) return;
    applyProgress(tAtual, camera, alvo);
    atualizarEmpurrao(dt);
    renderer.render(cena, camera);
  })();
  resize();

  return {
    setProgress(t) {
      tAtual = Math.min(1, Math.max(0, t));
      applyProgress(tAtual, camera, alvo);
    },
    resize,
    dispose() {
      cancelAnimationFrame(rafId);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      if (observador) observador.disconnect();
      const liberados = new Set();
      cena.traverse(o => {
        if (o.geometry && !liberados.has(o.geometry)) { liberados.add(o.geometry); o.geometry.dispose(); }
        const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
        for (const m of mats) if (!liberados.has(m)) { liberados.add(m); m.dispose(); }
      });
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
