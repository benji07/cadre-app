import { app, shell, BrowserWindow, Menu } from 'electron'
import { join } from 'node:path'
import { writeFile } from 'node:fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC } from '../shared/api'
import { registerIpcHandlers } from './ipc'

const APP_NAME = 'Cadre'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 1100,
    minHeight: 760,
    show: false,
    // Même valeur que --bg dans src/renderer/src/styles/tokens.css (évite un flash blanc).
    backgroundColor: '#f7f3ee',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 20, y: 18 },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Outils de développement (jamais actifs dans l'app packagée) :
  // CADRE_DEV_IMPORT=a.jpg,b.heic importe des photos au démarrage,
  // CADRE_DEV_SHOT=capture.png enregistre une capture de la fenêtre puis quitte.
  if (is.dev) {
    const devImport = process.env['CADRE_DEV_IMPORT']
    const devShot = process.env['CADRE_DEV_SHOT']
    mainWindow.webContents.on('did-finish-load', () => {
      if (devImport) mainWindow.webContents.send(IPC.importRequest, devImport.split(','))
      if (devShot) {
        setTimeout(
          async () => {
            const image = await mainWindow.webContents.capturePage()
            await writeFile(devShot, image.toPNG())
            app.quit()
          },
          Number(process.env['CADRE_DEV_SHOT_DELAY'] ?? 4000)
        )
      }
    })
  }

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** Menu macOS minimal : Cadre (Quitter), Édition (copier/coller), Fenêtre. */
function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: APP_NAME,
      submenu: [
        { role: 'about', label: `À propos de ${APP_NAME}` },
        { type: 'separator' },
        { role: 'hide', label: `Masquer ${APP_NAME}` },
        { role: 'hideOthers', label: 'Masquer les autres' },
        { role: 'unhide', label: 'Tout afficher' },
        { type: 'separator' },
        { role: 'quit', label: `Quitter ${APP_NAME}` }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' }
      ]
    },
    {
      label: 'Fenêtre',
      role: 'windowMenu'
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.setName(APP_NAME)

app.whenReady().then(() => {
  electronApp.setAppUserModelId('fr.elao.cadre')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  buildMenu()
  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
