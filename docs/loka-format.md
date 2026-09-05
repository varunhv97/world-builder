# LOKA: the World File Format

World Builder stores a portable world snapshot in a project-owned `.loka` file. The first version of the format is called **LOKA/1**.

LOKA is intentionally a data format—not a database dump, a UI-session file, or an executable plugin container. It stores the canonical editable content of a world so the same world can be loaded locally, synchronized through the cloud, backed up, and evolved without making the renderer or UI part of the saved data.

## The name

**Loka** (लोक) is a Sanskrit word whose meanings include *world*, *realm*, *place*, and a plane or sphere of existence. That makes it a natural, compact name for a file that represents one creator's world. The name is intentionally broad: World Builder is not limited to fantasy settings or a single genre.

We chose `.loka` because it is memorable, readable, and semantically tied to the thing the file holds, without borrowing the name of an existing graphics engine, database, or generic archive format. The extension is a project convention; the reliable format identifier is the `LOKA` magic value and version stored in every file header. For linguistic reference, see the [Cologne Digital Sanskrit Lexicon's Monier-Williams dictionary](https://sanskrit-lexicon.github.io/MWS/).

## Why a custom format?

The editor has a specific persistence problem: it needs to open a large terrain quickly, modify a small area without treating the whole world as one blob, preserve unknown future data, and offer a simple portable backup.

Common generic formats solve only part of that problem:

| Option | Why it is not the canonical format |
| --- | --- |
| JSON | Human-readable, but verbose for dense terrain grids and costly to parse/store at scale. |
| A single compressed archive | Compact, but forces unrelated data to be read or rewritten together. |
| A renderer-scene format | Couples creator content to rendering implementation details. |
| A database-only model | Makes a creator's portable, self-contained world backup a second-class concern. |

LOKA/1 instead uses a compact binary checkpoint divided into spatially addressable chunks. It optimizes for fast partial loading, localized updates, integrity validation, and durable format evolution. It deliberately stays low-level: it represents terrain and geometry primitives, not rigid fantasy-world object types.

## What “native” means here

Going native does **not** mean rebuilding every reliable technology from scratch. World Builder will still use established infrastructure where it is the best fit: React for interface composition, Three.js for low-level browser graphics, and Supabase/Vercel for managed cloud services and delivery.

It means the project owns the parts that define its behavior and data contract:

- The LOKA schema and its encoder/decoder.
- The low-level world document and serializable editor-command model.
- The transaction, undo, local-worklog, checkpoint, and sync semantics.
- A `WorldRenderer` layer that turns LOKA data into terrain, features, interaction, and performance policy above Three.js.
- Product-specific UI components and editing workflows.

This choice protects the product from a third-party editor abstraction dictating the world model, serialization, or interaction rules. It also keeps future options open: a new client or graphics backend can consume the same canonical data without translating an opaque scene file. At the same time, using mature libraries below those boundaries avoids spending effort on commodity concerns such as browser graphics compatibility, GPU resource management, authentication, or hosting.

## What a `.loka` file contains

| Part | Role |
| --- | --- |
| Fixed header | Identifies LOKA/1, the immutable world ID, and where to find the bootstrap index. |
| Bootstrap index | Small uncompressed data needed to identify a world and locate its chunks. |
| Chunk directories | Typed metadata for each payload: schema version, spatial bounds, byte range, codec, and checksum. |
| Payload chunks | Independently encoded and compressed canonical content. |

The canonical payload types are:

| Type | Content |
| --- | --- |
| `META` | World metadata and shared string/key dictionary. |
| `PAL0` | Compact terrain-material palette. |
| `HMAP` | A spatial terrain chunk's quantized elevation grid. |
| `MATL` | A spatial terrain chunk's palette-indexed surface-material grid. |
| `PNT0` | Spatially indexed point primitives. |
| `PTH0` | Spatially indexed path primitives, such as rivers. |
| `ARE0` | Spatially indexed area primitives. |
| `ATTR` | Typed attributes attached to the world or a primitive. |
| `REF0` | Directed references between primitive IDs. |
| `THMB` | Optional preview image. |
| `CACH` | Optional, discardable derived cache; never canonical. |

The fundamental primitives are terrain chunks, surface layers, points, paths, areas, typed attributes, and directed references. Higher-level concepts—such as a settlement or mountain range—are composed from these primitives and attributes instead of being hard-wired into the file format.

## What it deliberately does not contain

LOKA files do not contain panel layouts, active tools, selection state, temporary brush previews, camera/session state, undo/redo history, cloud account data, plugins, or executable code.

This separation matters. A saved world should survive UI redesigns, renderer changes, and future clients. Undo and crash recovery instead use an external local worklog: the live document is a validated LOKA checkpoint plus applied editing transactions.

## Encoding choices

- Terrain data is partitioned spatially, so nearby chunks can load before distant terrain.
- Elevation uses known-precision quantization and delta encoding before compression.
- Surface materials use palette indexes and run-length encoding before compression.
- Paths and areas use quantized coordinate deltas.
- Each payload declares its compression codec and has an integrity checksum.
- Unknown compatible chunks and fields must be preserved on read/save, so future versions do not silently erase data.

## Readable logical example

LOKA is binary on disk. This JSON-like example shows the *meaning* of a very small world, not its literal byte encoding:

```jsonc
{
  "format": "LOKA/1",
  "worldId": "8e73c497-5bf5-4e08-9fa4-63b864a4d786",
  "bounds": { "widthMeters": 4096, "heightMeters": 4096 },
  "bootstrap": {
    "title": "Ember Coast",
    "terrainGrid": { "chunkCells": 64, "cellSizeMeters": 4 },
    "materialPalette": ["water", "grassland", "rock"],
    "chunks": ["hmap:0,0", "matl:0,0", "pth0:0,0"]
  },
  "payloads": {
    "HMAP 0,0": "quantized, delta-encoded elevation cells",
    "MATL 0,0": "RLE palette indexes: water, grassland, rock",
    "PTH0 0,0": [{
      "id": "river-01",
      "points": [[128, 92], [172, 140], [210, 208]],
      "attributes": { "name": "Ashrun", "widthMeters": 12 }
    }]
  }
}
```

## Simplified physical layout example

The actual binary layout is self-describing through its header and chunk directories. A simplified file might be arranged like this:

```text
0x0000  Fixed header
        magic: "LOKA"
        version: 1.0
        world UUID
        bootstrap-index offset and length
        header checksum

0x0040  Bootstrap index (uncompressed)
        world bounds, grid configuration, palette, chunk-directory locations

0x0200  HMAP directory entry → payload at 0x1000
0x0240  MATL directory entry → payload at 0x1800
0x0280  PTH0 directory entry → payload at 0x1C00

0x1000  Compressed HMAP payload for terrain chunk (0, 0)
0x1800  Compressed MATL payload for terrain chunk (0, 0)
0x1C00  Compressed PTH0 payload for path features in chunk (0, 0)
```

Each directory entry records the type, schema version, spatial bounds, byte offset, compressed and uncompressed size, codec, and content checksum. The editor can therefore load only the terrain and features near the camera, validate a chunk before use, and replace only affected chunks during checkpoint compaction.

## Scope of this document

This is an architecture and data-model specification, not yet a finalized byte-level serialization standard. Exact field widths, endianness, compression codec selection, and migration rules will be specified and tested before the first production `.loka` writer ships. The invariants above are the contract that implementation must preserve.
