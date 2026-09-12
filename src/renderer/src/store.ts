import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import {
  ACCEPTED_EXTENSIONS,
  DEFAULT_PREFS,
  DEFAULT_SETTINGS,
  type ExportJob,
  type ExportResult,
  type Photo,
  type Scale,
  type Settings
} from '@shared/types'
import { extensionOf } from './lib/text'

export type Scope = 'all' | 'single'

export interface ExportState {
  running: boolean
  /** Index 1-based de la photo en cours. */
  index: number
  total: number
  fileName: string
  result?: ExportResult
  error?: string
}

const IDLE_EXPORT: ExportState = { running: false, index: 0, total: 0, fileName: '' }

export interface AppState {
  photos: Photo[]
  selectedId: string | null
  global: Settings
  overrides: Record<string, Partial<Settings>>
  scope: Scope
  exportFolder: string | null
  scale: Scale
  stripExif: boolean
  exportState: ExportState
  eyedropperActive: boolean
  /** Nombre de fichiers en cours d'import (vignette d'attente). */
  importing: number
  dragging: boolean
  hydrated: boolean

  hydrate: () => Promise<void>
  addPhotos: (photos: Photo[]) => void
  importPaths: (paths: string[]) => Promise<void>
  openFilesDialog: () => Promise<void>
  removePhoto: (id: string) => void
  setSelected: (id: string) => void
  selectRelative: (delta: number) => void
  setScope: (scope: Scope) => void
  updateSetting: (patch: Partial<Settings>) => void
  resetOverride: (id: string) => void
  setScale: (scale: Scale) => void
  setStripExif: (value: boolean) => void
  chooseFolder: () => Promise<void>
  setEyedropper: (value: boolean) => void
  setDragging: (value: boolean) => void
  startExport: () => Promise<void>
  cancelExport: () => void
  dismissExport: () => void
}

/** Ne garde que les chemins dont l'extension est acceptée (les autres sont ignorés en silence). */
function filterAcceptedPaths(paths: string[]): string[] {
  return paths.filter((p) => ACCEPTED_EXTENSIONS.includes(extensionOf(p)))
}

/** Réglage effectif d'une photo : réglages du lot écrasés par sa surcharge. */
function effectiveSettings(state: AppState, id: string | null): Settings {
  const override = id ? state.overrides[id] : undefined
  return override ? { ...state.global, ...override } : state.global
}

/** Photos exportables (fichiers lisibles). */
export function readyPhotos(state: AppState): Photo[] {
  return state.photos.filter((p) => !p.error)
}

