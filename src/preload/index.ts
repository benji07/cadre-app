import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { IpcRendererEvent } from 'electron'
import { IPC } from '@shared/api'
import type { Api } from '@shared/api'
import type { ExportJob, ExportOptions, ExportProgress, Prefs } from '@shared/types'

/** Abonnement à un canal main → renderer ; renvoie la fonction de désabonnement. */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: Api = {
  pathsFromFiles(files: File[]): string[] {
    // Electron >= 32 : File.path n'existe plus, webUtils.getPathForFile le remplace.
    return Array.from(files)
      .map((file) => {
        try {
          return webUtils.getPathForFile(file)
        } catch {
          return ''
        }
      })
      .filter((path) => path.length > 0)
  },
  importFiles: (paths: string[]) => ipcRenderer.invoke(IPC.importFiles, paths),
  openFilesDialog: () => ipcRenderer.invoke(IPC.openFilesDialog),
  chooseFolder: () => ipcRenderer.invoke(IPC.chooseFolder),
  exportAll: (jobs: ExportJob[], options: ExportOptions) =>
    ipcRenderer.invoke(IPC.exportRun, jobs, options),
  cancelExport: () => ipcRenderer.send(IPC.exportCancel),
  onExportProgress: (cb: (p: ExportProgress) => void) => subscribe(IPC.exportProgress, cb),
  onImportRequest: (cb: (paths: string[]) => void) => subscribe(IPC.importRequest, cb),
  revealInFinder: (path: string) => ipcRenderer.send(IPC.reveal, path),
  getPrefs: () => ipcRenderer.invoke(IPC.prefsGet),
  setPrefs: (prefs: Partial<Prefs>) => ipcRenderer.invoke(IPC.prefsSet, prefs)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (défini dans index.d.ts)
  window.api = api
}
