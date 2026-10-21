import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  SATS, configSats, rng, raioNDC, alturaAparente, projetarEntrada,
  sortearLayout, montarContexto, baseEntrada, ndcParaMundo, cobreEmCapitulo,
  posicaoPainel, rotacaoPainel, formaArredondada, geometriaLaje, atualizarSatelites,
} from '../src/al/satelites.js';
import { buildAl } from '../src/al/geometry.js';
import { poseAt, CHAPTERS } from '../src/al/choreography.js';

const MARGEM = 1.0; // mesma regra da câmera: 1.0 da bounding box
const SEEDS = [1, 2, 3, 11, 77, 1234, 55555, 999999];

function modeloAl() {
  const mat = new THREE.MeshBasicMaterial();
  return buildAl(mat, mat);
}

function caixaDasLetras(modelo) {
  return new THREE.Box3().setFromObject(modelo);
}

function distCaixa(p, box) {
  const dx = Math.max(box.min.x - p[0], 0, p[0] - box.max.x);
  const dy = Math.max(box.min.y - p[1], 0, p[1] - box.max.y);
  const dz = Math.max(box.min.z - p[2], 0, p[2] - box.max.z);
  return Math.hypot(dx, dy, dz);
}

// cenário completo (igual ao buildSatelites): contexto com modelo real +
// sorteio com rejeição, separação e anti-cobertura
function cenario(seed, cfg = configSats({}, false)) {
  const modelo = modeloAl();
  const box = caixaDasLetras(modelo);
  const dist = (p) => distCaixa(p, box);
  const ctx = montarContexto(null, dist, modelo);
  const lay = sortearLayout(seed, ctx, cfg);
  return { ctx, b: ctx.b, lay, box, cfg };
}

function ndcDe(cam, p) {
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(cam);
  return [v.x, v.y, v.z];
}

