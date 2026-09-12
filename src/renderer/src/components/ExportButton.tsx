import type { JSX } from 'react'
import { useReadyCount, useStore } from '@renderer/store'
import { IconExport } from './Icons'

/* Rendu seulement hors export (App bascule sur ExportSheet pendant l'export). */
export default function ExportButton(): JSX.Element {
  const count = useReadyCount()
  const folder = useStore((s) => s.exportFolder)
  const startExport = useStore((s) => s.startExport)

  return (
    <button
      type="button"
      className="export-btn"
      disabled={count === 0 || !folder}
      onClick={() => void startExport()}
    >
      <IconExport />
      <span>{count === 1 ? 'Exporter la photo' : `Exporter les ${count} photos`}</span>
    </button>
  )
}
