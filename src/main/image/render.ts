import sharp from 'sharp'
import type { Metadata } from 'sharp'
import { computeLayout, hexToRgb } from '../../shared/geometry'
import type { Size } from '../../shared/geometry'
import { JPEG_QUALITY } from '../../shared/types'
import type { ExportJob, ExportOptions } from '../../shared/types'
import { loadDecodable } from './decode'
import { whitelistFromExifBuffer } from './exif'

/** Dimensions réelles après application de l'orientation EXIF. */
export function rotatedSize(meta: Metadata): Size {
  const { width, height } = meta.autoOrient
  if (!(width > 0) || !(height > 0)) throw new Error('Dimensions illisibles')
  return { width, height }
}

/** Rendu final d'une photo : cadre, bordure, sRGB, JPEG sous la limite de taille. */
export async function renderPhoto(
  job: ExportJob,
  options: ExportOptions,
  tempRoot?: string
): Promise<Buffer> {
  const { input, cleanup } = await loadDecodable(job.path, tempRoot)
  try {
    return await renderInput(input, job, options)
  } finally {
    await cleanup()
  }
}

/** Même rendu, à partir d'une source déjà décodable (utilisé par les tests). */
export async function renderInput(
  input: string | Buffer,
  job: ExportJob,
  options: ExportOptions
): Promise<Buffer> {
  const { settings } = job
  const meta = await sharp(input, { failOn: 'error' }).metadata()
  const layout = computeLayout(
    settings.format,
    options.scale,
    settings.borderPercent,
    settings.fit,
    rotatedSize(meta)
  )
  const background = hexToRgb(settings.borderColor)

  let pipeline = sharp(input, { failOn: 'error' }).rotate()
  if (settings.fit === 'cover') {
    // src est exprimé dans le repère de l'image redressée : extract après rotate.
    pipeline = pipeline.extract({
      left: layout.src.x,
      top: layout.src.y,
      width: layout.src.width,
      height: layout.src.height
    })
  }
  const photo = await pipeline
    .flatten({ background })
    .resize({
      width: layout.dest.width,
      height: layout.dest.height,
      // La géométrie est déjà calculée : on impose les dimensions exactes.
      fit: 'fill',
      kernel: 'lanczos3'
    })
    .removeAlpha()
    // Convertit les pixels depuis le profil d'entrée vers sRGB avant le composite
    // (le tampon brut ne transporte aucun profil).
    .withIccProfile('srgb')
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Le cadre composé est matérialisé en brut avant l'encodage final.
  const frame = await sharp({
    create: {
      width: layout.frame.width,
      height: layout.frame.height,
      channels: 3,
      background
    }
  })
    .composite([
      {
        input: photo.data,
        raw: { width: photo.info.width, height: photo.info.height, channels: 3 },
        left: layout.dest.x,
        top: layout.dest.y
      }
    ])
    .raw()
    .toBuffer({ resolveWithObject: true })

  // stripExif = true : aucun appel keepMetadata/withMetadata, sharp n'écrit rien.
  // Sinon, liste blanche uniquement : plus de GPS, orientation normalisée à 1.
  const exif = options.stripExif ? undefined : whitelistFromExifBuffer(meta.exif)

  let out = sharp(frame.data, { raw: frame.info }).withIccProfile('srgb')
  if (exif) out = out.withExif(exif)
  // Qualité maximale assumée : aucun ré-encodage dégressif, le poids du fichier est libre.
  return out.jpeg({ quality: JPEG_QUALITY, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer()
}
