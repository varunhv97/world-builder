import { crc32 } from './crc32'

export const LOKA_HEADER_BYTES = 48
export const LOKA_MAGIC = 'LOKA'
export const LOKA_MAJOR_VERSION = 1
export const LOKA_MINOR_VERSION = 0

const HEADER_CHECKSUM_OFFSET = 44
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu

export interface LokaHeader {
  readonly majorVersion: number
  readonly minorVersion: number
  readonly flags: number
  readonly worldId: string
  readonly bootstrapIndexOffset: number
  readonly bootstrapIndexLength: number
}

export class LokaFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LokaFormatError'
  }
}

/** Encodes the fixed, checksummed 48-byte LOKA/1 file header. */
export function encodeLokaHeader(header: LokaHeader): Uint8Array {
  validateHeader(header)

  const bytes = new Uint8Array(LOKA_HEADER_BYTES)
  const view = new DataView(bytes.buffer)

  bytes.set(new TextEncoder().encode(LOKA_MAGIC), 0)
  view.setUint16(4, header.majorVersion, true)
  view.setUint16(6, header.minorVersion, true)
  view.setUint32(8, header.flags, true)
  bytes.set(uuidToBytes(header.worldId), 12)
  view.setBigUint64(28, BigInt(header.bootstrapIndexOffset), true)
  view.setBigUint64(36, BigInt(header.bootstrapIndexLength), true)
  view.setUint32(HEADER_CHECKSUM_OFFSET, crc32(bytes.subarray(0, HEADER_CHECKSUM_OFFSET)), true)

  return bytes
}

/** Decodes and validates a LOKA/1 fixed header without reading payload chunks. */
export function decodeLokaHeader(bytes: Uint8Array): LokaHeader {
  if (bytes.byteLength < LOKA_HEADER_BYTES) {
    throw new LokaFormatError('LOKA header is truncated.')
  }

  const headerBytes = bytes.subarray(0, LOKA_HEADER_BYTES)
  const magic = new TextDecoder().decode(headerBytes.subarray(0, 4))

  if (magic !== LOKA_MAGIC) {
    throw new LokaFormatError('File does not begin with the LOKA magic value.')
  }

  const view = new DataView(
    headerBytes.buffer,
    headerBytes.byteOffset,
    headerBytes.byteLength,
  )
  const expectedChecksum = view.getUint32(HEADER_CHECKSUM_OFFSET, true)
  const actualChecksum = crc32(headerBytes.subarray(0, HEADER_CHECKSUM_OFFSET))

  if (actualChecksum !== expectedChecksum) {
    throw new LokaFormatError('LOKA header checksum does not match its contents.')
  }

  const majorVersion = view.getUint16(4, true)

  if (majorVersion !== LOKA_MAJOR_VERSION) {
    throw new LokaFormatError(
      `Unsupported LOKA major version ${majorVersion}; this reader supports ${LOKA_MAJOR_VERSION}.`,
    )
  }

  return {
    majorVersion,
    minorVersion: view.getUint16(6, true),
    flags: view.getUint32(8, true),
    worldId: bytesToUuid(headerBytes.subarray(12, 28)),
    bootstrapIndexOffset: uint64ToSafeNumber(view.getBigUint64(28, true), 'bootstrap index offset'),
    bootstrapIndexLength: uint64ToSafeNumber(view.getBigUint64(36, true), 'bootstrap index length'),
  }
}

function validateHeader(header: LokaHeader): void {
  if (header.majorVersion !== LOKA_MAJOR_VERSION) {
    throw new LokaFormatError(
      `LOKA/1 writer cannot encode major version ${header.majorVersion}.`,
    )
  }

  if (!Number.isInteger(header.minorVersion) || header.minorVersion < 0 || header.minorVersion > 0xffff) {
    throw new LokaFormatError('Minor version must be an unsigned 16-bit integer.')
  }

  if (!Number.isInteger(header.flags) || header.flags < 0 || header.flags > 0xffff_ffff) {
    throw new LokaFormatError('Flags must be an unsigned 32-bit integer.')
  }

  if (!UUID_PATTERN.test(header.worldId)) {
    throw new LokaFormatError('World ID must be a canonical UUID string.')
  }

  validateSafeUint64(header.bootstrapIndexOffset, 'Bootstrap index offset')
  validateSafeUint64(header.bootstrapIndexLength, 'Bootstrap index length')
}

function validateSafeUint64(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new LokaFormatError(`${label} must be a non-negative safe integer.`)
  }
}

function uint64ToSafeNumber(value: bigint, label: string): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new LokaFormatError(`${label} exceeds the browser-safe integer range.`)
  }

  return Number(value)
}

function uuidToBytes(worldId: string): Uint8Array {
  const compactId = worldId.replaceAll('-', '')
  const bytes = new Uint8Array(16)

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(compactId.slice(index * 2, index * 2 + 2), 16)
  }

  return bytes
}

function bytesToUuid(bytes: Uint8Array): string {
  const compactId = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')

  return [
    compactId.slice(0, 8),
    compactId.slice(8, 12),
    compactId.slice(12, 16),
    compactId.slice(16, 20),
    compactId.slice(20, 32),
  ].join('-')
}
