# Changelog

Les changements notables de Cadre, version par version.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versions selon [semver](https://semver.org/lang/fr/).

## [0.1.0] — 2026-09-17

L'application est inchangée depuis la 0.0.1 : c'est le même code. Cette version
existe parce que la release 0.0.1 avait été publiée sans aucun fichier, son build
ayant échoué au moment de les attacher. La 0.1.0 est donc la première version
réellement téléchargeable.

### Corrigé
- Le dmg et le zip arm64 sont attachés à la release au lieu d'être construits
  puis perdus.

## [0.0.1] — 2026-09-14

Première version publiée.

### Ajouté
- Import de photos par glisser-déposer ou sélecteur de fichiers, en JPEG, PNG,
  HEIC, TIFF et WebP, avec application de l'orientation EXIF.
- Formats 4:5, 3:4, 1:1 et 5:4, le petit côté faisant toujours 1080 px, ou
  2160 px en export 2×.
- Bordure dimensionnée en pourcentage du petit côté, par préréglages ou au
  curseur, de couleur libre : blanc, noir, pipette dans l'aperçu, code hex ou
  sélecteur système.
- Cadrage au choix entre photo entière et remplissage du cadre.
- Réglages partagés par le lot, qu'une bascule permet d'ajuster photo par photo.
- Aperçu utilisant la même géométrie que le rendu final.
- Export JPEG sRGB, sous-échantillonnage 4:4:4, métadonnées EXIF supprimées par
  défaut et GPS systématiquement retiré.
- Mémoire du dossier d'export et des derniers réglages entre deux lancements.
