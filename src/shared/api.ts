import type { ExportJob, ExportOptions, ExportProgress, ExportResult, Photo, Prefs } from './types'

/**
 * Contrat exposé par le preload sous `window.api`.
 * Implémenté dans src/preload/index.ts, servi par src/main/ipc.ts.
 */
export interface Api {
  /** Convertit les File d'un drop en chemins absolus (webUtils.getPathForFile). */
  pathsFromFiles(files: File[]): string[]
  /** Importe des fichiers : décodage, aperçu, couleur dominante. Une entrée par chemin, dans l'ordre. */
  importFiles(paths: string[]): Promise<Photo[]>
  /** Sélecteur de fichiers image, multi-sélection. Renvoie [] si annulé. */
  openFilesDialog(): Promise<string[]>
  /** Sélecteur de dossier. Renvoie null si annulé. */
  chooseFolder(): Promise<string | null>
  /** Lance l'export séquentiel du lot. */
  exportAll(jobs: ExportJob[], options: ExportOptions): Promise<ExportResult>
  /** Demande l'arrêt de l'export après la photo en cours. */
  cancelExport(): void
  /** Abonnement à la progression ; renvoie la fonction de désabonnement. */
  onExportProgress(cb: (p: ExportProgress) => void): () => void
  /** Import demandé par le main (outil de développement CADRE_DEV_IMPORT) ; renvoie le désabonnement. */
  onImportRequest(cb: (paths: string[]) => void): () => void
  /** Sélectionne un fichier ou un dossier dans le Finder. */
  revealInFinder(path: string): void
  /** Préférences complètes ; `folder` est toujours résolu (~/Pictures/Instagram par défaut). */
  getPrefs(): Promise<Prefs>
  setPrefs(prefs: Partial<Prefs>): Promise<void>
}

/** Noms des canaux IPC, partagés entre preload et main. */
export const IPC = {
  importFiles: 'files:import',
  importRequest: 'files:importRequest',
  openFilesDialog: 'dialog:openFiles',
  chooseFolder: 'dialog:chooseFolder',
  exportRun: 'export:run',
  exportCancel: 'export:cancel',
  exportProgress: 'export:progress',
  reveal: 'shell:reveal',
  prefsGet: 'prefs:get',
  prefsSet: 'prefs:set'
} as const
