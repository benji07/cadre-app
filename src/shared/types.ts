/** Identifiant des formats proposés. Voir docs/features/formats.md. */
export type FormatId = '4x5' | '3x4' | '1x1' | '5x4'

/** Cadrage : 'contain' = photo entière, 'cover' = remplir le cadre (recadrage centré). */
export type Fit = 'contain' | 'cover'

/** Échelle d'export : petit côté 1080 px (1) ou 2160 px (2). */
export type Scale = 1 | 2

/** Réglages appliqués à une photo (lot ou surcharge). */
export interface Settings {
  format: FormatId
  /** Épaisseur de la bordure en % du petit côté du cadre, 0..MAX_BORDER_PERCENT. */
  borderPercent: number
  /** Couleur hex `#rrggbb` minuscule. */
  borderColor: string
  fit: Fit
}

export interface ExportOptions {
  folder: string
  scale: Scale
  stripExif: boolean
}

/** Une photo importée, telle que renvoyée par le main au renderer. */
export interface Photo {
  id: string
  path: string
  name: string
  /** Dimensions réelles après application de l'orientation EXIF. */
  width: number
  height: number
  /** Aperçu JPEG (1600 px max) en data URL. Vide si `error`. */
  previewDataUrl: string
  /** Couleur dominante hex `#rrggbb`. */
  dominantColor: string
  error?: string
}

export interface ExportJob {
  photoId: string
  path: string
  name: string
  settings: Settings
}

export interface ExportProgress {
  /** Index 1-based de la photo en cours. */
  index: number
  total: number
  fileName: string
}

export interface ExportResult {
  done: { photoId: string; outputPath: string }[]
  failed: { photoId: string; error: string }[]
  cancelled: boolean
}

/** Préférences persistées entre deux lancements. */
export interface Prefs {
  /** Dossier d'export. `null` sur disque tant qu'aucun choix n'a été fait ; toujours résolu par `Api.getPrefs`. */
  folder: string | null
  settings: Settings
  scale: Scale
  stripExif: boolean
}

export const MAX_BORDER_PERCENT = 25

export const DEFAULT_SETTINGS: Settings = {
  format: '4x5',
  borderPercent: 6,
  borderColor: '#ffffff',
  fit: 'contain'
}

export const DEFAULT_PREFS: Prefs = {
  folder: null,
  settings: DEFAULT_SETTINGS,
  scale: 1,
  stripExif: true
}

/** Qualité JPEG de l'export : maximale, sans plafond de poids sur le fichier produit. */
export const JPEG_QUALITY = 100

export const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'tif', 'tiff', 'webp']
