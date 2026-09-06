import * as THREE from 'three'

export interface RenderTerrain {
  readonly dimension: number
  readonly elevations: readonly number[]
}

/** Thin project-owned boundary around Three.js for the editor's terrain scene. */
export class WorldRenderer {
  readonly #renderer: THREE.WebGLRenderer
  readonly #scene = new THREE.Scene()
  readonly #camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1_000)
  #terrain?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>

  constructor(canvas: HTMLCanvasElement) {
    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.#scene.background = new THREE.Color('#cdd9d5')
    this.#scene.add(new THREE.HemisphereLight('#fff5de', '#31423b', 2.2))
    const light = new THREE.DirectionalLight('#fff0c2', 2.5)
    light.position.set(8, 10, 6)
    this.#scene.add(light)
    this.#camera.position.set(11, 12, 11)
    this.#camera.lookAt(0, 0, 0)
  }

  setTerrain(terrain: RenderTerrain): void {
    this.#terrain?.geometry.dispose(); this.#terrain?.material.dispose(); this.#scene.remove(this.#terrain!)
    const geometry = new THREE.PlaneGeometry(10, 10, terrain.dimension - 1, terrain.dimension - 1)
    const positions = geometry.attributes['position']
    if (positions === undefined) throw new Error('Terrain geometry has no position attribute.')
    for (let index = 0; index < positions.count; index += 1) positions.setZ(index, terrain.elevations[index]! / 500)
    positions.needsUpdate = true; geometry.rotateX(-Math.PI / 2); geometry.computeVertexNormals()
    this.#terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#628c58', flatShading: true }))
    this.#scene.add(this.#terrain)
  }

  render(width: number, height: number): void {
    this.#renderer.setSize(width, height, false); this.#camera.aspect = width / height; this.#camera.updateProjectionMatrix(); this.#renderer.render(this.#scene, this.#camera)
  }

  dispose(): void { this.#terrain?.geometry.dispose(); this.#terrain?.material.dispose(); this.#renderer.dispose() }
}
