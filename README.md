# Loka Studio

A bold, local-first 3D world-building workspace for creating, sculpting, and saving explorable worlds.

> **Status: active development.** The local 3D editor, portable `.loka` snapshots, multi-world browser library, hosted authentication, and cloud checkpoint synchronization are implemented. Broader end-to-end validation, conflict recovery, and production hardening remain release-gate work.

**Loka Studio** is the product identity. **Loka** is the editor and `.loka` is its project-owned world-file convention. The public repository intentionally remains [`world-builder`](https://github.com/varunhv97/world-builder); the name is descriptive and stable for portfolio discovery. “Loka” is used as a product name, not as a claim of exclusive ownership or trademark registration.

## The idea

Loka Studio is a browser-based workspace for solo creators who want to make imagined geography tangible. A creator starts with a generated, bounded terrain area, then sculpts land, paints terrain, and adds geographic features directly in an immersive 3D canvas.

The first release is deliberately contained: one creator, private worlds, and a finite terrain area per world. It establishes a reliable editing and persistence foundation before expanding toward larger worlds, collaboration, or AI assistance.

## What makes the design interesting

- **Direct 3D editing.** React owns the application interface; project-owned rendering systems sit directly on top of Three.js for terrain, selection, paths, labels, and camera behavior.
- **A small, owned format.** `.loka` is a versioned binary world snapshot format built from low-level primitives, spatial chunks, and independently compressed payloads.
- **Local-first safety.** Every completed editing gesture becomes a durable local delta before it is reported saved. Snapshot checkpoints are compacted in the background, avoiding a full-file rewrite for each brush stroke.
- **Cloud without a second model.** The shipped version will use Supabase for authenticated account storage and synchronization of the same LOKA checkpoints and forward deltas. Conflicts preserve both versions rather than using last-write-wins.
- **A purposeful scope.** No lore database, public discovery, collaboration, generic import/export, or AI generation in V1.

## Planned stack

| Concern | Planned approach |
| --- | --- |
| Interface | TypeScript + React |
| Rendering | Direct Three.js behind a project-owned `WorldRenderer` boundary |
| Canonical world format | `.loka` / LOKA/1 chunked binary checkpoints |
| Local durability | Append-only, transaction-based worklog plus checkpoint compaction |
| Authentication and cloud data | Supabase Auth, Postgres, Storage, RLS, and Edge Functions |
| Web delivery | Vercel |
| Monitoring | Privacy-scrubbed Sentry client telemetry and Supabase observability |

## Implemented today

- Generated, bounded 3D terrain with reproducible presets and guided generator controls.
- Terrain raise, lower, smooth, flatten, and surface-paint brushes with adjustable size and strength, direct pointer strokes, and undo/redo.
- Local geographic point, path, and area authoring rendered through the project-owned Three.js boundary.
- Multiple locally saved worlds, browser-refresh recovery, and import/export of checksummed `.loka` snapshots.
- A secure Supabase integration boundary, public-client environment template, and SQL migration with account-isolated Row Level Security and a private checkpoint bucket.

Cloud features intentionally remain disabled when the two public Supabase environment values are absent; local editing is unaffected.

## Design documents

These documents are public, reviewed snapshots. The private Obsidian project vault remains the working source of record.

- [Product brief](docs/planning/product-brief.md)
- [Technical specification](docs/planning/technical-specification.md)
- [UI/UX specification](docs/planning/ui-ux-specification.md)
- [Acceptance and validation plan](docs/planning/acceptance-and-validation-plan.md)
- [LOKA world file format](docs/loka-format.md)

## Development

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

To enable the cloud client after creating a Supabase project, copy `.env.example` to `.env.local`, fill in only the public project URL and publishable/anon key, and apply the SQL migration in `supabase/migrations/`. Do not add a service-role key, user world, or production credential to any client-side file or commit.

Before opening a pull request or publishing a change, run:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

The unit suite covers LOKA headers/checkpoints, compaction, terrain operations, feature validation, local recovery, multi-world behavior, and portable snapshot corruption detection. Integration, end-to-end, and real Supabase RLS validation remain release-gate work once a staging project exists.

Changes are developed as small, coherent commits and are pushed only after the relevant tests, lint, type check, and production build pass.

## Engineering principles

- Favor clear, typed, testable modules over clever abstractions.
- Keep UI, renderer, domain document, persistence, and cloud synchronization boundaries explicit.
- Treat user worlds as private data: never commit real `.loka` files, worklogs, exports, credentials, or production configuration.
- Explain consequential tradeoffs in code and documentation; use tests to make the data and editing guarantees trustworthy.
- Make the core editor accessible, keyboard-operable, responsive, and respectful of reduced-motion preferences.

## License

Distributed under the [MIT License](LICENSE).
