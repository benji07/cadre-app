import { useRef, useState, type JSX } from 'react'
import type { Fit } from '@shared/types'
import { MAX_BORDER_PERCENT } from '@shared/types'
import { normalizeHex } from '@shared/geometry'
import { useControlSettings, useStore } from '@renderer/store'
import { IconPipette } from './Icons'

const PRESETS = [
  { label: 'Aucune', value: 0 },
  { label: 'Fine', value: 3 },
  { label: 'Moyenne', value: 6 },
  { label: 'Large', value: 10 }
]

const SWATCHES = [
  { label: 'Blanc', value: '#ffffff' },
  { label: 'Noir', value: '#111111' }
]

const FITS: { value: Fit; label: string }[] = [
  { value: 'contain', label: 'Photo entière' },
  { value: 'cover', label: 'Remplir le cadre' }
]

function formatPercent(value: number): string {
  return `${String(value).replace('.', ',')} %`
}

export default function BorderPanel(): JSX.Element {
  const settings = useControlSettings()
  const updateSetting = useStore((s) => s.updateSetting)
  const eyedropperActive = useStore((s) => s.eyedropperActive)
  const setEyedropper = useStore((s) => s.setEyedropper)

  const isPreset = PRESETS.some((p) => p.value === settings.borderPercent)
  const [customOpen, setCustomOpen] = useState(!isPreset)
  const showSlider = customOpen || !isPreset

  /* `draft` n'existe que pendant la saisie ; sinon on affiche la couleur courante. */
  const [draft, setDraft] = useState<string | null>(null)
  const hex = draft ?? settings.borderColor.toUpperCase()
  const nativeColor = useRef<HTMLInputElement>(null)

  const commitHex = (raw: string): void => {
    const color = normalizeHex(raw)
    if (color) updateSetting({ borderColor: color })
    setDraft(null)
  }

  return (
    <section className="step">
      <div className="step__head">
        <span className="step__num">03</span>
        <h2 className="step__title">Bordure</h2>
      </div>
      <div className="panel">
        <div className="row">
          <span className="row__label">Épaisseur</span>
          <div className="row__controls">
            {PRESETS.map((p) => {
              const on = !showSlider && settings.borderPercent === p.value
              return (
                <button
                  type="button"
                  key={p.label}
                  className={`pill${on ? ' pill--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => {
                    setCustomOpen(false)
                    updateSetting({ borderPercent: p.value })
                  }}
                >
                  {p.value === 0 ? p.label : `${p.label} · ${p.value} %`}
                </button>
              )
            })}
            <button
              type="button"
              className={`pill${showSlider ? ' pill--on' : ''}`}
              aria-pressed={showSlider}
              onClick={() => setCustomOpen(true)}
            >
              <span>Perso</span>
              <span className="pill__value">{formatPercent(settings.borderPercent)}</span>
            </button>
            {showSlider && (
              <input
                className="slider"
                type="range"
                min={0}
                max={MAX_BORDER_PERCENT}
                step={0.5}
                value={settings.borderPercent}
                aria-label="Épaisseur de la bordure en pourcentage"
                onChange={(e) => updateSetting({ borderPercent: Number(e.target.value) })}
              />
            )}
          </div>
        </div>

        <div className="row">
          <span className="row__label">Couleur</span>
          <div className="row__controls" style={{ gap: 10 }}>
            {SWATCHES.map((s) => {
              // borderColor est toujours normalisée en minuscules (préférences, saisie, pipette).
              const on = settings.borderColor === s.value
              return (
                <button
                  type="button"
                  key={s.value}
                  className={`swatch${on ? ' swatch--on' : ''}`}
                  style={{ background: s.value }}
                  title={s.label}
                  aria-label={s.label}
                  aria-pressed={on}
                  onClick={() => updateSetting({ borderColor: s.value })}
                />
              )
            })}
            <button
              type="button"
              className={`pill pill--tall${eyedropperActive ? ' pill--on' : ''}`}
              aria-pressed={eyedropperActive}
              onClick={() => setEyedropper(!eyedropperActive)}
              title="Prélever une couleur dans l'aperçu"
            >
              <IconPipette />
              <span>Pipette</span>
            </button>
            <span className="pill pill--tall" style={{ position: 'relative' }}>
              <button
                type="button"
                className="color-wheel"
                aria-label="Sélecteur de couleur système"
                title="Sélecteur de couleur système"
                onClick={() => nativeColor.current?.click()}
              />
              <input
                ref={nativeColor}
                className="color-native"
                type="color"
                tabIndex={-1}
                value={settings.borderColor}
                onChange={(e) => updateSetting({ borderColor: e.target.value })}
              />
              <input
                className="hex-input"
                value={hex}
                spellCheck={false}
                maxLength={7}
                aria-label="Code hexadécimal de la couleur"
                onChange={(e) => setDraft(e.target.value)}
                onBlur={(e) => commitHex(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commitHex((e.target as HTMLInputElement).value)
                    ;(e.target as HTMLInputElement).blur()
                  }
                }}
              />
            </span>
          </div>
        </div>

        <div className="row">
          <span className="row__label">Cadrage</span>
          <div className="row__controls">
            {FITS.map((f) => {
              const on = settings.fit === f.value
              return (
                <button
                  type="button"
                  key={f.value}
                  className={`pill${on ? ' pill--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => updateSetting({ fit: f.value })}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