export const useStore = create<AppState>()((set, get) => ({
  photos: [],
  selectedId: null,
  global: DEFAULT_SETTINGS,
  overrides: {},
  scope: 'all',
  exportFolder: null,
  scale: DEFAULT_PREFS.scale,
  stripExif: DEFAULT_PREFS.stripExif,
  exportState: IDLE_EXPORT,
  eyedropperActive: false,
  importing: 0,
  dragging: false,
  hydrated: false,

  hydrate: async () => {
    try {
      // Le main renvoie des préférences déjà validées, dossier résolu compris.
      const prefs = await window.api.getPrefs()
      set({
        global: prefs.settings,
        scale: prefs.scale,
        stripExif: prefs.stripExif,
        exportFolder: prefs.folder
      })
    } catch {
      /* préférences illisibles : on repart des valeurs par défaut */
    }
    set({ hydrated: true })
  },

  addPhotos: (incoming) => {
    set((s) => {
      const seen = new Set(s.photos.map((p) => p.path))
      const fresh: Photo[] = []
      for (const p of incoming) {
        if (seen.has(p.path)) continue
        seen.add(p.path)
        fresh.push(p)
      }
      if (fresh.length === 0) return s
      const photos = [...s.photos, ...fresh]
      return { photos, selectedId: s.selectedId ?? photos[0].id }
    })
  },

  importPaths: async (paths) => {
    const known = new Set(get().photos.map((p) => p.path))
    const fresh = filterAcceptedPaths(paths).filter((p) => !known.has(p))
    if (fresh.length === 0) return
    set((s) => ({ importing: s.importing + fresh.length }))
    try {
      get().addPhotos(await window.api.importFiles(fresh))
    } catch {
      /* une erreur d'import ne doit pas casser l'interface */
    } finally {
      set((s) => ({ importing: Math.max(0, s.importing - fresh.length) }))
    }
  },

  openFilesDialog: async () => {
    const paths = await window.api.openFilesDialog()
    if (paths.length > 0) await get().importPaths(paths)
  },

  removePhoto: (id) => {
    set((s) => {
      const index = s.photos.findIndex((p) => p.id === id)
      if (index < 0) return s
      const photos = s.photos.filter((p) => p.id !== id)
      const overrides = { ...s.overrides }
      delete overrides[id]
      let selectedId = s.selectedId
      if (selectedId === id) {
        const next = photos[index] ?? photos[index - 1] ?? null
        selectedId = next ? next.id : null
      }
      return {
        photos,
        overrides,
        selectedId,
        scope: photos.length === 0 ? 'all' : s.scope
      }
    })
  },

  setSelected: (id) => set({ selectedId: id }),

  selectRelative: (delta) => {
    const { photos, selectedId } = get()
    if (photos.length === 0) return
    const current = photos.findIndex((p) => p.id === selectedId)
    const next = Math.min(photos.length - 1, Math.max(0, (current < 0 ? 0 : current) + delta))
    set({ selectedId: photos[next].id })
  },

  setScope: (scope) => set({ scope }),

  updateSetting: (patch) => {
    const { scope, selectedId } = get()
    if (scope === 'single' && selectedId) {
      set((s) => ({
        overrides: { ...s.overrides, [selectedId]: { ...s.overrides[selectedId], ...patch } }
      }))
    } else {
      set((s) => ({ global: { ...s.global, ...patch } }))
    }
  },

  resetOverride: (id) => {
    set((s) => {
      if (!s.overrides[id]) return s
      const overrides = { ...s.overrides }
      delete overrides[id]
      return { overrides }
    })
  },

  setScale: (scale) => set({ scale }),
  setStripExif: (stripExif) => set({ stripExif }),

  chooseFolder: async () => {
    const folder = await window.api.chooseFolder()
    if (folder) set({ exportFolder: folder })
  },

  setEyedropper: (eyedropperActive) => set({ eyedropperActive }),
  setDragging: (dragging) => set({ dragging }),

  startExport: async () => {
    const state = get()
    if (state.exportState.running) return
    const jobs: ExportJob[] = readyPhotos(state).map((p) => ({
      photoId: p.id,
      path: p.path,
      name: p.name,
      settings: effectiveSettings(state, p.id)
    }))
    if (jobs.length === 0) return

    // Le dossier de destination est demandé à chaque export ; le dernier choix est proposé par défaut.
    const folder = await window.api.chooseFolder()
    if (!folder) return

    set({
      exportFolder: folder,
      exportState: { running: true, index: 0, total: jobs.length, fileName: '' },
      eyedropperActive: false
    })
    const off = window.api.onExportProgress((p) => {
      set((s) => ({ exportState: { ...s.exportState, ...p } }))
    })
    try {
      const result = await window.api.exportAll(jobs, {
        folder,
        scale: state.scale,
        stripExif: state.stripExif
      })
      set((s) => ({ exportState: { ...s.exportState, running: false, result } }))
    } catch (err) {
      set((s) => ({
        exportState: {
          ...s.exportState,
          running: false,
          error: err instanceof Error ? err.message : String(err)
        }
      }))
    } finally {
      off()
    }
  },

  cancelExport: () => window.api.cancelExport(),

  dismissExport: () => set({ exportState: IDLE_EXPORT })
}))

/** Réglages utilisés par l'aperçu (photo sélectionnée). */
export function useEffectiveSettings(): Settings {
  return useStore(useShallow((s) => effectiveSettings(s, s.selectedId)))
}

/** Réglages affichés par les contrôles : le lot, ou la photo seule selon la bascule. */
export function useControlSettings(): Settings {
  return useStore(
    useShallow((s) => effectiveSettings(s, s.scope === 'single' ? s.selectedId : null))
  )
}

export function useSelectedPhoto(): Photo | null {
  // `find` renvoie la référence existante : pas de mémoïsation nécessaire.
  return useStore((s) => s.photos.find((p) => p.id === s.selectedId) ?? null)
}

export function useReadyCount(): number {
  return useStore((s) => readyPhotos(s).length)
}

/* --- Persistance des préférences (débounce 300 ms) --- */
type Persisted = Pick<AppState, 'exportFolder' | 'global' | 'scale' | 'stripExif'>
let saveTimer: ReturnType<typeof setTimeout> | undefined
let lastSaved: Persisted | null = null

useStore.subscribe((s) => {
  if (!s.hydrated) return
  if (
    lastSaved &&
    lastSaved.exportFolder === s.exportFolder &&
    lastSaved.global === s.global &&
    lastSaved.scale === s.scale &&
    lastSaved.stripExif === s.stripExif
  ) {
    return
  }
  lastSaved = {
    exportFolder: s.exportFolder,
    global: s.global,
    scale: s.scale,
    stripExif: s.stripExif
  }
  const snapshot = lastSaved
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    window.api
      .setPrefs({
        folder: snapshot.exportFolder,
        settings: snapshot.global,
        scale: snapshot.scale,
        stripExif: snapshot.stripExif
      })
      .catch(() => {
        /* l'échec d'une écriture de préférences ne doit pas remonter à l'interface */
      })
  }, 300)
})
