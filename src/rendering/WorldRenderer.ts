import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { EditorFeature } from '../domain/editor-features'

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
  readonly #gridMaterial = new THREE.LineBasicMaterial({ color: '#543b76', depthTest: false, depthWrite: false, opacity: 0.9, transparent: true })
  readonly #grid = new THREE.LineSegments(new THREE.BufferGeometry(), this.#gridMaterial)
  readonly #brush = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1, 48),
    new THREE.MeshBasicMaterial({ color: '#563b91', depthTest: false, depthWrite: false, opacity: 0.95, side: THREE.DoubleSide, transparent: true }),
  )
  readonly #features = new THREE.Group()
  #terrain?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>
  #animationFrame?: number
  #width = 1
  #height = 1
  readonly #raycaster = new THREE.Raycaster()
  readonly #pointer = new THREE.Vector2()

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
    this.#substrate.position.y = -1.15
    this.#scene.add(this.#substrate)
    this.#grid.visible = false
    this.#grid.renderOrder = 1
    this.#scene.add(this.#grid)
    this.#brush.rotation.x = -Math.PI / 2
    this.#brush.renderOrder = 2
    this.#brush.visible = false
    this.#scene.add(this.#brush)
    this.#scene.add(this.#features)
    this.#camera.position.set(11, 12, 11)
    this.#camera.lookAt(0, 0, 0)
    this.#controls = new OrbitControls(this.#camera, canvas)
    this.#controls.enableDamping = true
    this.#controls.enablePan = false
    this.#controls.minDistance = 7
    this.#controls.maxDistance = 20
    this.#controls.minPolarAngle = Math.PI * 0.18
    this.#controls.maxPolarAngle = Math.PI * 0.47
    this.#controls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE
    this.#controls.target.set(0, 0, 0)
  }

  setSculpting(isSculpting: boolean): void {
    this.#controls.enabled = !isSculpting
  }

  setGridVisible(isVisible: boolean): void {
    this.#grid.visible = isVisible
  }

  showBrushAt(clientX: number, clientY: number, bounds: DOMRect, radius: number, dimension: number): void {
    const hit = this.#terrainHitAt(clientX, clientY, bounds)
    if (hit === undefined) { this.hideBrush(); return }
    this.#brush.position.copy(hit.point)
    this.#brush.position.y += 0.05
    const worldRadius = radius * (10 / (dimension - 1))
    this.#brush.scale.setScalar(worldRadius)
    this.#brush.visible = true
  }

  hideBrush(): void {
    this.#brush.visible = false
  }

  /** Rebuilds only disposable scene representations; canonical feature data stays in the domain layer. */
  setFeatures(features: readonly EditorFeature[], dimension: number, elevations: readonly number[]): void {
    disposeGroup(this.#features)
    for (const feature of features) {
      const points = feature.coordinates.map((coordinate) => terrainPosition(coordinate.column, coordinate.row, dimension, elevations))
      if (feature.kind === 'point') {
        const point = points[0]
        if (point === undefined) continue
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: '#f3c968', emissive: '#4a3510', emissiveIntensity: 0.25 }))
        marker.position.copy(point)
        this.#features.add(marker)
        continue
      }
      if (points.length < (feature.kind === 'area' ? 3 : 2)) continue
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ color: feature.kind === 'area' ? '#d8a14d' : '#4c81b4', depthTest: false })
      const line = feature.kind === 'area' ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material)
      line.renderOrder = 3
      this.#features.add(line)
    }
  }

  setTerrain(terrain: RenderTerrain): void {
    this.#terrain?.geometry.dispose(); this.#terrain?.material.dispose(); this.#scene.remove(this.#terrain!)
    const geometry = new THREE.PlaneGeometry(10, 10, terrain.dimension - 1, terrain.dimension - 1)
    const positions = geometry.attributes['position']
    if (positions === undefined) throw new Error('Terrain geometry has no position attribute.')
    for (let index = 0; index < positions.count; index += 1) positions.setZ(index, terrain.elevations[index]! / 500)
    positions.needsUpdate = true; geometry.rotateX(-Math.PI / 2); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    const colors = new Float32Array(positions.count * 3)
    for (let index = 0; index < positions.count; index += 1) {
      const material = terrain.materialIndices?.[index] ?? 1
      new THREE.Color(material === 0 ? '#3d79a8' : material === 2 ? '#a78a55' : '#628c58').toArray(colors, index * 3)
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.#terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true }))
    this.#scene.add(this.#terrain)
    this.#updateGrid(terrain)
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

  terrainCoordinateAt(clientX: number, clientY: number, bounds: DOMRect, dimension: number): { readonly column: number; readonly row: number } | undefined {
    const hit = this.#terrainHitAt(clientX, clientY, bounds)
    if (hit?.uv === undefined) return undefined
    return {
      column: Math.min(dimension - 1, Math.max(0, Math.floor(hit.uv.x * dimension))),
      row: Math.min(dimension - 1, Math.max(0, Math.floor((1 - hit.uv.y) * dimension))),
    }
  }

  #terrainHitAt(clientX: number, clientY: number, bounds: DOMRect): THREE.Intersection | undefined {
    if (this.#terrain === undefined) return undefined
    this.#pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1
    this.#pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1
    this.#raycaster.setFromCamera(this.#pointer, this.#camera)
    return this.#raycaster.intersectObject(this.#terrain, false)[0]
  }

  #updateGrid(terrain: RenderTerrain): void {
    const gridLines = 8
    const vertices: number[] = []
    const addPoint = (column: number, row: number) => {
      const index = row * terrain.dimension + column
      vertices.push(-5 + (column / (terrain.dimension - 1)) * 10, terrain.elevations[index]! / 500 + 0.04, -5 + (row / (terrain.dimension - 1)) * 10)
    }
    for (let line = 0; line <= gridLines; line += 1) {
      const index = Math.round((line / gridLines) * (terrain.dimension - 1))
      for (let point = 0; point < terrain.dimension - 1; point += 1) { addPoint(point, index); addPoint(point + 1, index) }
      for (let point = 0; point < terrain.dimension - 1; point += 1) { addPoint(index, point); addPoint(index, point + 1) }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    this.#grid.geometry.dispose()
    this.#grid.geometry = geometry
  }

  dispose(): void {
    if (this.#animationFrame !== undefined) cancelAnimationFrame(this.#animationFrame)
    this.#controls.dispose(); this.#terrain?.geometry.dispose(); this.#terrain?.material.dispose(); this.#substrate.geometry.dispose(); this.#substrate.material.dispose(); this.#grid.geometry.dispose(); this.#gridMaterial.dispose(); this.#brush.geometry.dispose(); (this.#brush.material as THREE.Material).dispose(); disposeGroup(this.#features); this.#renderer.dispose()
  }
}

function terrainPosition(column: number, row: number, dimension: number, elevations: readonly number[]): THREE.Vector3 {
  const boundedColumn = Math.max(0, Math.min(dimension - 1, column))
  const boundedRow = Math.max(0, Math.min(dimension - 1, row))
  return new THREE.Vector3(-5 + (boundedColumn / (dimension - 1)) * 10, elevations[boundedRow * dimension + boundedColumn]! / 500 + 0.09, -5 + (boundedRow / (dimension - 1)) * 10)
}

function disposeGroup(group: THREE.Group): void {
  for (const object of group.children) {
    const mesh = object as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>
    mesh.geometry?.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose())
    else mesh.material?.dispose()
  }
  group.clear()
}
