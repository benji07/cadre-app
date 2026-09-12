import { app, dialog, ipcMain, shell, BrowserWindow } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { IPC } from '../shared/api'
import { sanitizeScale, sanitizeSettings } from '../shared/settings'
import { ACCEPTED_EXTENSIONS } from '../shared/types'
import type { ExportJob, ExportOptions, ExportResult, Photo, Prefs } from '../shared/types'
import { runExport } from './export'
import { buildPhoto } from './image/preview'
import { getPrefs, setPrefs } from './prefs'

/** Nombre d'imports décodés en parallèle : sharp utilise déjà plusieurs cœurs par image. */
const IMPORT_CONCURRENCY = 3

let exportRunning = false
let exportCancelled = false

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string' && v.length > 0)
}

/** ~/Pictures/Instagram, créé à la demande. */
async function defaultExportFolder(): Promise<string> {
  const folder = join(app.getPath('pictures'), 'Instagram')
  try {
    await mkdir(folder, { recursive: true })
  } catch {
    // Dossier non créable : on renvoie quand même le chemin, l'export signalera l'erreur.
  }
  return folder
}

/** Préférences avec le dossier d'export résolu : la valeur mémorisée, sinon le dossier par défaut. */
async function resolvedPrefs(): Promise<Prefs> {
  const prefs = getPrefs()
  return { ...prefs, folder: prefs.folder ?? (await defaultExportFolder()) }
}

async function importFiles(list: string[]): Promise<Photo[]> {
  const out: Photo[] = new Array(list.length)
  const temp = app.getPath('temp')
  let cursor = 0
  const workers = Array.from({ length: Math.min(IMPORT_CONCURRENCY, list.length) }, async () => {
    for (let i = cursor++; i < list.length; i = cursor++) {
      out[i] = await buildPhoto(list[i], temp)
    }
  })
  await Promise.all(workers)
  return out
}

function sanitizeOptions(raw: unknown): ExportOptions {
  const o = (raw ?? {}) as Partial<ExportOptions>
  if (typeof o.folder !== 'string' || o.folder.length === 0) {
    throw new Error("Aucun dossier d'export n'a été choisi.")
  }
  return { folder: o.folder, scale: sanitizeScale(o.scale), stripExif: o.stripExif !== false }
}

function sanitizeJobs(raw: unknown): ExportJob[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(
      (j): j is ExportJob =>
        !!j &&
        typeof j === 'object' &&
        typeof (j as ExportJob).path === 'string' &&
        typeof (j as ExportJob).photoId === 'string'
    )
    .map((j) => ({ ...j, settings: sanitizeSettings(j.settings) }))
}

/** Boîte de dialogue attachée à la fenêtre appelante quand elle existe encore. */
function openDialog(
  event: IpcMainInvokeEvent,
  options: Electron.OpenDialogOptions
): Promise<Electron.OpenDialogReturnValue> {
  const window = BrowserWindow.fromWebContents(event.sender)
  return window ? dialog.showOpenDialog(window, options) : dialog.showOpenDialog(options)
}

export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.importFiles, (_event, paths: unknown) => importFiles(asStringArray(paths)))

  ipcMain.handle(IPC.openFilesDialog, async (event): Promise<string[]> => {
    const result = await openDialog(event, {
      title: 'Choisir des photos',
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Images', extensions: [...ACCEPTED_EXTENSIONS] }]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle(IPC.chooseFolder, async (event): Promise<string | null> => {
    const result = await openDialog(event, {
      title: "Dossier d'export",
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: (await resolvedPrefs()).folder ?? undefined
    })
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0]
  })

  ipcMain.handle(
    IPC.exportRun,
    async (event, rawJobs: unknown, rawOptions: unknown): Promise<ExportResult> => {
      if (exportRunning) throw new Error('Un export est déjà en cours.')
      const jobs = sanitizeJobs(rawJobs)
      const options = sanitizeOptions(rawOptions)
      exportRunning = true
      exportCancelled = false
      try {
        return await runExport(
          jobs,
          options,
          (progress) => {
            if (!event.sender.isDestroyed()) event.sender.send(IPC.exportProgress, progress)
          },
          () => exportCancelled,
          app.getPath('temp')
        )
      } finally {
        exportRunning = false
      }
    }
  )

  ipcMain.on(IPC.exportCancel, () => {
    exportCancelled = true
  })

  ipcMain.on(IPC.reveal, (_event, path: unknown) => {
    if (typeof path === 'string' && path.length > 0) shell.showItemInFolder(path)
  })

  ipcMain.handle(IPC.prefsGet, () => resolvedPrefs())

  ipcMain.handle(IPC.prefsSet, (_event, patch: unknown): void => {
    setPrefs((patch ?? {}) as Partial<Prefs>)
  })
}
