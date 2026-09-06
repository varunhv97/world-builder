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
  const [heights, setHeights] = useState(() => recoverTerrain(localStorage.getItem(STORAGE_KEY), DIMENSION ** 2) ?? generateTerrain(Date.now()))
  const [materials, setMaterials] = useState<number[]>(() => Array(DIMENSION ** 2).fill(1))
  const [tool, setTool] = useState<TerrainTool>('raise')
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
    const rect = event.currentTarget.getBoundingClientRect()
    const column = Math.min(DIMENSION - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * DIMENSION)))
    const row = Math.min(DIMENSION - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * DIMENSION)))
    if (tool === 'paint') { setMaterials((current) => current.map((material, index) => index === row * DIMENSION + column ? (material + 1) % 3 : material)); return }
    setUndo((history) => [...history, heights]); setRedo([])
    setHeights((current) => sculptTerrain(current, DIMENSION, column, row, tool === 'raise' ? 35 : -35))
  }
  const undoEdit = () => { const previous = undo.at(-1); if (previous) { setUndo((items) => items.slice(0, -1)); setRedo((items) => [...items, heights]); setHeights(previous) } }
  const redoEdit = () => { const next = redo.at(-1); if (next) { setRedo((items) => items.slice(0, -1)); setUndo((items) => [...items, heights]); setHeights(next) } }
  const toolCopy = tool === 'raise' ? ['Raise terrain', 'Click the terrain to build land upward.'] : tool === 'lower' ? ['Lower terrain', 'Click the terrain to carve land downward.'] : ['Surface paint', 'Click terrain to cycle grass, water, and desert.']
  return <main className="app-shell"><header><div><p className="eyebrow">Local-first · autosaved</p><h1>World Builder</h1></div></header><section className="workspace"><nav className="tool-rail" aria-label="Terrain tools"><Tool active={tool === 'raise'} label="Raise" icon="↑" onClick={() => setTool('raise')} /><Tool active={tool === 'lower'} label="Lower" icon="↓" onClick={() => setTool('lower')} /><Tool active={tool === 'paint'} label="Surface" icon="◒" onClick={() => setTool('paint')} /></nav><canvas ref={canvasRef} className="world-canvas" onPointerDown={edit} /><aside className="inspector"><p className="inspector-kicker">Active tool</p><h2>{toolCopy[0]}</h2><p>{toolCopy[1]}</p><div className="action-row"><button className="quiet-action" type="button" disabled={!undo.length} onClick={undoEdit}>Undo</button><button className="quiet-action" type="button" disabled={!redo.length} onClick={redoEdit}>Redo</button></div><button className="primary-action" type="button" onClick={() => { if (confirm('Regenerate terrain? This can be undone.')) { setUndo((items) => [...items, heights]); setRedo([]); setHeights(generateTerrain(Date.now())) } }}>Regenerate terrain</button></aside></section></main>
}
function Tool({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) { return <button className={active ? 'tool-button is-active' : 'tool-button'} type="button" aria-pressed={active} onClick={onClick}><span>{icon}</span>{label}</button> }
export default App
