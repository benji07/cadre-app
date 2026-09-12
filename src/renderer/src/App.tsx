import { useEffect, useRef, type DragEvent, type JSX } from 'react'
import TitleBar from './components/TitleBar'
import PhotoStrip from './components/PhotoStrip'
import ScopeToggle from './components/ScopeToggle'
import FormatPicker from './components/FormatPicker'
import BorderPanel from './components/BorderPanel'
import PreviewPane from './components/PreviewPane'
import ExportOptions from './components/ExportOptions'
import ExportButton from './components/ExportButton'
import ExportSheet from './components/ExportSheet'
import { useStore } from './store'

function isEditable(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el || !el.tagName) return false
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable
  )
}

export default function App(): JSX.Element {
  const hydrate = useStore((s) => s.hydrate)
  const importPaths = useStore((s) => s.importPaths)
  const setDragging = useStore((s) => s.setDragging)
  // Sélecteurs booléens : l'arbre entier ne se redessine pas à chaque tick de progression.
  const empty = useStore((s) => s.photos.length === 0)
  const showSheet = useStore(
    (s) => s.exportState.running || Boolean(s.exportState.result) || Boolean(s.exportState.error)
  )
  const dragDepth = useRef(0)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Import au démarrage déclenché par le main en développement (CADRE_DEV_IMPORT).
  useEffect(() => window.api.onImportRequest((paths) => void importPaths(paths)), [importPaths])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const state = useStore.getState()
      if (e.key === 'Escape') {
        if (state.eyedropperActive) {
          e.preventDefault()
          state.setEyedropper(false)
        }
        return
      }
      if (isEditable(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === 'Backspace' || e.key === 'Delete') && state.selectedId) {
        e.preventDefault()
        state.removePhoto(state.selectedId)
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        state.selectRelative(-1)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        state.selectRelative(1)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const onDragEnter = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    dragDepth.current += 1
    setDragging(true)
  }

  const onDragLeave = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragging(false)
  }

  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    void importPaths(window.api.pathsFromFiles(files))
  }

  return (
    <div
      className="app"
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <TitleBar />
      <main className="main">
        <div className="col-left">
          <PhotoStrip />
          <ScopeToggle />
          <div className={`steps-group${empty ? ' is-dimmed' : ''}`}>
            <FormatPicker />
            <BorderPanel />
          </div>
        </div>
        <div className={`col-right${empty ? ' is-dimmed' : ''}`}>
          <PreviewPane />
          {showSheet ? (
            <ExportSheet />
          ) : (
            <>
              <ExportOptions />
              <ExportButton />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
