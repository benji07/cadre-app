import { constants } from 'node:fs'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import type { ExportJob, ExportOptions, ExportProgress, ExportResult } from '../shared/types'
import { renderPhoto } from './image/render'

/** Nom de sortie : « DSC_0412_4x5.jpg ». */
export function outputName(job: ExportJob): string {
  const stem = basename(job.path, extname(job.path)) || basename(job.path) || 'photo'
  return `${stem}_${job.settings.format}.jpg`
}

/**
 * Ajoute -2, -3… tant que le fichier existe. Jamais d'écrasement.
 * L'export est séquentiel : chaque fichier est écrit avant le calcul du nom suivant.
 */
async function uniquePath(folder: string, name: string): Promise<string> {
  const ext = extname(name)
  const stem = basename(name, ext)
  for (let i = 1; ; i++) {
    const full = join(folder, i === 1 ? name : `${stem}-${i}${ext}`)
    if (!(await exists(full))) return full
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/** Prépare le dossier de sortie ; lève une erreur en français si impossible. */
async function ensureWritableFolder(folder: string): Promise<void> {
  try {
    await mkdir(folder, { recursive: true })
  } catch (error) {
    throw new Error(`Impossible de créer le dossier d'export : ${(error as Error).message}`)
  }
  try {
    await access(folder, constants.W_OK)
  } catch {
    throw new Error(`Le dossier « ${folder} » n'est pas accessible en écriture.`)
  }
}

/**
 * Export séquentiel. Chaque échec est consigné et le lot continue, sauf disque
 * plein (ENOSPC) qui arrête le lot comme prévu dans docs/features/export.md.
 */
export async function runExport(
  jobs: ExportJob[],
  options: ExportOptions,
  onProgress: (p: ExportProgress) => void,
  isCancelled: () => boolean,
  tempRoot?: string
): Promise<ExportResult> {
  const result: ExportResult = { done: [], failed: [], cancelled: false }
  await ensureWritableFolder(options.folder)

  for (let i = 0; i < jobs.length; i++) {
    if (isCancelled()) {
      result.cancelled = true
      break
    }
    const job = jobs[i]
    onProgress({ index: i + 1, total: jobs.length, fileName: job.name || basename(job.path) })
    try {
      const buffer = await renderPhoto(job, options, tempRoot)
      const target = await uniquePath(options.folder, outputName(job))
      await writeFile(target, buffer)
      result.done.push({ photoId: job.photoId, outputPath: target })
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      result.failed.push({ photoId: job.photoId, error: err.message ?? String(error) })
      if (err.code === 'ENOSPC') break
    }
  }
  return result
}
