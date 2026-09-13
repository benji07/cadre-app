import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type JSX,
  type MouseEvent,
  type RefObject
} from 'react'
import type { Photo } from '@shared/types'
import { JPEG_QUALITY } from '@shared/types'
import { computeLayout, fitInside, rgbToHex } from '@shared/geometry'
import type { Size } from '@shared/geometry'
import { useEffectiveSettings, useSelectedPhoto, useStore } from '@renderer/store'
import { dims } from '@renderer/lib/text'

/** Images d'aperçu décodées, gardées d'une sélection à l'autre. */
const imageCache = new Map<string, HTMLImageElement>()

/* Les entrées des photos retirées du lot sont libérées. */
useStore.subscribe((s) => {
  if (imageCache.size === 0) return
  const alive = new Set(s.photos.map((p) => p.id))
  for (const id of imageCache.keys()) if (!alive.has(id)) imageCache.delete(id)
})

function isReady(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return !!image && image.complete && image.naturalWidth > 0
}

function useDecodedPreview(photo: Photo | null): HTMLImageElement | null {
  const [, bump] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
    if (!photo || photo.error || !photo.previewDataUrl) return
    const cached = imageCache.get(photo.id)
    if (isReady(cached)) return
    let cancelled = false
    const image = cached ?? new Image()
    if (!cached) {
      image.src = photo.previewDataUrl
      imageCache.set(photo.id, image)
    }
    // Le résultat du décodage est ignoré : on redessine dans tous les cas.
    image.decode().finally(() => {
      if (!cancelled) bump()
    })
    return () => {
      cancelled = true
    }
  }, [photo])

  if (!photo || photo.error || !photo.previewDataUrl) return null
  const image = imageCache.get(photo.id)
  return isReady(image) ? image : null
}

function useContentSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const box = entries[0].contentRect
      const width = Math.floor(box.width)
      const height = Math.floor(box.height)
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return size
}

export default function PreviewPane(): JSX.Element {
  const photo = useSelectedPhoto()
  const settings = useEffectiveSettings()
  const scale = useStore((s) => s.scale)
  const eyedropperActive = useStore((s) => s.eyedropperActive)
  const setEyedropper = useStore((s) => s.setEyedropper)
  const updateSetting = useStore((s) => s.updateSetting)

  const panelRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const panel = useContentSize(panelRef)
  const img = useDecodedPreview(photo)

  const srcW = photo?.width ?? 4
  const srcH = photo?.height ?? 5
  const layout = useMemo(
    () =>
      computeLayout(settings.format, scale, settings.borderPercent, settings.fit, {
        width: srcW,
        height: srcH
      }),
    [settings.format, scale, settings.borderPercent, settings.fit, srcW, srcH]
  )
  const frame = layout.frame

  /* Taille CSS du canvas : le cadre au plus grand dans le panneau (0 tant qu'il n'est pas mesuré). */
  const css = panel.width > 0 && panel.height > 0 ? fitInside(frame, panel) : null
  const cssW = css ? Math.max(1, css.width) : 0
  const cssH = css ? Math.max(1, css.height) : 0

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || cssW === 0 || cssH === 0) return
    const dpr = window.devicePixelRatio || 1
    // Changer width/height réalloue le bitmap : on ne le fait que si la taille bouge.
    const w = Math.round(cssW * dpr)
    const h = Math.round(cssH * dpr)
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { frame } = layout
    const k = cssW / frame.width
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
    ctx.fillStyle = settings.borderColor
    ctx.fillRect(0, 0, frame.width, frame.height)

    if (img && photo) {
      /* L'aperçu est une version réduite : on ramène la source à son échelle. */
      const ps = img.naturalWidth / Math.max(1, photo.width)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(
        img,
        layout.src.x * ps,
        layout.src.y * ps,
        Math.max(1, layout.src.width * ps),
        Math.max(1, layout.src.height * ps),
        layout.dest.x,
        layout.dest.y,
        layout.dest.width,
        layout.dest.height
      )
    }
  }, [img, photo, cssW, cssH, layout, settings.borderColor])

  const onCanvasClick = (e: MouseEvent<HTMLCanvasElement>): void => {
    if (!eyedropperActive) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) * canvas.width) / rect.width)
    const y = Math.floor(((e.clientY - rect.top) * canvas.height) / rect.height)
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return
    const data = ctx.getImageData(x, y, 1, 1).data
    updateSetting({ borderColor: rgbToHex(data[0], data[1], data[2]) })
    setEyedropper(false)
  }

  return (
    <>
      <div
        className={`preview${eyedropperActive ? ' preview--eyedropper' : ''}`}
        ref={panelRef}
        aria-label="Aperçu"
      >
        {photo && !photo.error ? (
          <canvas
            ref={canvasRef}
            className="preview__canvas"
            style={{ width: cssW, height: cssH }}
            onClick={onCanvasClick}
          />
        ) : (
          <span className="preview__empty">
            {photo?.error
              ? `${photo.error}. Il sera ignoré à l’export.`
              : 'L’aperçu s’affichera ici dès qu’une photo sera importée.'}
          </span>
        )}
      </div>
      <div className="preview__meta">
        <span>{photo ? `${photo.name} · ${dims(photo.width, photo.height)}` : 'Aucune photo'}</span>
        <span>{`Sortie ${dims(frame.width, frame.height)} · JPEG ${JPEG_QUALITY} · sRGB`}</span>
      </div>
    </>
  )
}
