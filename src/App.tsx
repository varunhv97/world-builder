import './App.css'

function App() {
  return (
    <main className="app-shell">
      <section className="app-introduction" aria-labelledby="app-title">
        <p className="eyebrow">LOKA/1 · local-first world building</p>
        <h1 id="app-title">World Builder</h1>
        <p className="lede">
          The foundation is in place. The first implementation slice establishes
          a durable, portable world model before the 3D editor arrives.
        </p>
      </section>

      <section className="foundation-card" aria-labelledby="foundation-title">
        <div>
          <p className="status-label">In progress</p>
          <h2 id="foundation-title">World data, before world UI</h2>
          <p>
            LOKA headers are isolated from the interface and validated with
            checksums. Next, document and terrain-chunk primitives will build on
            this contract.
          </p>
        </div>
        <dl className="foundation-details">
          <div>
            <dt>Canonical format</dt>
            <dd>.loka</dd>
          </div>
          <div>
            <dt>Persistence model</dt>
            <dd>Checkpoint + worklog</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}

export default App
