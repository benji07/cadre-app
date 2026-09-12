# Cadre

Application macOS pour préparer des photos avant publication sur Instagram : choix du format (4:5, 3:4, 1:1, 5:4), bordure de couleur paramétrable, export JPEG sRGB conforme aux recommandations Instagram.

## Documentation

- [PRD](docs/PRD.md) — problème, objectifs, exigences, critères d'acceptation
- [Fonctionnalités](docs/features/) — une fiche par fonctionnalité (import, formats, bordure, réglages par photo, export)
- [Architecture](docs/architecture.md) — processus Electron, contrat IPC, pipeline image, packaging

## Développement

```bash
npm install
npm run dev        # lance l'app avec rechargement à chaud
npm test           # tests vitest (géométrie, rendu sharp)
npm run typecheck  # main + preload + renderer
```

## Packaging

```bash
npm run build:mac  # produit dist/Cadre-<version>.dmg (arm64, non signé)
```

Première ouverture d'une build non signée : clic droit sur l'app → Ouvrir.

## Stack

Electron 39 · electron-vite · React 19 · TypeScript · zustand · sharp (libvips)
