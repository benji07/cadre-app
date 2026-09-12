# Architecture technique

## Vue d'ensemble
Application Electron (electron-vite) en trois processus :

```
┌─────────────────────────────┐        IPC typé        ┌──────────────────────────────┐
│ Renderer (React, zustand)   │ ◄────────────────────► │ Main (Node)                  │
│ · état : photos, réglages   │  importFiles           │ · fenêtre, menu, dialogues    │
│ · aperçu <canvas>           │  chooseFolder          │ · image/decode  (sips HEIC)   │
│ · pipette                   │  exportAll             │ · image/preview (sharp)       │
│                             │  onExportProgress      │ · image/render  (sharp)       │
│                             │  revealInFinder        │ · export (file de jobs)       │
└─────────────┬───────────────┘                        │ · prefs.json (userData)       │
              │ window.api                             └──────────────────────────────┘
┌─────────────┴───────────────┐
│ Preload (contextBridge)     │  expose window.api, convertit File → chemin (webUtils)
└─────────────────────────────┘
```

Le code partagé (`src/shared`) contient les types, la table des formats et la géométrie. Il est importé par les trois processus pour que l'aperçu et le rendu final utilisent le même calcul.

## Arborescence
Voir le plan dans `docs/PRD.md` et les fiches `docs/features/*.md`. Points d'entrée :
- `src/main/index.ts` — fenêtre `titleBarStyle: 'hiddenInset'`, enregistrement des IPC.
- `src/preload/index.ts` — `window.api`.
- `src/renderer/src/App.tsx` — écran unique en trois étapes.

## Contrat IPC (`src/shared/api.ts`, types dans `src/shared/types.ts`)
| Canal | Sens | Charge utile |
|---|---|---|
| `files:import` | renderer → main | `string[]` chemins → `Photo[]` (id, chemin, nom, largeur, hauteur, aperçu data URL, couleur dominante, erreur éventuelle) |
| `dialog:openFiles` | renderer → main | → `string[]` |
| `dialog:chooseFolder` | renderer → main | → `string \| null` |
| `export:run` | renderer → main | `ExportJob[]` + `ExportOptions` → `ExportResult` |
| `export:progress` | main → renderer | `{ index, total, fileName }` |
| `export:cancel` | renderer → main | — |
| `shell:reveal` | renderer → main | chemin |
| `prefs:get` / `prefs:set` | renderer → main | préférences persistées |

## Décisions techniques
- **sharp** pour le rendu : rapide (libvips), gère l'orientation EXIF, les profils ICC et l'encodage mozjpeg. Il tourne dans le main pour ne pas exposer Node au renderer.
- **HEIC via `sips`** : les binaires précompilés de sharp 0.35 lisent les métadonnées HEIC mais échouent au décodage des pixels (« Support for this compression format has not been built in », le décodeur HEVC n'est pas embarqué pour des raisons de licence). Tout `.heic` / `.heif` passe donc par `sips -s format jpeg -s formatOptions 100`, présent sur tout macOS, qui respecte orientation et profil. Le JPEG temporaire est écrit dans un dossier `mkdtemp` sous le dossier temporaire de l'app et supprimé après usage.
- **Aperçu dans un `<canvas>`** côté renderer plutôt qu'un aller-retour sharp à chaque réglage : réaction immédiate, et la géométrie partagée garantit la fidélité.
- **zustand** pour l'état : petit, sans boilerplate, sélecteurs simples pour `global` / `overrides`.
- **Préférences dans `<userData>/prefs.json`** (écriture atomique, valeurs assainies au chargement). electron-store 11 est ESM-only et son import échoue une fois bundlé par electron-vite dans le main (« Store is not a constructor ») ; un fichier JSON suffit pour cinq clés.
- **EXIF conservés = liste blanche** : sharp ne sait pas retirer sélectivement le bloc GPS. `src/main/image/exif.ts` lit l'EXIF source (IFD0 + Exif IFD, les deux ordres d'octets) et ne réécrit que Orientation = 1, Make, Model, DateTimeOriginal, ExposureTime, FNumber, ISOSpeedRatings, FocalLength. Le GPS n'est jamais écrit.
- **Modules testables sans Electron** : `render.ts`, `decode.ts`, `export.ts`, `exif.ts` n'importent pas `electron` ; le dossier temporaire est passé en paramètre.
- **Outils de dev** (jamais actifs dans l'app packagée) : `CADRE_DEV_IMPORT=a.jpg,b.heic` importe des photos au démarrage, `CADRE_DEV_SHOT=capture.png` (+ `CADRE_DEV_SHOT_DELAY` en ms) enregistre une capture de la fenêtre puis quitte. Exemple : `npx electron-vite build && CADRE_DEV_IMPORT=... CADRE_DEV_SHOT=shot.png npx electron .`.
- **Chemins des fichiers déposés** : Electron ≥ 32 n'expose plus `File.path` ; le preload utilise `webUtils.getPathForFile`.

## Packaging
- `electron-builder`, cible macOS `dmg` + `zip`, arm64.
- `asarUnpack` : `**/node_modules/sharp/**` et `**/node_modules/@img/**` (binaires natifs hors de l'asar).
- Pas de signature ni de notarisation en v1 : première ouverture par clic droit → Ouvrir.

## Tests
- `tests/geometry.test.ts` (vitest) : dimensions du cadre pour chaque format et échelle, épaisseur en px, boîte interne, position centrée.
- `tests/render.test.ts` (vitest, sharp réel) : sur des images générées à la volée (paysage avec orientation EXIF 6, portrait, AdobeRGB), vérifie dimensions de sortie pour chaque format et en 2×, bordure de 65 px, orientation appliquée, mode « remplir », EXIF absents ou liste blanche sans GPS, profil sRGB.
- `tests/export.test.ts` : lot complet (JPEG, PNG, HEIC créé via `sips`), noms de sortie, suffixe `-2` sans écrasement, progression, fichier illisible signalé sans arrêter le lot, annulation.
