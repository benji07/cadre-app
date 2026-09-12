import type { JSX } from 'react'
import type { Scale } from '@shared/types'
import { BASE_SHORT_SIDE } from '@shared/formats'
import { useStore } from '@renderer/store'
import { shortenPath } from '@renderer/lib/text'
import { IconFolder } from './Icons'

const SIZES: Scale[] = [1, 2]

export default function ExportOptions(): JSX.Element {
  const folder = useStore((s) => s.exportFolder)
  const chooseFolder = useStore((s) => s.chooseFolder)
  const scale = useStore((s) => s.scale)
  const setScale = useStore((s) => s.setScale)
  const stripExif = useStore((s) => s.stripExif)
  const setStripExif = useStore((s) => s.setStripExif)

  return (
    <div className="options">
      <div className="options__row">
        <span className="options__label">Dossier proposé</span>
        <button
          type="button"
          className="options__folder"
          onClick={() => void chooseFolder()}
          title={folder ?? 'Choisir un dossier'}
        >
          <IconFolder />
          <span>{shortenPath(folder)}</span>
        </button>
      </div>
      <div className="options__row">
        <span className="options__label">Taille</span>
        <div className="segmented segmented--sm" role="group" aria-label="Taille d'export">
          {SIZES.map((s) => (
            <button
              type="button"
              key={s}
              className={`segmented__item${scale === s ? ' segmented__item--on' : ''}`}
              aria-pressed={scale === s}
              onClick={() => setScale(s)}
            >
              {`${s}× · petit côté ${BASE_SHORT_SIDE * s}`}
            </button>
          ))}
        </div>
      </div>
      <div className="options__row">
        <span className="options__label">Métadonnées EXIF</span>
        <button
          type="button"
          className="options__folder"
          onClick={() => setStripExif(!stripExif)}
          aria-pressed={stripExif}
        >
          <span>{stripExif ? 'Supprimées' : 'Conservées'}</span>
          <span className={`switch${stripExif ? ' switch--on' : ''}`}>
            <span className="switch__knob" />
          </span>
        </button>
      </div>
    </div>
  )
}
