import type { JSX } from 'react'
import type { Photo } from '@shared/types'
import { useStore } from '@renderer/store'
import { IconAlert, IconClose, IconPlus } from './Icons'

const DROP_COPY = "Glissez d'autres photos ici"
/* Formats acceptés : voir ACCEPTED_EXTENSIONS dans src/shared/types.ts. */
const DROP_SUB_EMPTY = 'JPEG, PNG, HEIC, TIFF, WebP — ou cliquez pour les choisir'

function Thumb({ photo }: { photo: Photo }): JSX.Element {
  // Sélecteurs booléens : seules les deux vignettes concernées se redessinent à un changement de sélection.
  const selected = useStore((s) => s.selectedId === photo.id)
  const hasOverride = useStore((s) => Boolean(s.overrides[photo.id]))
  const setSelected = useStore((s) => s.setSelected)
  const removePhoto = useStore((s) => s.removePhoto)

  return (
    <div
      className={`thumb${selected ? ' thumb--selected' : ''}`}
      onClick={() => setSelected(photo.id)}
      title={photo.error ? `${photo.name} · ${photo.error}` : photo.name}
    >
      {photo.error ? (
        <div className="thumb__error">
          <IconAlert />
        </div>
      ) : (
        <img className="thumb__img" src={photo.previewDataUrl} alt={photo.name} draggable={false} />
      )}
      {hasOverride && <span className="thumb__badge" aria-label="Réglages à part" />}
      <button
        type="button"
        className="thumb__remove"
        aria-label={`Retirer ${photo.name}`}
        title="Retirer du lot"
        onClick={(e) => {
          e.stopPropagation()
          removePhoto(photo.id)
        }}
      >
        <IconClose />
      </button>
      {photo.error && <span className="thumb__caption">Illisible</span>}
    </div>
  )
}

function DropTile({ big = false }: { big?: boolean }): JSX.Element {
  const dragging = useStore((s) => s.dragging)
  const openFilesDialog = useStore((s) => s.openFilesDialog)

  return (
    <button
      type="button"
      className={`dropzone${big ? ' dropzone--big' : ''}${dragging ? ' dropzone--over' : ''}`}
      onClick={() => void openFilesDialog()}
    >
      {big ? (
        <>
          <IconPlus size={22} />
          <span className="dropzone__title">Glissez vos photos ici</span>
          <span>{DROP_SUB_EMPTY}</span>
        </>
      ) : (
        <>
          <IconPlus size={16} />
          <span>{DROP_COPY}</span>
        </>
      )}
    </button>
  )
}

export default function PhotoStrip(): JSX.Element {
  const photos = useStore((s) => s.photos)
  const importing = useStore((s) => s.importing)
  const empty = photos.length === 0 && importing === 0

  return (
    <section className={`step${empty ? ' step--fixed' : ''}`}>
      <div className="step__head">
        <span className="step__num">01</span>
        <h2 className="step__title">Vos photos</h2>
      </div>
      {empty ? (
        <DropTile big />
      ) : (
        <div className="strip">
          {photos.map((photo) => (
            <Thumb key={photo.id} photo={photo} />
          ))}
          {Array.from({ length: importing }, (_, i) => (
            <div key={`loading-${i}`} className="thumb thumb--loading" title="Import en cours…">
              <span className="spinner" />
            </div>
          ))}
          <DropTile />
        </div>
      )}
    </section>
  )
}
