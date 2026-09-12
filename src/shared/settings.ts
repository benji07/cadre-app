import { isFormatId } from './formats'
import { normalizeHex } from './geometry'
import { DEFAULT_SETTINGS, MAX_BORDER_PERCENT } from './types'
import type { Scale, Settings } from './types'

/**
 * Validation des réglages venant d'une source non fiable (fichier de préférences,
 * message IPC). Chaque champ invalide retombe sur la valeur de `base`.
 */
export function sanitizeSettings(value: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const raw = (value ?? {}) as Partial<Settings>
  return {
    format: isFormatId(raw.format) ? raw.format : base.format,
    borderPercent:
      typeof raw.borderPercent === 'number' && Number.isFinite(raw.borderPercent)
        ? Math.min(MAX_BORDER_PERCENT, Math.max(0, raw.borderPercent))
        : base.borderPercent,
    borderColor:
      (typeof raw.borderColor === 'string' && normalizeHex(raw.borderColor)) || base.borderColor,
    fit: raw.fit === 'cover' || raw.fit === 'contain' ? raw.fit : base.fit
  }
}

export function sanitizeScale(value: unknown, base: Scale = 1): Scale {
  return value === 1 || value === 2 ? value : base
}
