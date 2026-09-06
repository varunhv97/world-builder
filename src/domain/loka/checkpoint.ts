import { decodeLokaHeader, encodeLokaHeader, LOKA_HEADER_BYTES, LOKA_MAJOR_VERSION, LOKA_MINOR_VERSION, type LokaHeader } from './header'
import { crc32 } from './crc32'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

/** Encodes a validated bootstrap payload into a self-contained LOKA checkpoint. */
export function encodeCheckpoint(worldId: string, bootstrap: unknown): Uint8Array {
  const body = textEncoder.encode(JSON.stringify(bootstrap))
  const payload = new Uint8Array(body.length + 4); payload.set(body); new DataView(payload.buffer).setUint32(body.length, crc32(body), true)
  const header = encodeLokaHeader({ majorVersion: LOKA_MAJOR_VERSION, minorVersion: LOKA_MINOR_VERSION, flags: 0, worldId, bootstrapIndexOffset: LOKA_HEADER_BYTES, bootstrapIndexLength: payload.length })
  const checkpoint = new Uint8Array(header.length + payload.length)
  checkpoint.set(header); checkpoint.set(payload, header.length)
  return checkpoint
}

export function decodeCheckpoint(bytes: Uint8Array): { readonly header: LokaHeader; readonly bootstrap: unknown } {
  const header = decodeLokaHeader(bytes)
  const end = header.bootstrapIndexOffset + header.bootstrapIndexLength
  if (header.bootstrapIndexOffset < LOKA_HEADER_BYTES || end > bytes.length) throw new Error('LOKA bootstrap payload is truncated.')
  const payload = bytes.subarray(header.bootstrapIndexOffset, end)
  if (payload.length < 4) throw new Error('LOKA bootstrap payload is truncated.')
  const body = payload.subarray(0, -4)
  if (new DataView(payload.buffer, payload.byteOffset + body.length, 4).getUint32(0, true) !== crc32(body)) throw new Error('LOKA bootstrap payload checksum does not match.')
  try { return { header, bootstrap: JSON.parse(textDecoder.decode(body)) } } catch { throw new Error('LOKA bootstrap payload is not valid JSON.') }
}
