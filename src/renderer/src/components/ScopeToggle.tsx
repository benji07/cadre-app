import type { JSX } from 'react'
import { useSelectedPhoto, useStore, type Scope } from '@renderer/store'
import { baseName } from '@renderer/lib/text'

export default function ScopeToggle(): JSX.Element | null {
  const scope = useStore((s) => s.scope)
  const setScope = useStore((s) => s.setScope)
  const resetOverride = useStore((s) => s.resetOverride)
  const photo = useSelectedPhoto()
  const hasOverride = useStore((s) => Boolean(s.selectedId && s.overrides[s.selectedId]))

  if (!photo) return null

  const tabs: { value: Scope; label: string }[] = [
    { value: 'all', label: 'Toutes les photos' },
    { value: 'single', label: `${baseName(photo.name)} seulement` }
  ]

  return (
    <div className="scope">
      <div className="segmented" role="tablist" aria-label="Portée des réglages">
        {tabs.map((t) => (
          <button
            type="button"
            key={t.value}
            role="tab"
            aria-selected={scope === t.value}
            className={`segmented__item${scope === t.value ? ' segmented__item--on' : ''}`}
            onClick={() => setScope(t.value)}
            title={t.label}
          >
            {t.label}
          </button>
        ))}
      </div>
      <span className="scope__hint">
        {scope === 'all'
          ? 'Les réglages s’appliquent à tout le lot.'
          : 'Les réglages ne concernent que cette photo.'}
      </span>
      {scope === 'single' && hasOverride && (
        <button type="button" className="link" onClick={() => resetOverride(photo.id)}>
          Revenir aux réglages du lot
        </button>
      )}
    </div>
  )
}
