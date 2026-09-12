/**
 * Champs EXIF conservés quand l'utilisateur choisit « Métadonnées conservées ».
 *
 * sharp n'offre aucun moyen de retirer sélectivement le GPS : `withMetadata()`
 * et `keepExif()` recopient le bloc EXIF d'origine en entier (GPS compris),
 * `withExif()` le remplace intégralement. On lit donc nous-mêmes les quelques
 * champs utiles dans le bloc EXIF source (mini-lecteur TIFF ci-dessous) et on
 * les ré-écrit via `withExif()` : tout le reste, dont l'IFD GPS, disparaît.
 * L'orientation est forcée à 1 puisque les pixels ont déjà été tournés.
 */
export type ExifBlocks = Record<string, Record<string, string>>

const TAG_MAKE = 0x010f
const TAG_MODEL = 0x0110
const TAG_EXIF_IFD = 0x8769
const TAG_EXPOSURE_TIME = 0x829a
const TAG_F_NUMBER = 0x829d
const TAG_ISO = 0x8827
const TAG_DATE_TIME_ORIGINAL = 0x9003
const TAG_FOCAL_LENGTH = 0x920a

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }

interface Entry {
  type: number
  count: number
  offset: number
}

/** Lecteurs d'entiers dans l'ordre d'octets du bloc (II = little-endian, MM = big-endian). */
interface Reader {
  buf: Buffer
  u16: (offset: number) => number
  u32: (offset: number) => number
  i32: (offset: number) => number
}

function readerFor(buf: Buffer, littleEndian: boolean): Reader {
  return littleEndian
    ? {
        buf,
        u16: (o) => buf.readUInt16LE(o),
        u32: (o) => buf.readUInt32LE(o),
        i32: (o) => buf.readInt32LE(o)
      }
    : {
        buf,
        u16: (o) => buf.readUInt16BE(o),
        u32: (o) => buf.readUInt32BE(o),
        i32: (o) => buf.readInt32BE(o)
      }
}

function readIfd(r: Reader, start: number): Map<number, Entry> {
  const entries = new Map<number, Entry>()
  if (start + 2 > r.buf.length) return entries
  const count = r.u16(start)
  for (let i = 0; i < count; i++) {
    const at = start + 2 + i * 12
    if (at + 12 > r.buf.length) break
    const tag = r.u16(at)
    const type = r.u16(at + 2)
    const n = r.u32(at + 4)
    const size = (TYPE_SIZE[type] ?? 0) * n
    // Valeur inline dans les 4 derniers octets de l'entrée si elle y tient, sinon pointeur.
    const offset = size <= 4 ? at + 8 : r.u32(at + 8)
    entries.set(tag, { type, count: n, offset })
  }
  return entries
}

function valueOf(r: Reader, entry: Entry): string | undefined {
  const { type, count, offset } = entry
  const size = (TYPE_SIZE[type] ?? 0) * count
  if (size === 0 || offset < 0 || offset + size > r.buf.length) return undefined
  if (type === 2) {
    const text = r.buf
      .subarray(offset, offset + count)
      .toString('latin1')
      .replace(/\0.*$/, '')
      .trim()
    return text.length > 0 ? text : undefined
  }
  if (type === 3) return String(r.u16(offset))
  if (type === 4) return String(r.u32(offset))
  if (type === 5 || type === 10) {
    const read = type === 5 ? r.u32 : r.i32
    const den = read(offset + 4)
    return den === 0 ? undefined : `${read(offset)}/${den}`
  }
  return undefined
}

function put(target: Record<string, string>, key: string, value: string | undefined): void {
  if (value !== undefined && value !== '') target[key] = value
}

/** Extrait la liste blanche depuis un bloc EXIF brut (avec ou sans en-tête « Exif\0\0 »). */
export function whitelistFromExifBuffer(exif: Buffer | undefined): ExifBlocks {
  // L'orientation est toujours ré-écrite à 1 : les pixels sont déjà redressés.
  const ifd0: Record<string, string> = { Orientation: '1' }
  const ifd2: Record<string, string> = {}
  const blocks: ExifBlocks = { IFD0: ifd0, IFD2: ifd2 }
  if (!exif || exif.length < 8) return blocks

  let buf = exif
  if (buf.subarray(0, 4).toString('latin1') === 'Exif') buf = buf.subarray(6)
  const order = buf.subarray(0, 2).toString('latin1')
  if (order !== 'II' && order !== 'MM') return blocks
  const r = readerFor(buf, order === 'II')

  try {
    const main = readIfd(r, r.u32(4))
    const make = main.get(TAG_MAKE)
    const model = main.get(TAG_MODEL)
    put(ifd0, 'Make', make && valueOf(r, make))
    put(ifd0, 'Model', model && valueOf(r, model))

    const pointer = main.get(TAG_EXIF_IFD)
    if (pointer) {
      const at = valueOf(r, { ...pointer, type: 4, count: 1 })
      if (at) {
        const sub = readIfd(r, Number(at))
        const read = (tag: number): string | undefined => {
          const e = sub.get(tag)
          return e ? valueOf(r, e) : undefined
        }
        put(ifd2, 'DateTimeOriginal', read(TAG_DATE_TIME_ORIGINAL))
        put(ifd2, 'ExposureTime', read(TAG_EXPOSURE_TIME))
        put(ifd2, 'FNumber', read(TAG_F_NUMBER))
        put(ifd2, 'ISOSpeedRatings', read(TAG_ISO))
        put(ifd2, 'FocalLength', read(TAG_FOCAL_LENGTH))
      }
    }
  } catch {
    // Bloc EXIF exotique ou tronqué : on garde au moins l'orientation normalisée.
  }
  return blocks
}
