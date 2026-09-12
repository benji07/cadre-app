import { BASE_SHORT_SIDE, formatById } from './formats'
import { MAX_BORDER_PERCENT } from './types'
import type { Fit, FormatId, Scale } from './types'

export interface Size {
  width: number
  height: number
}

export interface Rect extends Size {
  x: number
  y: number
}

export interface Layout {
  /** Dimensions du fichier de sortie. */
  frame: Size
  /** Épaisseur de la bordure en px. */
  borderPx: number
  /** Boîte interne = cadre moins la bordure, positionnée dans le cadre. */
  inner: Rect
  /** Zone du cadre où la photo est dessinée (contain : taille ajustée centrée ; cover : = inner). */
  dest: Rect
  /** Portion de la photo source utilisée (contain : tout ; cover : recadrage centré au ratio de inner). */
  src: Rect
}

/** Plus grande taille au ratio de `source` qui tient dans `box` (arrondie). */
export function fitInside(source: Size, box: Size): Size {
  const k = Math.min(box.width / source.width, box.height / source.height)
  return { width: Math.round(source.width * k), height: Math.round(source.height * k) }
}

/** Dimensions du cadre de sortie : petit côté = 1080 × échelle, grand côté déduit du ratio. */
export function frameFor(format: FormatId, scale: Scale): Size {
  const f = formatById(format)
  const short = BASE_SHORT_SIDE * scale
  if (f.w < f.h) return { width: short, height: Math.round((short * f.h) / f.w) }
  if (f.w > f.h) return { width: Math.round((short * f.w) / f.h), height: short }
  return { width: short, height: short }
}

/** Épaisseur en px : pourcentage du petit côté du cadre, arrondi. */
export function borderPxFor(percent: number, frame: Size): number {
  const p = Math.min(MAX_BORDER_PERCENT, Math.max(0, percent))
  return Math.round((p / 100) * Math.min(frame.width, frame.height))
}

/**
 * Calcule la mise en page complète. Utilisé à l'identique par l'aperçu (canvas)
 * et par le rendu final (sharp) pour garantir la fidélité.
 */
export function computeLayout(
  format: FormatId,
  scale: Scale,
  borderPercent: number,
  fit: Fit,
  source: Size
): Layout {
  const frame = frameFor(format, scale)
  const borderPx = borderPxFor(borderPercent, frame)
  const inner: Rect = {
    x: borderPx,
    y: borderPx,
    width: frame.width - 2 * borderPx,
    height: frame.height - 2 * borderPx
  }

  const sw = Math.max(1, source.width)
  const sh = Math.max(1, source.height)

  if (fit === 'cover') {
    const innerRatio = inner.width / inner.height
    const srcRatio = sw / sh
    let cw = sw
    let ch = sh
    if (srcRatio > innerRatio) {
      cw = Math.round(sh * innerRatio)
    } else {
      ch = Math.round(sw / innerRatio)
    }
    const src: Rect = {
      x: Math.round((sw - cw) / 2),
      y: Math.round((sh - ch) / 2),
      width: cw,
      height: ch
    }
    return { frame, borderPx, inner, dest: { ...inner }, src }
  }

  const fitted = fitInside({ width: sw, height: sh }, inner)
  const dest: Rect = {
    x: inner.x + Math.round((inner.width - fitted.width) / 2),
    y: inner.y + Math.round((inner.height - fitted.height) / 2),
    ...fitted
  }
  return { frame, borderPx, inner, dest, src: { x: 0, y: 0, width: sw, height: sh } }
}

/** Normalise `#rgb` / `#rrggbb` (avec ou sans `#`) en `#rrggbb` minuscule ; null si invalide. */
export function normalizeHex(raw: string): string | null {
  let h = raw.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.replace(/./g, (c) => c + c)
  return /^[0-9a-fA-F]{6}$/.test(h) ? `#${h.toLowerCase()}` : null
}

/** Convertit une couleur hex en composantes 0..255 ; blanc si invalide. */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = normalizeHex(hex)
  if (!h) return { r: 255, g: 255, b: 255 }
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number): string =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
