import { useEffect, useRef, useState } from 'react'
import { generateTerrain, LOCAL_TERRAIN_DIMENSION, sculptTerrain } from './domain/local-terrain'
import { recoverTerrain } from './domain/local-recovery'
import { WorldRenderer } from './rendering/WorldRenderer'
import './App.css'

const DIMENSION = LOCAL_TERRAIN_DIMENSION
const STORAGE_KEY = 'world-builder:milestone-1'
type TerrainTool = 'raise' | 'lower' | 'paint'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<WorldRenderer | null>(null)
  const drawingRef = useRef(false)
  const [heights, setHeights] = useState(() => recoverTerrain(localStorage.getItem(STORAGE_KEY), DIMENSION ** 2) ?? generateTerrain(Date.now()))
  const [materials, setMaterials] = useState<number[]>(() => Array(DIMENSION ** 2).fill(1))
  const [tool, setTool] = useState<TerrainTool>('raise')
  const [brushRadius, setBrushRadius] = useState(2)
  const [gridVisible, setGridVisible] = useState(false)
  const [undo, setUndo] = useState<number[][]>([])
  const [redo, setRedo] = useState<number[][]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new WorldRenderer(canvas)
    rendererRef.current = renderer
    const resize = () => renderer.resize(canvas.clientWidth, canvas.clientHeight)
    resize(); renderer.start()
    const observer = new ResizeObserver(resize); observer.observe(canvas)
    return () => { observer.disconnect(); renderer.dispose() }
  }, [])
  useEffect(() => { rendererRef.current?.setTerrain({ dimension: DIMENSION, elevations: heights, materialIndices: materials }); localStorage.setItem(STORAGE_KEY, JSON.stringify({ heights })) }, [heights, materials])
  const edit = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const coordinate = rendererRef.current?.terrainCoordinateAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect(), DIMENSION)
    if (coordinate === undefined) return
    const { column, row } = coordinate
    if (tool === 'paint') { setMaterials((current) => current.map((material, index) => index === row * DIMENSION + column ? (material + 1) % 3 : material)); return }
    setHeights((current) => sculptTerrain(current, DIMENSION, column, row, tool === 'raise' ? 220 : -220, brushRadius))
  }
  const beginStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.button !== 0) return
    drawingRef.current = true
    rendererRef.current?.setSculpting(true)
    setUndo((history) => [...history, heights]); setRedo([])
    event.currentTarget.setPointerCapture(event.pointerId)
    edit(event)
  }
  const continueStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (drawingRef.current) edit(event)
  }
  const endStroke = () => {
    drawingRef.current = false
    rendererRef.current?.setSculpting(false)
  }
  const undoEdit = () => { const previous = undo.at(-1); if (previous) { setUndo((items) => items.slice(0, -1)); setRedo((items) => [...items, heights]); setHeights(previous) } }
  const redoEdit = () => { const next = redo.at(-1); if (next) { setRedo((items) => items.slice(0, -1)); setUndo((items) => [...items, heights]); setHeights(next) } }
  const toolCopy = tool === 'raise' ? ['Raise terrain', 'Press and drag across terrain to build land upward.'] : tool === 'lower' ? ['Lower terrain', 'Press and drag across terrain to carve land downward.'] : ['Surface paint', 'Press and drag across terrain to cycle grass, water, and desert.']
  return <main className="app-shell"><header><div><p className="eyebrow">Local-first · autosaved</p><h1>World Builder</h1></div></header><section className="workspace"><nav className="tool-rail" aria-label="Terrain tools"><Tool active={tool === 'raise'} label="Raise" icon="↑" onClick={() => setTool('raise')} /><Tool active={tool === 'lower'} label="Lower" icon="↓" onClick={() => setTool('lower')} /><Tool active={tool === 'paint'} label="Surface" icon="◒" onClick={() => setTool('paint')} /><Tool active={gridVisible} label="Grid" icon="#" onClick={() => { setGridVisible((visible) => { const next = !visible; rendererRef.current?.setGridVisible(next); return next }) }} /></nav><canvas ref={canvasRef} className="world-canvas" onPointerDown={beginStroke} onPointerMove={continueStroke} onPointerUp={endStroke} onPointerCancel={endStroke} /><aside className="inspector"><p className="inspector-kicker">Active tool</p><h2>{toolCopy[0]}</h2><p>{toolCopy[1]}</p>{tool !== 'paint' && <label className="brush-control">Brush area <output>{brushRadius}</output><input aria-label="Brush area" type="range" min="1" max="6" value={brushRadius} onChange={(event) => setBrushRadius(Number(event.target.value))} /></label>}<div className="action-row"><button className="quiet-action" type="button" disabled={!undo.length} onClick={undoEdit}>Undo</button><button className="quiet-action" type="button" disabled={!redo.length} onClick={redoEdit}>Redo</button></div><button className="primary-action" type="button" onClick={() => { if (confirm('Regenerate terrain? This can be undone.')) { setUndo((items) => [...items, heights]); setRedo([]); setHeights(generateTerrain(Date.now())) } }}>Regenerate terrain</button></aside></section></main>
}
function Tool({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) { return <button className={active ? 'tool-button is-active' : 'tool-button'} type="button" aria-pressed={active} onClick={onClick}><span>{icon}</span>{label}</button> }
export default App
