import type { JSX } from 'react'
import { FORMATS } from '@shared/formats'
import { fitInside, frameFor } from '@shared/geometry'
import type { Size } from '@shared/geometry'
import { useControlSettings, useStore } from '@renderer/store'
import { dims } from '@renderer/lib/text'

/** Boîte du pictogramme : le plus grand côté fait 50 px. */
const PICT_BOX: Size = { width: 50, height: 50 }
/** Un carré à 50 px paraît plus gros que les rectangles : on le réduit un peu. */
const PICT_SQUARE: Size = { width: 46, height: 46 }

export default function FormatPicker(): JSX.Element {
  const settings = useControlSettings()
  const scale = useStore((s) => s.scale)
  const updateSetting = useStore((s) => s.updateSetting)

  return (
    <section className="step">
      <div className="step__head">
        <span className="step__num">02</span>
        <h2 className="step__title">Format</h2>
      </div>
      <div className="format-grid">
        {FORMATS.map((f) => {
          const on = settings.format === f.id
          const frame = frameFor(f.id, scale)
          const shape = f.w === f.h ? PICT_SQUARE : fitInside({ width: f.w, height: f.h }, PICT_BOX)
          return (
            <button
              type="button"
              key={f.id}
              className={`format-card${on ? ' format-card--on' : ''}`}
              aria-pressed={on}
              onClick={() => updateSetting({ format: f.id })}
            >
              <span className="format-card__pict">
                <span
                  className="format-card__shape"
                  style={{ width: shape.width, height: shape.height }}
                />
              </span>
              <span className="format-card__text">
                <span className="format-card__label">
                  {f.w}:{f.h} · {f.label}
                </span>
                <span className="format-card__dims">{dims(frame.width, frame.height)}</span>
                <span className="format-card__hint">{f.hint || ' '}</span>
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
