import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface RenderTerrain {
  readonly dimension: number
  readonly elevations: readonly number[]
  readonly materialIndices?: readonly number[]
}

/** Thin project-owned boundary around Three.js for the editor's terrain scene. */
export class WorldRenderer {
  readonly #renderer: THREE.WebGLRenderer
  readonly #scene = new THREE.Scene()
  readonly #camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1_000)
  readonly #controls: OrbitControls
  readonly #substrate: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>
  #terrain?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
  #animationFrame?: number
  #width = 1
  #height = 1

  constructor(canvas: HTMLCanvasElement) {
    this.#renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.#scene.background = new THREE.Color('#cdd9d5')
    this.#scene.add(new THREE.HemisphereLight('#fff5de', '#31423b', 2.2))
    const light = new THREE.DirectionalLight('#fff0c2', 2.5)
    light.position.set(8, 10, 6)
    this.#scene.add(light)
    this.#substrate = new THREE.Mesh(
      new THREE.BoxGeometry(10.18, 0.72, 10.18),
      new THREE.MeshStandardMaterial({ color: '#4c3428', roughness: 0.95 }),
    )
    this.#substrate.position.y = -0.5
    this.#scene.add(this.#substrate)
    this.#camera.position.set(11, 12, 11)
    this.#camera.lookAt(0, 0, 0)
    this.#controls = new OrbitControls(this.#camera, canvas)
    this.#controls.enableDamping = true
    this.#controls.minPolarAngle = Math.PI * 0.18
    this.#controls.maxPolarAngle = Math.PI * 0.47
    this.#controls.target.set(0, 0, 0)
  }

  setTerrain(terrain: RenderTerrain): void {
    this.#terrain?.geometry.dispose(); this.#terrain?.material.dispose(); this.#scene.remove(this.#terrain!)
    const geometry = new THREE.PlaneGeometry(10, 10, terrain.dimension - 1, terrain.dimension - 1)
    const positions = geometry.attributes['position']
    if (positions === undefined) throw new Error('Terrain geometry has no position attribute.')
    for (let index = 0; index < positions.count; index += 1) positions.setZ(index, terrain.elevations[index]! / 500)
    positions.needsUpdate = true; geometry.rotateX(-Math.PI / 2); geometry.computeVertexNormals()
    const colors = new Float32Array(positions.count * 3)
    for (let index = 0; index < positions.count; index += 1) {
      const material = terrain.materialIndices?.[index] ?? 1
      new THREE.Color(material === 0 ? '#3d79a8' : material === 2 ? '#a78a55' : '#628c58').toArray(colors, index * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.#terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }))
    this.#scene.add(this.#terrain)
  }

  resize(width: number, height: number): void {
    this.#width = Math.max(1, width)
    this.#height = Math.max(1, height)
    this.#renderer.setSize(this.#width, this.#height, false)
    this.#camera.aspect = this.#width / this.#height
    this.#camera.updateProjectionMatrix()
  }

  start(): void {
    if (this.#animationFrame !== undefined) return
    const renderFrame = () => {
      this.#controls.update()
      this.#renderer.render(this.#scene, this.#camera)
      this.#animationFrame = requestAnimationFrame(renderFrame)
    }
    renderFrame()
  }

  dispose(): void {
    if (this.#animationFrame !== undefined) cancelAnimationFrame(this.#animationFrame)
    this.#controls.dispose(); this.#terrain?.geometry.dispose(); this.#terrain?.material.dispose(); this.#substrate.geometry.dispose(); this.#substrate.material.dispose(); this.#renderer.dispose()
  }
}
