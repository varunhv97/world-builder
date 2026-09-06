/** Computes the IEEE CRC-32 checksum used by LOKA/1 header and payload records. */
export function crc32(bytes: Uint8Array): number {
  let checksum = 0xffff_ffff

  for (const byte of bytes) {
    checksum = CRC32_TABLE[(checksum ^ byte) & 0xff]! ^ (checksum >>> 8)
  }

  return (checksum ^ 0xffff_ffff) >>> 0
}

const CRC32_TABLE = createCrc32Table()

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256)

  for (let index = 0; index < table.length; index += 1) {
    let value = index

    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? (value >>> 1) ^ 0xedb8_8320 : value >>> 1
    }

    table[index] = value >>> 0
  }

  return table
}
