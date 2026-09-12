import type { JSX } from 'react'
import { useStore } from '@renderer/store'
import { plural } from '@renderer/lib/text'

export default function ExportSheet(): JSX.Element {
  const state = useStore((s) => s.exportState)
  const photos = useStore((s) => s.photos)
  const folder = useStore((s) => s.exportFolder)
  const cancelExport = useStore((s) => s.cancelExport)
  const dismissExport = useStore((s) => s.dismissExport)

  if (state.running) {
    const pct = state.total > 0 ? Math.round((state.index / state.total) * 100) : 0
    return (
      <div className="sheet">
        <span className="sheet__title">Export en cours</span>
        <span className="sheet__line">
          {state.index} / {state.total}
          {state.fileName ? ` · ${state.fileName}` : ''}
        </span>
        <div className="bar">
          <div className="bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="sheet__actions">
          <button type="button" className="btn btn--quiet" onClick={() => cancelExport()}>
            Annuler
          </button>
        </div>
      </div>
    )
  }

  if (state.error) {
    return (
      <div className="sheet">
        <span className="sheet__title">L&apos;export a échoué</span>
        <span className="sheet__errors">{state.error}</span>
        <div className="sheet__actions">
          <button type="button" className="btn btn--primary" onClick={() => dismissExport()}>
            Fermer
          </button>
        </div>
      </div>
    )
  }

  const result = state.result
  if (!result) return <div className="sheet" />

  const done = result.done.length
  const nameOf = (photoId: string): string => photos.find((p) => p.id === photoId)?.name ?? photoId

  return (
    <div className="sheet">
      <span className="sheet__title">
        {result.cancelled
          ? `Export annulé · ${done} ${plural(done, 'photo exportée', 'photos exportées')}`
          : `${done} ${plural(done, 'photo exportée', 'photos exportées')}`}
      </span>
      {result.failed.length > 0 && (
        <div className="sheet__errors">
          <span>
            {result.failed.length}{' '}
            {plural(result.failed.length, 'fichier en échec', 'fichiers en échec')} :
          </span>
          {result.failed.map((f) => (
            <span key={f.photoId}>
              {nameOf(f.photoId)} — {f.error}
            </span>
          ))}
        </div>
      )}
      <div className="sheet__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!folder}
          onClick={() => folder && window.api.revealInFinder(folder)}
        >
          Afficher dans le Finder
        </button>
        <button type="button" className="btn" onClick={() => dismissExport()}>
          Fermer
        </button>
      </div>
    </div>
  )
}
