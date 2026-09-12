import { randomUUID } from 'node:crypto'
import { basename } from 'node:path'
import sharp from 'sharp'
import { rgbToHex } from '../../shared/geometry'
import { DEFAULT_SETTINGS } from '../../shared/types'
import type { Photo } from '../../shared/types'
import { loadDecodable } from './decode'
import { rotatedSize } from './render'

const PREVIEW_MAX = 1600
const PREVIEW_QUALITY = 85

/** Message affiché sur la vignette d'un fichier illisible (voir docs/features/import.md). */
const UNREADABLE_MESSAGE = 'Impossible de lire ce fichier'

/** Décode une photo pour le renderer : dimensions redressées, aperçu 1600 px, dominante. */
export async function buildPhoto(path: string, tempRoot?: string): Promise<Photo> {
  const name = basename(path)
  try {
    const { input, cleanup } = await loadDecodable(path, tempRoot)
    try {
      const size = rotatedSize(await sharp(input, { failOn: 'error' }).metadata())
      const preview = await sharp(input, { failOn: 'error' })
        .rotate()
        .resize({
          width: PREVIEW_MAX,
          height: PREVIEW_MAX,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: PREVIEW_QUALITY })
        .toBuffer()

      return {
        id: randomUUID(),
        path,
        name,
        width: size.width,
        height: size.height,
        previewDataUrl: `data:image/jpeg;base64,${preview.toString('base64')}`,
        dominantColor: await dominantColor(preview)
      }
    } finally {
      await cleanup()
    }
  } catch {
    return {
      id: randomUUID(),
      path,
      name,
      width: 0,
      height: 0,
      previewDataUrl: '',
      dominantColor: DEFAULT_SETTINGS.borderColor,
      error: UNREADABLE_MESSAGE
    }
  }
}

/** Couleur dominante calculée sur l'aperçu (déjà redressé et réduit). */
async function dominantColor(preview: Buffer): Promise<string> {
  try {
    const { dominant } = await sharp(preview).stats()
    return rgbToHex(dominant.r, dominant.g, dominant.b)
  } catch {
    return DEFAULT_SETTINGS.borderColor
  }
}
