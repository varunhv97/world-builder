import { useEffect, useRef, useState } from 'react'
import { WorldRenderer } from './rendering/WorldRenderer'
import { generateTerrain, LOCAL_TERRAIN_DIMENSION, sculptTerrain } from './domain/local-terrain'
import { recoverTerrain } from './domain/local-recovery'
import './App.css'

const DIMENSION = LOCAL_TERRAIN_DIMENSION
const STORAGE_KEY = 'world-builder:milestone-1'


function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WorldRenderer | null>(null)
  const [heights, setHeights] = useState<number[]>(() => recoverTerrain(localStorage.getItem(STORAGE_KEY), DIMENSION ** 2) ?? generateTerrain(Date.now()))
  const [undo, setUndo] = useState<number[][]>([]); const [redo, setRedo] = useState<number[][]>([])
  const [paintMode, setPaintMode] = useState(false)
  const [featureMode, setFeatureMode] = useState<'point' | 'path' | 'area'>('point')
  const [materials, setMaterials] = useState<number[]>(() => Array(DIMENSION ** 2).fill(1))

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const renderer = new WorldRenderer(canvas); rendererRef.current = renderer
    const draw = () => renderer.render(canvas.clientWidth, canvas.clientHeight)
    draw(); const observer = new ResizeObserver(draw); observer.observe(canvas)
    return () => { observer.disconnect(); renderer.dispose() }
  }, [])
  useEffect(() => { rendererRef.current?.setTerrain({ dimension: DIMENSION, elevations: heights, materialIndices: materials }); localStorage.setItem(STORAGE_KEY, JSON.stringify({ heights })); rendererRef.current?.render(canvasRef.current?.clientWidth ?? 1, canvasRef.current?.clientHeight ?? 1) }, [heights, materials])
  const sculpt = (event: React.PointerEvent<HTMLCanvasElement>, delta: number) => {
    const rect = event.currentTarget.getBoundingClientRect(); const x = Math.min(DIMENSION - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * DIMENSION))); const y = Math.min(DIMENSION - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * DIMENSION)))
    if (paintMode) { setMaterials((current) => current.map((material, index) => index === y * DIMENSION + x ? (material + 1) % 3 : material)); return }
    setUndo((history) => [...history, heights]); setRedo([]); setHeights((current) => sculptTerrain(current, DIMENSION, x, y, delta))
  }
  return <main className="app-shell"><header><p className="eyebrow">Local-first · autosaved</p><h1>World Builder</h1></header><section className="workspace"><nav aria-label="Tools"><button type="button" aria-pressed={!paintMode} onClick={() => setPaintMode(false)}>Sculpt</button><button type="button" aria-pressed={paintMode} onClick={() => setPaintMode(true)}>Surface</button><button type="button" onClick={() => setFeatureMode('point')}>Point</button><button type="button" onClick={() => setFeatureMode('path')}>River</button><button type="button" onClick={() => setFeatureMode('area')}>Area</button></nav><canvas ref={canvasRef} className="world-canvas" onPointerDown={(event) => sculpt(event, event.shiftKey ? -35 : 35)} /><aside><h2>{paintMode ? 'Surface paint' : 'Terrain sculpt'}</h2><p>{paintMode ? 'Click terrain to cycle grass, water, and desert.' : 'Click to raise terrain. Shift-click to lower it.'}</p><label>Feature tool<select value={featureMode} onChange={(event) => setFeatureMode(event.target.value as typeof featureMode)}><option value="point">Point</option><option value="path">River path</option><option value="area">Area</option></select></label><button type="button" disabled={!undo.length} onClick={() => { const previous = undo.at(-1)!; setUndo((items) => items.slice(0, -1)); setRedo((items) => [...items, heights]); setHeights(previous) }}>Undo</button><button type="button" disabled={!redo.length} onClick={() => { const next = redo.at(-1)!; setRedo((items) => items.slice(0, -1)); setUndo((items) => [...items, heights]); setHeights(next) }}>Redo</button><button type="button" onClick={() => { if (confirm('Regenerate terrain? This can be undone.')) { setUndo((items) => [...items, heights]); setRedo([]); setHeights(generateTerrain(Date.now())) } }}>Regenerate</button></aside></section></main>
}
export default App
