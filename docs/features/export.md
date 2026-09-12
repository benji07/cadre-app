# Export

## But
Produire d'un clic des fichiers prêts à publier, sans surprise sur la taille, la couleur ou les métadonnées.

## Options (sous l'aperçu)
- **Dossier proposé** : par défaut `~/Pictures/Instagram` (créé si absent), sinon le dernier dossier utilisé. Clic pour le changer à l'avance.
- **Au clic sur « Exporter »**, un sélecteur de dossier macOS s'ouvre, positionné sur le dossier proposé ; l'export démarre dans le dossier confirmé, qui devient le nouveau dossier proposé. Annuler le sélecteur annule l'export.
- **Taille** : 1× (petit côté 1080 px, défaut) ou 2× (petit côté 2160 px). Mémorisée.
- **Métadonnées EXIF** : Supprimées (défaut) ou Conservées. Si conservées, seule une liste blanche est réécrite (Orientation = 1, Make, Model, DateTimeOriginal, ExposureTime, FNumber, ISOSpeedRatings, FocalLength) ; le GPS et le reste ne sont jamais copiés.

## Pipeline (processus principal, sharp)
1. Décodage (HEIC → JPEG temporaire via `sips`).
2. `rotate()` pour appliquer l'orientation EXIF.
3. Calcul du cadre et de la boîte interne (`src/shared/geometry.ts`).
4. `resize` avec `fit: 'inside'` (photo entière) ou `fit: 'cover'` (remplir), noyau lanczos3.
5. Composition centrée sur un fond uni de la couleur de bordure aux dimensions du cadre.
6. Conversion vers sRGB (`withIccProfile('srgb')`).
7. Encodage JPEG qualité 92, sous-échantillonnage 4:4:4, mozjpeg. Si le fichier dépasse 8 Mo, ré-encodage à qualité − 4 jusqu'à passer sous la limite.

## Nommage
`<nom d'origine sans extension>_<ratio>.jpg`, par exemple `DSC_0412_4x5.jpg`. Si le fichier existe déjà : suffixe `-2`, `-3`… Jamais d'écrasement.

## Déroulement
- Bouton « Exporter les N photos » (« Exporter la photo » si N = 1 ; N = photos lisibles du lot) → sélecteur de dossier → export.
- Une feuille de progression affiche « 3 / 12 · DSC_0414.jpg » et une barre.
- Les photos sont traitées séquentiellement (sharp utilise déjà plusieurs cœurs par image).
- À la fin : « 12 photos exportées », bouton « Afficher dans le Finder » qui sélectionne le dossier. En cas d'erreurs : liste des fichiers en échec, les autres sont bien écrits.
- Le bouton est désactivé pendant l'export ; un bouton « Annuler » arrête après la photo en cours.

## Valeurs par défaut
Dossier `~/Pictures/Instagram`, taille 1×, EXIF supprimées, JPEG 92.

## Cas limites
- Dossier non accessible en écriture : message avant de commencer, rien n'est exporté.
- Disque plein (`ENOSPC`) en cours de lot : la photo en cours échoue, le lot s'arrête, les fichiers déjà écrits restent. Toute autre erreur sur une photo est consignée et le lot continue.

## Critères d'acceptation
- `sips -g pixelWidth -g pixelHeight -g profile fichier.jpg` renvoie les dimensions attendues et un profil sRGB.
- `exiftool fichier.jpg` ne montre ni GPS ni modèle d'appareil quand l'option est « Supprimées ».
- Chaque fichier fait moins de 8 Mo.
