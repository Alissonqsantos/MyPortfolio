import { describe, it, expect } from 'vitest'
import * as THREE from 'three'

describe('ambiente', () => {
  it('three r160 carrega e cria uma câmera', () => {
    const c = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    expect(c.fov).toBe(35)
  })
})
