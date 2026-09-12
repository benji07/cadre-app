import type { FormatId } from './types'

export interface FormatDef {
  /** Identifiant, aussi utilisé comme suffixe de nom de fichier (« DSC_0412_4x5.jpg »). */
  id: FormatId
  /** Nom affiché, ex. « Portrait ». */
  label: string
  /** Rapport largeur / hauteur exprimé en entiers ; le libellé « 4:5 » en découle. */
  w: number
  h: number
  /** Indication affichée sous les dimensions. */
  hint: string
}

/** Table des formats, dans l'ordre d'affichage. Règle : le petit côté fait toujours 1080 px. */
export const FORMATS: FormatDef[] = [
  { id: '4x5', label: 'Portrait', w: 4, h: 5, hint: 'recommandé' },
  { id: '3x4', label: 'Grille', w: 3, h: 4, hint: 'grille du profil' },
  { id: '1x1', label: 'Carré', w: 1, h: 1, hint: '' },
  { id: '5x4', label: 'Paysage', w: 5, h: 4, hint: 'réduit par Instagram' }
]

export function isFormatId(value: unknown): value is FormatId {
  return FORMATS.some((f) => f.id === value)
}

export function formatById(id: FormatId): FormatDef {
  const f = FORMATS.find((x) => x.id === id)
  if (!f) throw new Error(`Format inconnu : ${id}`)
  return f
}

/** Petit côté de sortie à l'échelle 1. */
export const BASE_SHORT_SIDE = 1080