describe('satelites', () => {
  it('4 painéis com tamanhos variados (destroços, não clones)', () => {
    expect(SATS.PAINEIS).toHaveLength(4);
    const tams = SATS.PAINEIS.map((p) => p.tam.join('x'));
    expect(new Set(tams).size).toBeGreaterThan(1);
  });

  it('configSats: padrões sem env + sobrescrita (inclui SEED)', () => {
    const base = configSats({}, false);
    expect(base).toMatchObject({ visivel: true, seed: null, tam: 1, raio: 0.09, tombo: 1, deriva: 1, brilho: 0.22 });
    const alt = configSats({ VITE_SATS_SEED: '42', VITE_SATS_TOMBO: '0', VITE_SATS_VISIVEL: 'false' });
    expect(alt.seed).toBe(42);
    expect(alt.tombo).toBe(0);
    expect(alt.visivel).toBe(false);
  });

  it('rng determinístico: mesma seed = mesma sequência', () => {
    const a = rng(7), b = rng(7);
    const sa = Array.from({ length: 5 }, () => a());
    const sb = Array.from({ length: 5 }, () => b());
    expect(sa).toEqual(sb);
    expect(rng(8)()).not.toBe(sa[0]);
  });

  it('layout: casca esférica 7..11; k=0,1 na faixa em quadrantes diferentes', () => {
    for (const seed of [1, 123, 99999]) {
      const lay = sortearLayout(seed);
      expect(lay).toHaveLength(4);
      for (let k = 0; k < 4; k++) {
        const d = lay[k];
        const r = Math.hypot(d.P[0], d.P[1], d.P[2]);
        // raio-origem pode ficar abaixo de CASCA_MIN pelo achatamento Y
        expect(r).toBeGreaterThanOrEqual(SATS.CASCA_MIN * SATS.ACHATA_Y - 1e-9);
        expect(r).toBeLessThanOrEqual(SATS.CASCA_MAX + 1e-9);
        expect(d.P).toHaveLength(3);
        expect(d.nch).toBeGreaterThanOrEqual(k < 2 ? SATS.MIN_CH : 1);
      }
      // k=0,1: um por quadrante do quadro (sinais diferentes)
      const q0 = `${Math.sign(lay[0].nx)},${Math.sign(lay[0].ny)}`;
      const q1 = `${Math.sign(lay[1].nx)},${Math.sign(lay[1].ny)}`;
      expect(q0).not.toBe(q1);
      // k=3: sempre na metade da frente (z>0 por construção)
      expect(lay[3].P[2]).toBeGreaterThan(0);
    }
  });

  it('layout determinístico por seed; seeds diferentes espalham diferente', () => {
    const a = sortearLayout(5).map((d) => d.P);
    expect(sortearLayout(5).map((d) => d.P)).toEqual(a);
    expect(sortearLayout(6).map((d) => d.P)).not.toEqual(a);
  });

  it('≥2 visíveis na entrada, em quadrantes diferentes, sem cobrir o Al', () => {
    for (const seed of SEEDS) {
      const { ctx, lay, cfg } = cenario(seed);
      const vis = lay.filter((d) => d.inBand);
      expect(vis.length).toBeGreaterThanOrEqual(2);
      const quads = new Set(vis.map((d) => `${Math.sign(d.nx)},${Math.sign(d.ny)}`));
      expect(quads.size).toBeGreaterThanOrEqual(2);
      for (const d of vis) {
        expect(Math.abs(d.nx)).toBeGreaterThanOrEqual(SATS.NX_MIN);
        expect(Math.abs(d.nx)).toBeLessThanOrEqual(SATS.NX_MAX);
        expect(Math.abs(d.ny)).toBeGreaterThanOrEqual(SATS.NY_MIN);
        expect(Math.abs(d.ny)).toBeLessThanOrEqual(SATS.NY_MAX);
        const k = lay.indexOf(d);
        expect(alturaAparente(k, d.z, ctx.b, cfg.tam)).toBeLessThanOrEqual(SATS.ALT_MAX_ENTRADA + 1e-9);
      }
      // k=0,1 (abertura) aparecem em ≥2 capítulos; k=2,3 (livres) em ≥1
      for (let k = 0; k < 4; k++) expect(lay[k].nch).toBeGreaterThanOrEqual(k < 2 ? SATS.MIN_CH : 1);
    }
  });

  it('nunca cobre as letras em nenhum capítulo (8 seeds)', () => {
    for (const seed of SEEDS) {
      const { ctx, lay, cfg } = cenario(seed);
      for (let k = 0; k < 4; k++) {
        expect(cobreEmCapitulo(ctx, k, lay[k].P, cfg.tam)).toBe(false);
      }
    }
  });

  it('margem 1.0 das letras com deriva, 8 seeds × 3min', () => {
    for (const seed of SEEDS) {
      const { b, lay, box } = cenario(seed);
      for (let i = 0; i < 4; i++) {
        for (let t = 0; t <= 180; t += 15) {
          expect(distCaixa(posicaoPainel(b, lay[i], t), box)).toBeGreaterThanOrEqual(MARGEM);
        }
      }
    }
  });

  it('SEM sobreposição: círculos NDC nunca se tocam, 8 seeds', () => {
    for (const seed of SEEDS) {
      const { ctx, b, lay, cfg } = cenario(seed);
      // nos capítulos onde ambos estão no quadro, os círculos NDC não se tocam
      for (const cam of ctx.chapterCams) {
        const pts = lay.map((d, k) => {
          const p = new THREE.Vector3(...posicaoPainel(b, d, 0, cfg)).project(cam);
          const dist = cam.position.distanceTo(new THREE.Vector3(...posicaoPainel(b, d, 0, cfg)));
          return { x: p.x, y: p.y, z: p.z, r: raioNDC(k, dist, b, cfg.tam) };
        });
        for (let i = 0; i < 4; i++) {
          for (let j = i + 1; j < 4; j++) {
            if (pts[i].z >= 1 || pts[j].z >= 1) continue;
            if (Math.abs(pts[i].x) > 1 || Math.abs(pts[j].x) > 1) continue;
            if (Math.abs(pts[i].y) > 1 || Math.abs(pts[j].y) > 1) continue;
            const centro = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
            expect(centro).toBeGreaterThan(pts[i].r + pts[j].r);
          }
        }
      }
    }
  });

  it('câmera jamais se aproxima (≥ 4.5 em 21 poses × 8 seeds)', () => {
    for (const seed of SEEDS) {
      const { ctx, b, lay } = cenario(seed);
      for (const q of ctx.camPos) {
        for (let i = 0; i < 4; i++) {
          const p = posicaoPainel(b, lay[i], 7);
          const d = Math.hypot(q.x - p[0], q.y - p[1], q.z - p[2]);
          expect(d).toBeGreaterThanOrEqual(SATS.CAM_MIN);
        }
      }
    }
  });

  it('tombo bem lento (≤ 0.01 rad/s por eixo) e linear', () => {
    for (const p of SATS.PAINEIS) {
      for (const v of p.vel) expect(Math.abs(v)).toBeLessThanOrEqual(0.01);
    }
    const lay = sortearLayout(3);
    for (let i = 0; i < 4; i++) {
      const r0 = rotacaoPainel(lay[i], i, 10), r1 = rotacaoPainel(lay[i], i, 20);
      const vel = SATS.PAINEIS[i].vel;
      for (let a = 0; a < 3; a++) expect(r1[a] - r0[a]).toBeCloseTo(vel[a] * 10, 9);
    }
  });

  it('tombo 0 congela o giro; deriva 0 fixa na base da casca', () => {
    const cfg = configSats({ VITE_SATS_TOMBO: '0', VITE_SATS_DERIVA: '0' }, false);
    const { b } = cenario(9);
    const lay = sortearLayout(9);
    expect(rotacaoPainel(lay[0], 0, 999, cfg)).toEqual(lay[0].rot);
    const p = posicaoPainel(b, lay[0], 999, cfg);
    expect(p[0]).toBeCloseTo(lay[0].P[0], 9);
    expect(p[1]).toBeCloseTo(lay[0].P[1], 9);
    expect(p[2]).toBeCloseTo(lay[0].P[2], 9);
  });

  it('formaArredondada fecha dentro do retângulo; raio recua o canto', () => {
    const pts = formaArredondada(1.7, 0.95, 0.09).getPoints(48);
    expect(pts.length).toBeGreaterThan(32);
    for (const p of pts) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.85 + 1e-9);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(0.475 + 1e-9);
    }
    const canto = formaArredondada(1.7, 0.95, 0).getPoints(48)
      .reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);
    const red = pts.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), 0);
    expect(red).toBeLessThan(canto);
  });

  it('geometriaLaje: laje fina centrada com 2 grupos de material', () => {
    const geo = geometriaLaje(1.7, 0.95, 0.09, 0.035);
    expect(geo.groups).toHaveLength(2);
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.035, 5);
    expect((bb.max.z + bb.min.z) / 2).toBeCloseTo(0, 5);
  });

  it('atualizarSatelites: t null congela tudo; t move posição e giro', () => {
    const { b } = cenario(4);
    const cfg = configSats({}, false);
    const lay = sortearLayout(4);
    const mk = () => ({
      userData: {
        cfg, base: b,
        sats: [{ mesh: { position: new THREE.Vector3(0, 0, 0), rotation: new THREE.Euler() }, def: lay[0] }],
      },
    });
    const g = mk();
    atualizarSatelites(g, null);
    expect(g.userData.sats[0].mesh.position.length()).toBe(0);
    atualizarSatelites(g, 30);
    const m = g.userData.sats[0].mesh;
    const p = posicaoPainel(b, lay[0], 30), r = rotacaoPainel(lay[0], 0, 30);
    expect([m.position.x, m.position.y, m.position.z]).toEqual(
      expect.arrayContaining(p.map((v) => expect.closeTo(v, 5)))
    );
    expect([m.rotation.x, m.rotation.y, m.rotation.z]).toEqual(
      expect.arrayContaining(r.map((v) => expect.closeTo(v, 5)))
    );
  });
});
