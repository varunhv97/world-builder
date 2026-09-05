# Technical Specification

## Architecture

The app uses TypeScript and React for its workspace shell and controls. It uses Three.js directly for browser graphics, protected behind a project-owned `WorldRenderer` boundary. The renderer owns terrain, material, path, area, point/label, selection/picking, and camera/visibility systems; the UI never mutates world data directly.

All edits flow through serializable low-level commands:

`tool gesture → transaction/commands → WorldDocument → validation + changed regions → renderer/inspector → dirty chunks → local save`

A gesture is one transaction and therefore one undo step. History stores exact forward and inverse patches rather than rerunning editing algorithms.

## LOKA/1 world files

`.loka` is the project-owned, versioned canonical snapshot format. It is binary, chunked, and stores world content—not UI state, executable code, undo history, or renderer caches.

| Layer | Contents |
| --- | --- |
| Fixed header | `LOKA` magic, version, flags, immutable world ID, bootstrap-index location, integrity checksum |
| Bootstrap index | Metadata, bounds, terrain-grid configuration, material palette, preview reference, and chunk directories |
| Chunk directories | Type, schema version, spatial bounds, offset, compressed/uncompressed lengths, codec, and checksum |
| Payload chunks | Independently encoded and compressed canonical content |

Canonical chunk types are `META`, `PAL0`, `HMAP`, `MATL`, `PNT0`, `PTH0`, `ARE0`, `ATTR`, and `REF0`; optional `THMB` previews and discardable `CACH` caches are supported. The primitive model stays intentionally low-level: terrain chunks, surface layers, points, paths, areas, typed attributes, and directed references.

## Local durability

The current document is `LOKA checkpoint + applied append-only worklog transactions`. A completed edit is durably recorded locally before the UI says **Saved locally**. The worklog records exact changed cells/fields, forward patches, inverse patches, validation acknowledgements, and integrity data.

Idle-time compaction combines a checkpoint and applied deltas into a validated `.loka` snapshot. The prior snapshot remains recoverable until the replacement is verified. The UI distinguishes **Saved locally** from **Checkpointed**.

## Cloud, identity, and deployment

The shipped V1 backend is Supabase: Auth supplies verified email/password accounts; Postgres stores owner-scoped metadata and ordered forward deltas; Storage holds immutable LOKA checkpoint objects; Row Level Security protects every exposed row and object; and Edge Functions coordinate privileged validation, compaction, and conflict detection.

Sync merges only non-overlapping terrain-cell, primitive, attribute, and reference changes. True collisions preserve both versions in a recovered copy; canonical world data never uses last-write-wins.

Vercel hosts the React application and previews. Sentry captures privacy-scrubbed errors and performance signals—never world data, email addresses, credentials, tokens, payloads, or full local paths.

## Quality standard

This is a public portfolio project. Implementation should be production-minded, strongly typed, well-factored, and tested in proportion to risk. Code should explain non-obvious reasoning. Secrets, environment files, real user worlds, worklogs, exports, and private operational details must never be committed.

## Approval

Approved by the project owner on 2026-09-04. Public snapshot updated 2026-09-05.
