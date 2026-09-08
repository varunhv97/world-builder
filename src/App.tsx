import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from 'react'
import {
  DEFAULT_TERRAIN_OPTIONS,
  flattenTerrain,
  generateTerrainFromOptions,
  LOCAL_TERRAIN_DIMENSION,
  paintTerrain,
  sculptTerrain,
  smoothTerrain,
  type TerrainGenerationOptions,
  type TerrainPreset,
} from './domain/local-terrain'
import { recoverEditorState } from './domain/local-recovery'
import { createEditorFeature, type EditorFeature, type EditorFeatureKind, type TerrainCoordinate } from './domain/editor-features'
import { decodeEditorWorldSnapshot, encodeEditorWorldSnapshot } from './domain/loka/editor-snapshot'
import { activateWorld, addWorld, createEditorWorld, deleteWorld, replaceWorld, type EditorWorld, type LocalWorldLibrary } from './domain/editor-world'
import { recoverLocalWorldLibrary } from './domain/local-world-library'
import { WorldRenderer } from './rendering/WorldRenderer'
import './App.css'

const DIMENSION = LOCAL_TERRAIN_DIMENSION
const STORAGE_KEY = 'world-builder:editor-v2'
const LIBRARY_STORAGE_KEY = 'world-builder:local-library-v1'

type TerrainTool = 'raise' | 'lower' | 'smooth' | 'flatten' | 'paint'
type EditorTool = TerrainTool | EditorFeatureKind
type Material = 0 | 1 | 2

interface EditorSnapshot {
  readonly heights: number[]
  readonly materials: number[]
}

