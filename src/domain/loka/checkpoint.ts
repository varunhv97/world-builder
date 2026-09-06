import { decodeLokaHeader, encodeLokaHeader, LOKA_HEADER_BYTES, LOKA_MAJOR_VERSION, LOKA_MINOR_VERSION, type LokaHeader } from './header'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** Encodes a validated bootstrap payload into a self-contained LOKA checkpoint. */
export function encodeCheckpoint(worldId: string, bootstrap: unknown): Uint8Array {
  const payload = textEncoder.encode(JSON.stringify(bootstrap))
  const header = encodeLokaHeader({ majorVersion: LOKA_MAJOR_VERSION, minorVersion: LOKA_MINOR_VERSION, flags: 0, worldId, bootstrapIndexOffset: LOKA_HEADER_BYTES, bootstrapIndexLength: payload.length })
  const checkpoint = new Uint8Array(header.length + payload.length)
  checkpoint.set(header); checkpoint.set(payload, header.length)
  return checkpoint
}

export function decodeCheckpoint(bytes: Uint8Array): { readonly header: LokaHeader; readonly bootstrap: unknown } {
  const header = decodeLokaHeader(bytes)
  const end = header.bootstrapIndexOffset + header.bootstrapIndexLength
  if (header.bootstrapIndexOffset < LOKA_HEADER_BYTES || end > bytes.length) throw new Error('LOKA bootstrap payload is truncated.')
  try { return { header, bootstrap: JSON.parse(textDecoder.decode(bytes.subarray(header.bootstrapIndexOffset, end))) } } catch { throw new Error('LOKA bootstrap payload is not valid JSON.') }
}
