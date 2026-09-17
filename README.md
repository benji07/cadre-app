# Cadre

Application macOS pour préparer des photos avant publication sur Instagram : choix du format, bordure de couleur, export JPEG sRGB conforme aux recommandations Instagram. Un lot de photos brutes devient une série homogène, prête à publier, en moins d'une minute.

![Cadre avec un lot de deux photos chargé : formats, bordure et aperçu](docs/screenshots/lot-charge.png)

## Ce que fait l'application

- **Import** par glisser-déposer ou sélecteur de fichiers : JPEG, PNG, HEIC, TIFF, WebP. L'orientation EXIF est appliquée, les HEIC d'iPhone passent sans étape manuelle.
- **Format** parmi 4:5 (recommandé), 3:4, 1:1 et 5:4. Règle unique : le petit côté fait toujours 1080 px (ou 2160 px en 2×).
- **Bordure** en pourcentage du petit côté, avec préréglages (aucune, fine, moyenne, large) ou curseur libre. Couleur blanc, noir, pipette dans l'aperçu, code hex ou sélecteur système.
- **Cadrage** photo entière (la photo est contenue dans le cadre) ou remplir le cadre (recadrage centré).
- **Réglages par photo** : par défaut tout le lot partage les mêmes réglages ; une bascule permet d'ajuster une photo à part, avec retour aux réglages du lot en un clic.
- **Aperçu fidèle** : le canvas utilise exactement la même géométrie que le rendu final.
- **Export** JPEG qualité 100, sous-échantillonnage 4:4:4, profil sRGB. Métadonnées EXIF supprimées par défaut ; si conservées, seule une liste blanche est réécrite et le GPS disparaît toujours.
- **Mémoire** du dossier d'export et des derniers réglages entre deux lancements.

## Avant / après

Photo d'origine, puis export 4:5 « photo entière » avec bordure blanche 6 %, puis export 4:5 « remplir le cadre » avec bordure de la couleur du ciel.

![Photo d'origine, export photo entière, export remplir le cadre](docs/screenshots/export-avant-apres.png)

## Au démarrage

![Écran d'accueil, zone de dépôt vide](docs/screenshots/accueil.png)

## Raccourcis clavier

| Touche | Action |
|---|---|
| ← / → | Photo précédente / suivante |
| Retour arrière / Suppr | Retirer la photo sélectionnée du lot |
| Échap | Quitter la pipette |

## Documentation

- [PRD](docs/PRD.md) — problème, objectifs, exigences, critères d'acceptation
- [Fonctionnalités](docs/features/) — une fiche par fonctionnalité (import, formats, bordure, réglages par photo, export)
- [Architecture](docs/architecture.md) — processus Electron, contrat IPC, pipeline image, packaging

## Développement

```bash
npm install
npm run dev        # lance l'app avec rechargement à chaud
npm test           # tests vitest (géométrie, rendu sharp, export)
npm run typecheck  # main + preload + renderer
npm run lint
```

Outils de développement, actifs uniquement avec `npm run dev` :

```bash
# Importe des photos au démarrage
CADRE_DEV_IMPORT=a.jpg,b.heic npm run dev
# Enregistre une capture de la fenêtre puis quitte (délai en ms, 4000 par défaut)
CADRE_DEV_SHOT=capture.png CADRE_DEV_SHOT_DELAY=5000 npm run dev
```

## Packaging

```bash
npm run build:mac  # produit dist/Cadre-<version>.dmg (arm64, non signé)
```

Première ouverture d'une build non signée : clic droit sur l'app → Ouvrir.

## Publier une version

Le plus simple est le skill Claude Code `/release` ([.claude/skills/release](.claude/skills/release/SKILL.md)),
qui déroule la chaîne complète : il lit les commits depuis le dernier tag, propose
le numéro de version, rédige l'entrée de [CHANGELOG.md](CHANGELOG.md), pose le
commit et le tag, crée la release GitHub et surveille le build jusqu'à ce que le
dmg y soit attaché.

À la main, la même chaîne :

```bash
npm run lint && npm run typecheck && npm test
npm version minor --no-git-tag-version        # bump package.json + lock
$EDITOR CHANGELOG.md                          # entrée de la nouvelle version
VERSION=$(node -p "require('./package.json').version")
git commit -am "Version $VERSION"
git tag -a "v$VERSION" -m "Version $VERSION"
git push --follow-tags origin main
gh release create "v$VERSION" --title "v$VERSION" --notes-file <(awk "/^## \\[$VERSION\\]/{f=1;next} /^## \\[/{f=0} f" CHANGELOG.md)
```

La version vit dans `package.json` ; le tag n'en est que le reflet. Publier la
release déclenche le workflow [Build macOS](.github/workflows/release-macos.yml),
qui construit le dmg et le zip arm64 puis les attache. Il refuse de construire si
le tag et `package.json` divergent — d'où le soin à les poser ensemble.

Pour vérifier un build sans rien publier, lancer le workflow à la main
(`gh workflow run release-macos.yml`) : les fichiers sont déposés en artefacts du run.

## Stack

Electron 39 · electron-vite · React 19 · TypeScript · zustand · sharp (libvips) · vitest

Les photos des captures sont des images de synthèse générées pour la démonstration.
