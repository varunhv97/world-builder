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
    const resize = () => renderer.resize(canvas.clientWidth, canvas.clientHeight)
    resize(); renderer.start(); const observer = new ResizeObserver(resize); observer.observe(canvas)
    return () => { observer.disconnect(); renderer.dispose() }
  }, [])
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) { const next = redo.at(-1); if (next) { setRedo((items) => items.slice(0, -1)); setUndo((items) => [...items, heights]); setHeights(next) } }
        else { const previous = undo.at(-1); if (previous) { setUndo((items) => items.slice(0, -1)); setRedo((items) => [...items, heights]); setHeights(previous) } }
      }
    }
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown)
  }, [heights, redo, undo])
  useEffect(() => { rendererRef.current?.setTerrain({ dimension: DIMENSION, elevations: heights, materialIndices: materials }); localStorage.setItem(STORAGE_KEY, JSON.stringify({ heights })) }, [heights, materials])
  const sculpt = (event: React.PointerEvent<HTMLCanvasElement>, delta: number) => {
    const rect = event.currentTarget.getBoundingClientRect(); const x = Math.min(DIMENSION - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * DIMENSION))); const y = Math.min(DIMENSION - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * DIMENSION)))
    if (paintMode) { setMaterials((current) => current.map((material, index) => index === y * DIMENSION + x ? (material + 1) % 3 : material)); return }
    setUndo((history) => [...history, heights]); setRedo([]); setHeights((current) => sculptTerrain(current, DIMENSION, x, y, delta))
  }
  return <main className="app-shell"><header><div><p className="eyebrow">Local-first · autosaved</p><h1>World Builder</h1></div></header><section className="workspace"><nav className="tool-rail" aria-label="Tools"><button className={!paintMode ? 'tool-button is-active' : 'tool-button'} type="button" aria-pressed={!paintMode} onClick={() => setPaintMode(false)}><span>⌁</span>Sculpt</button><button className={paintMode ? 'tool-button is-active' : 'tool-button'} type="button" aria-pressed={paintMode} onClick={() => setPaintMode(true)}><span>◒</span>Surface</button><span className="tool-divider" /><button className={featureMode === 'point' ? 'tool-button is-active' : 'tool-button'} type="button" onClick={() => setFeatureMode('point')}><span>●</span>Point</button><button className={featureMode === 'path' ? 'tool-button is-active' : 'tool-button'} type="button" onClick={() => setFeatureMode('path')}><span>⌇</span>River</button><button className={featureMode === 'area' ? 'tool-button is-active' : 'tool-button'} type="button" onClick={() => setFeatureMode('area')}><span>◇</span>Area</button></nav><canvas ref={canvasRef} className="world-canvas" onPointerDown={(event) => sculpt(event, event.shiftKey ? -35 : 35)} /><aside className="inspector"><p className="inspector-kicker">Active tool</p><h2>{paintMode ? 'Surface paint' : 'Terrain sculpt'}</h2><p>{paintMode ? 'Click terrain to cycle grass, water, and desert.' : 'Click to raise terrain. Shift-click to lower it.'}</p><div className="action-row"><button className="quiet-action" type="button" disabled={!undo.length} onClick={() => { const previous = undo.at(-1)!; setUndo((items) => items.slice(0, -1)); setRedo((items) => [...items, heights]); setHeights(previous) }}>Undo</button><button className="quiet-action" type="button" disabled={!redo.length} onClick={() => { const next = redo.at(-1)!; setRedo((items) => items.slice(0, -1)); setUndo((items) => [...items, heights]); setHeights(next) }}>Redo</button></div><button className="primary-action" type="button" onClick={() => { if (confirm('Regenerate terrain? This can be undone.')) { setUndo((items) => [...items, heights]); setRedo([]); setHeights(generateTerrain(Date.now())) } }}>Regenerate terrain</button></aside></section></main>
}
export default App
