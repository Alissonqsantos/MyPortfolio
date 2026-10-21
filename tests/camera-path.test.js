import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CHAPTERS, poseAt } from '../src/al/choreography.js'
import { buildAl } from '../src/al/geometry.js'

// Regra permanente: a câmera (a "tela") nunca entra nas letras —
// nem nas poses, nem em nenhum ponto da transição entre elas.
const MARGEM = 1.0

function caixaDoAl() {
  const grupo = buildAl(new THREE.MeshBasicMaterial(), new THREE.MeshBasicMaterial())
  const bb = new THREE.Box3().setFromObject(grupo)
  bb.expandByScalar(MARGEM)
  return bb
}

const dentro = (p, bb) =>
  p[0] >= bb.min.x && p[0] <= bb.max.x &&
  p[1] >= bb.min.y && p[1] <= bb.max.y &&
  p[2] >= bb.min.z && p[2] <= bb.max.z

describe('caminho da câmera', () => {
  it('as 5 poses ficam fora das letras (margem 1.0)', () => {
    const bb = caixaDoAl()
    for (const c of CHAPTERS) {
      expect(dentro(c.pose.pos, bb), `capítulo ${c.n} ${c.word}`).toBe(false)
    }
  })
  it('a transição entre capítulos nunca entra nas letras (400 amostras)', () => {
    const bb = caixaDoAl()
    for (let i = 0; i <= 400; i++) {
      const t = i / 400
      const p = poseAt(t)
      expect(dentro(p.pos, bb), `t=${t.toFixed(3)}`).toBe(false)
    }
  })
})
