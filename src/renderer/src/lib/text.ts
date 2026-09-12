/** Nom de fichier sans extension. */
export function baseName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

/** Extension en minuscules, sans le point ; vide s'il n'y en a pas. */
export function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot < 0 ? '' : base.slice(dot + 1).toLowerCase()
}

/** Raccourcit un chemin absolu avec `~` pour le dossier personnel. */
export function shortenPath(path: string | null): string {
  if (!path) return '—'
  return path.replace(/^\/Users\/[^/]+/, '~').replace(/^\/home\/[^/]+/, '~')
}

/** Formate un nombre de pixels : « 4032 × 3024 ». */
export function dims(width: number, height: number): string {
  return `${width} × ${height}`
}

/** « 1 photo » / « 3 photos » ; la forme plurielle est passée entière (accords composés). */
export function plural(n: number, one: string, many: string): string {
  return n <= 1 ? one : many
}
