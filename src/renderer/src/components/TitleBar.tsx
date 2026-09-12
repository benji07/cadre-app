import type { JSX } from 'react'
import { useReadyCount, useStore } from '@renderer/store'
import { plural } from '@renderer/lib/text'

export default function TitleBar(): JSX.Element {
  const total = useStore((s) => s.photos.length)
  const ready = useReadyCount()

  let count: string
  if (total === 0) count = 'Aucune photo'
  else if (ready === 0) count = `${total} photos · aucune lisible`
  else count = `${ready} ${plural(ready, 'photo · prête à exporter', 'photos · prêtes à exporter')}`

  return (
    <header className="titlebar">
      <span className="titlebar__title">Cadre</span>
      <span className="titlebar__count">{count}</span>
    </header>
  )
}
