import { app } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { sanitizeScale, sanitizeSettings } from '../shared/settings'
import { DEFAULT_PREFS } from '../shared/types'
import type { Prefs } from '../shared/types'

/**
 * Préférences persistées dans `<userData>/prefs.json`.
 *
 * electron-store 11 est ESM-only : sous Electron 39 `require()` renvoie
 * l'espace de noms du module ES, et l'interop CJS généré par Rollup
 * (`_interopNamespaceDefault`) réécrit `default` avec cet espace de noms —
 * la classe devient inatteignable et `new Store()` lève
 * « Store is not a constructor ». Plutôt qu'un contournement dépendant de la
 * version de Rollup, les préférences tiennent dans ce petit fichier JSON
 * écrit de façon atomique (écriture dans un fichier temporaire puis renommage).
 */
const FILE_NAME = 'prefs.json'

let cache: Prefs | null = null

function filePath(): string {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  return join(dir, FILE_NAME)
}

function sanitize(value: Partial<Prefs>, base: Prefs): Prefs {
  const folder =
    value.folder === null
      ? null
      : typeof value.folder === 'string' && value.folder.length > 0
        ? value.folder
        : base.folder
  return {
    folder,
    settings:
      value.settings === undefined
        ? base.settings
        : sanitizeSettings({ ...base.settings, ...value.settings }, base.settings),
    scale: sanitizeScale(value.scale, base.scale),
    stripExif: typeof value.stripExif === 'boolean' ? value.stripExif : base.stripExif
  }
}

export function getPrefs(): Prefs {
  if (cache) return cache
  let stored: Partial<Prefs> = {}
  try {
    stored = JSON.parse(readFileSync(filePath(), 'utf8')) as Partial<Prefs>
  } catch {
    // Premier lancement ou fichier corrompu : on repart des valeurs par défaut.
  }
  cache = sanitize(stored ?? {}, DEFAULT_PREFS)
  return cache
}

/** Fusionne un patch validé, l'écrit sur disque et renvoie les préférences complètes. */
export function setPrefs(patch: Partial<Prefs>): Prefs {
  const next = sanitize(patch ?? {}, getPrefs())
  cache = next
  try {
    const target = filePath()
    const temp = `${target}.tmp`
    writeFileSync(temp, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
    renameSync(temp, target)
  } catch (error) {
    console.error('Préférences non enregistrées :', error)
  }
  return next
}