const MATERIALS: readonly { readonly id: Material; readonly label: string }[] = [
  { id: 0, label: 'Water' },
  { id: 1, label: 'Grass' },
  { id: 2, label: 'Desert' },
]

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const rendererRef = useRef<WorldRenderer | null>(null)
  const drawingRef = useRef(false)
  const flattenTargetRef = useRef(0)
  const recovered = recoverEditorState(localStorage.getItem(STORAGE_KEY), DIMENSION ** 2)
  const [library, setLibrary] = useState<LocalWorldLibrary>(() => recoverLocalWorldLibrary(localStorage.getItem(LIBRARY_STORAGE_KEY)) ?? createInitialLibrary(recovered))
  const initialWorld = library.worlds.find((world) => world.id === library.activeWorldId)!
  const [worldId, setWorldId] = useState(() => initialWorld.id)
  const [title, setTitle] = useState(() => initialWorld.title)
  const [createdAt, setCreatedAt] = useState(() => initialWorld.createdAt)
  const [generation, setGeneration] = useState<TerrainGenerationOptions>(() => initialWorld.generation)
  const [heights, setHeights] = useState(() => [...initialWorld.heights])
  const [materials, setMaterials] = useState<number[]>(() => [...initialWorld.materials])
  const [tool, setTool] = useState<EditorTool>('raise')
  const [material, setMaterial] = useState<Material>(1)
  const [brushRadius, setBrushRadius] = useState(2)
  const [brushStrength, setBrushStrength] = useState(0.7)
  const [gridVisible, setGridVisible] = useState(false)
  const [undo, setUndo] = useState<EditorSnapshot[]>([])
  const [redo, setRedo] = useState<EditorSnapshot[]>([])
  const [features, setFeatures] = useState<EditorFeature[]>(() => [...initialWorld.features])
  const [draftCoordinates, setDraftCoordinates] = useState<TerrainCoordinate[]>([])
  const activeSnapshot = useMemo<EditorWorld>(() => ({ id: worldId, title, createdAt, updatedAt: new Date().toISOString(), generation, heights, materials, features }), [createdAt, features, generation, heights, materials, title, worldId])

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return undefined
    const renderer = new WorldRenderer(canvas)
    rendererRef.current = renderer
    const resize = () => renderer.resize(canvas.clientWidth, canvas.clientHeight)
    resize()
    renderer.start()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => { observer.disconnect(); renderer.dispose(); rendererRef.current = null }
  }, [])

  useEffect(() => {
    rendererRef.current?.setTerrain({ dimension: DIMENSION, elevations: heights, materialIndices: materials })
    rendererRef.current?.setFeatures(features, DIMENSION, heights)
  }, [features, heights, materials])

  useEffect(() => {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(replaceWorld(library, activeSnapshot)))
  }, [activeSnapshot, library])

  const edit = (event: PointerEvent<HTMLCanvasElement>) => {
    const coordinate = rendererRef.current?.terrainCoordinateAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), DIMENSION)
    if (coordinate === undefined) return
    const { column, row } = coordinate
    if (tool === 'paint') {
      setMaterials((current) => paintTerrain(current, DIMENSION, column, row, material, brushRadius))
      return
    }
    setHeights((current) => {
      const strength = brushStrength
      if (tool === 'smooth') return smoothTerrain(current, DIMENSION, column, row, strength, brushRadius)
      if (tool === 'flatten') return flattenTerrain(current, DIMENSION, column, row, flattenTargetRef.current, strength, brushRadius)
      return sculptTerrain(current, DIMENSION, column, row, (tool === 'raise' ? 1 : -1) * 220 * strength, brushRadius)
    })
  }

  const beginStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    const coordinate = rendererRef.current?.terrainCoordinateAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), DIMENSION)
    if (coordinate === undefined) return
    if (isFeatureTool(tool)) {
      if (tool === 'point') {
        setFeatures((current) => [...current, createEditorFeature('point', [coordinate], current.length)])
      } else {
        setDraftCoordinates((current) => [...current, coordinate])
      }
      return
    }
    drawingRef.current = true
    rendererRef.current?.setSculpting(true)
    if (tool !== 'paint') rendererRef.current?.showBrushAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), brushRadius, DIMENSION)
    flattenTargetRef.current = heights[coordinate.row * DIMENSION + coordinate.column] ?? 0
    setUndo((history) => [...history, { heights, materials }])
    setRedo([])
    event.currentTarget.setPointerCapture(event.pointerId)
    edit(event)
  }

  const continueStroke = (event: PointerEvent<HTMLCanvasElement>) => {
    if (isTerrainTool(tool) && tool !== 'paint') rendererRef.current?.showBrushAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), brushRadius, DIMENSION)
    if (drawingRef.current) edit(event)
  }

  const endStroke = () => {
    drawingRef.current = false
    rendererRef.current?.setSculpting(false)
  }

  const restoreSnapshot = (snapshot: EditorSnapshot) => { setHeights(snapshot.heights); setMaterials(snapshot.materials) }
  const undoEdit = () => {
    const previous = undo.at(-1)
    if (previous === undefined) return
    setUndo((items) => items.slice(0, -1))
    setRedo((items) => [...items, { heights, materials }])
    restoreSnapshot(previous)
  }
  const redoEdit = () => {
    const next = redo.at(-1)
    if (next === undefined) return
    setRedo((items) => items.slice(0, -1))
    setUndo((items) => [...items, { heights, materials }])
    restoreSnapshot(next)
  }
  const regenerate = () => {
    if (!confirm('Regenerate terrain? This can be undone.')) return
    setUndo((items) => [...items, { heights, materials }])
    setRedo([])
    setHeights(generateTerrainFromOptions(generation))
    setMaterials(Array(DIMENSION ** 2).fill(1))
  }
  const finishFeature = () => {
    if (!isFeatureTool(tool) || tool === 'point') return
    const minimumPoints = tool === 'path' ? 2 : 3
    if (draftCoordinates.length < minimumPoints) return
    setFeatures((current) => [...current, createEditorFeature(tool, draftCoordinates, current.length)])
    setDraftCoordinates([])
  }
  const deleteFeature = (id: string) => {
    if (!confirm('Delete this feature? This cannot be undone yet.')) return
    setFeatures((current) => current.filter((feature) => feature.id !== id))
  }
  const exportWorld = () => {
    const bytes = encodeEditorWorldSnapshot(activeSnapshot)
    const contents = new Uint8Array(bytes)
    const url = URL.createObjectURL(new Blob([contents.buffer as ArrayBuffer], { type: 'application/octet-stream' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${title.trim().replaceAll(/[^a-z0-9]+/giu, '-').replaceAll(/^-|-$/gu, '') || 'world'}.loka`
    link.click()
    URL.revokeObjectURL(url)
  }
  const importWorld = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (file === undefined) return
    try {
      const imported = decodeEditorWorldSnapshot(new Uint8Array(await file.arrayBuffer()))
      const duplicate = library.worlds.some((world) => world.id === imported.id)
      const nextWorld = duplicate ? createEditorWorld({ title: imported.title, generation: imported.generation, heights: imported.heights, materials: imported.materials, features: imported.features }) : imported
      setLibrary((current) => addWorld(replaceWorld(current, activeSnapshot), nextWorld))
      loadWorld(nextWorld)
    } catch { alert('That file is not a valid, supported .loka world snapshot.') }
    event.currentTarget.value = ''
  }
  const loadWorld = (world: EditorWorld) => {
    setWorldId(world.id); setTitle(world.title); setCreatedAt(world.createdAt); setGeneration(world.generation); setHeights([...world.heights]); setMaterials([...world.materials]); setFeatures([...world.features]); setUndo([]); setRedo([]); setDraftCoordinates([])
  }
  const selectWorld = (nextId: string) => {
    const next = library.worlds.find((world) => world.id === nextId)
    if (next === undefined) return
    setLibrary((current) => activateWorld(replaceWorld(current, activeSnapshot), nextId))
    loadWorld(next)
  }
  const createWorld = () => {
    const next = createEditorWorld({ title: 'Untitled world', generation: { ...DEFAULT_TERRAIN_OPTIONS, seed: Math.floor(Math.random() * 2 ** 31) }, heights: generateTerrainFromOptions(DEFAULT_TERRAIN_OPTIONS), materials: Array(DIMENSION ** 2).fill(1), features: [] })
    setLibrary((current) => addWorld(replaceWorld(current, activeSnapshot), next))
    loadWorld(next)
  }
  const removeWorld = () => {
    if (library.worlds.length <= 1 || !confirm(`Delete ${title}? This cannot be undone.`)) return
    const nextLibrary = deleteWorld(replaceWorld(library, activeSnapshot), worldId)
    const nextWorld = nextLibrary.worlds.find((world) => world.id === nextLibrary.activeWorldId)!
    setLibrary(nextLibrary)
    loadWorld(nextWorld)
  }
  const setGenerationControl = <Key extends keyof TerrainGenerationOptions>(key: Key, value: TerrainGenerationOptions[Key]) => {
    setGeneration((current) => ({ ...current, [key]: value }))
  }

  const copy = isTerrainTool(tool) ? toolCopy(tool) : featureToolCopy(tool, draftCoordinates.length)
  return (
    <main className="app-shell">
      <header><div><p className="eyebrow">Local-first · autosaved</p><input className="world-title" aria-label="World title" value={title} onChange={(event) => setTitle(event.target.value.slice(0, 200))} /></div><div className="world-file-actions"><select aria-label="Active world" value={worldId} onChange={(event) => selectWorld(event.target.value)}>{library.worlds.map((world) => <option key={world.id} value={world.id}>{world.title}</option>)}</select><button type="button" className="quiet-action" onClick={createWorld}>New</button><button type="button" className="quiet-action" disabled={library.worlds.length <= 1} onClick={removeWorld}>Delete</button><button type="button" className="quiet-action" onClick={exportWorld}>Export .loka</button><button type="button" className="quiet-action" onClick={() => importInputRef.current?.click()}>Open .loka</button><input ref={importInputRef} className="visually-hidden" type="file" accept=".loka,application/octet-stream" onChange={importWorld} /></div></header>
      <section className="workspace">
        <nav className="tool-rail" aria-label="Terrain tools">
          <Tool active={tool === 'raise'} label="Raise" icon="↑" onClick={() => setTool('raise')} />
          <Tool active={tool === 'lower'} label="Lower" icon="↓" onClick={() => setTool('lower')} />
          <Tool active={tool === 'smooth'} label="Smooth" icon="≈" onClick={() => setTool('smooth')} />
          <Tool active={tool === 'flatten'} label="Flatten" icon="━" onClick={() => setTool('flatten')} />
          <Tool active={tool === 'paint'} label="Surface" icon="◒" onClick={() => setTool('paint')} />
          <Tool active={tool === 'point'} label="Point" icon="•" onClick={() => { setTool('point'); setDraftCoordinates([]) }} />
          <Tool active={tool === 'path'} label="Path" icon="⌁" onClick={() => { setTool('path'); setDraftCoordinates([]) }} />
          <Tool active={tool === 'area'} label="Area" icon="◇" onClick={() => { setTool('area'); setDraftCoordinates([]) }} />
          <Tool active={gridVisible} label="Grid" icon="#" onClick={() => setGridVisible((visible) => { const next = !visible; rendererRef.current?.setGridVisible(next); return next })} />
        </nav>
        <canvas ref={canvasRef} className="world-canvas" onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={endStroke} onPointerCancel={endStroke} onPointerLeave={() => rendererRef.current?.hideBrush()} />
        <aside className="inspector">
          <p className="inspector-kicker">Active tool</p><h2>{copy.title}</h2><p>{copy.description}</p>
          {isTerrainTool(tool) && <label className="brush-control">Brush area <output>{brushRadius}</output><input aria-label="Brush area" type="range" min="1" max="6" value={brushRadius} onChange={(event) => setBrushRadius(Number(event.target.value))} /></label>}
          {isTerrainTool(tool) && tool !== 'paint' && <label className="brush-control">Brush strength <output>{Math.round(brushStrength * 100)}%</output><input aria-label="Brush strength" type="range" min="0.1" max="1" step="0.1" value={brushStrength} onChange={(event) => setBrushStrength(Number(event.target.value))} /></label>}
          {tool === 'paint' && <fieldset className="material-picker"><legend>Surface material</legend>{MATERIALS.map((option) => <label key={option.id}><input type="radio" name="material" checked={material === option.id} onChange={() => setMaterial(option.id)} />{option.label}</label>)}</fieldset>}
          {isFeatureTool(tool) && tool !== 'point' && <button className="primary-action" type="button" disabled={draftCoordinates.length < (tool === 'path' ? 2 : 3)} onClick={finishFeature}>Finish {tool}</button>}
          {features.length > 0 && <section className="feature-list" aria-label="World features"><h3>Features</h3>{features.map((feature) => <div key={feature.id}><span>{feature.name}</span><button type="button" onClick={() => deleteFeature(feature.id)}>Delete</button></div>)}</section>}
          <div className="action-row"><button className="quiet-action" type="button" disabled={!undo.length} onClick={undoEdit}>Undo</button><button className="quiet-action" type="button" disabled={!redo.length} onClick={redoEdit}>Redo</button></div>
          <GeneratorControls generation={generation} onChange={setGenerationControl} onRegenerate={regenerate} />
        </aside>
      </section>
    </main>
  )
}

function toolCopy(tool: TerrainTool): { readonly title: string; readonly description: string } {
  const copy: Record<TerrainTool, { readonly title: string; readonly description: string }> = {
    raise: { title: 'Raise terrain', description: 'Hover to preview the brush, then press and drag to build land upward.' },
    lower: { title: 'Lower terrain', description: 'Hover to preview the brush, then press and drag to carve land downward.' },
    smooth: { title: 'Smooth terrain', description: 'Press and drag to soften sharp terrain within the selected brush.' },
    flatten: { title: 'Flatten terrain', description: 'Press and drag to level terrain toward the elevation where the stroke begins.' },
    paint: { title: 'Surface paint', description: 'Choose a material, then press and drag to paint the selected area.' },
  }
  return copy[tool]
}

function featureToolCopy(tool: EditorFeatureKind, draftLength: number): { readonly title: string; readonly description: string } {
  if (tool === 'point') return { title: 'Place landmark', description: 'Click a location to add a landmark point.' }
  const minimumPoints = tool === 'path' ? 2 : 3
  return { title: tool === 'path' ? 'Draw path' : 'Draw region', description: `${draftLength} point${draftLength === 1 ? '' : 's'} selected. Click terrain to add points, then finish when at least ${minimumPoints} are selected.` }
}

function isTerrainTool(tool: EditorTool): tool is TerrainTool {
  return ['raise', 'lower', 'smooth', 'flatten', 'paint'].includes(tool)
}

function isFeatureTool(tool: EditorTool): tool is EditorFeatureKind {
  return ['point', 'path', 'area'].includes(tool)
}

function Tool({ active, icon, label, onClick }: { readonly active: boolean; readonly icon: string; readonly label: string; readonly onClick: () => void }) {
  return <button className={active ? 'tool-button is-active' : 'tool-button'} type="button" aria-pressed={active} onClick={onClick}><span>{icon}</span>{label}</button>
}

function GeneratorControls({ generation, onChange, onRegenerate }: { readonly generation: TerrainGenerationOptions; readonly onChange: <Key extends keyof TerrainGenerationOptions>(key: Key, value: TerrainGenerationOptions[Key]) => void; readonly onRegenerate: () => void }) {
  return <details className="generator-controls"><summary>Generation controls</summary><label>Preset<select value={generation.preset} onChange={(event) => onChange('preset', event.target.value as TerrainPreset)}><option value="archipelago">Archipelago</option><option value="highlands">Highlands</option><option value="plains">Plains</option></select></label><label>Seed<input aria-label="Seed" type="number" value={generation.seed} onChange={(event) => onChange('seed', Number(event.target.value))} /></label><RangeControl label="Landmass" value={generation.landmass} onChange={(value) => onChange('landmass', value)} /><RangeControl label="Mountains" value={generation.mountainIntensity} onChange={(value) => onChange('mountainIntensity', value)} /><RangeControl label="Water level" value={generation.waterLevel} onChange={(value) => onChange('waterLevel', value)} /><RangeControl label="Roughness" value={generation.roughness} onChange={(value) => onChange('roughness', value)} /><button className="primary-action" type="button" onClick={onRegenerate}>Regenerate terrain</button></details>
}

function RangeControl({ label, value, onChange }: { readonly label: string; readonly value: number; readonly onChange: (value: number) => void }) {
  return <label>{label}<input aria-label={label} type="range" min="0" max="1" step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>
}

function createInitialLibrary(recovered: ReturnType<typeof recoverEditorState>): LocalWorldLibrary {
  const world = createEditorWorld({ title: recovered?.title ?? 'Untitled world', generation: recovered?.generation ?? DEFAULT_TERRAIN_OPTIONS, heights: recovered?.heights ?? generateTerrainFromOptions(DEFAULT_TERRAIN_OPTIONS), materials: recovered?.materials ?? Array(DIMENSION ** 2).fill(1), features: recovered?.features ?? [] })
  return { version: 1, activeWorldId: world.id, worlds: [world] }
}

export default App
