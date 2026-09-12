# Bordure, couleur et cadrage

## But
Ajouter une marge colorée homogène autour de la photo, en voyant le résultat en direct.

## Épaisseur
- Exprimée en **pourcentage du petit côté du cadre de sortie**, ce qui donne le même rendu visuel quel que soit le format ou la taille 1×/2×.
- Préréglages : Aucune (0 %), Fine (3 %), Moyenne (6 %), Large (10 %), Perso (curseur de 0 à 25 %, pas de 0,5 %).
- Conversion en pixels : `round(pourcentage × petit côté)`. Exemple : 6 % de 1080 = 65 px.

## Couleur
- Pastilles : Blanc `#FFFFFF`, Noir `#111111`.
- **Pipette** : active un mode où un clic sur l'aperçu prélève la couleur du pixel cliqué. Échap ou second clic sur « Pipette » quitte le mode.
- **Code hex** : champ éditable ; ouvre aussi le sélecteur de couleur natif macOS.
- La pastille active a un anneau accentué.

## Cadrage
- **Photo entière** (défaut) : la photo est réduite pour tenir dans la boîte interne (cadre moins bordure) ; l'espace restant prend la couleur de bordure.
- **Remplir le cadre** : la photo est agrandie pour couvrir la boîte interne et recadrée au centre.

## Aperçu
- Dessiné dans un `<canvas>` du renderer à partir de l'aperçu 1600 px et de la **même fonction de géométrie** que le rendu final (`src/shared/geometry.ts`). Ce qu'on voit est ce qu'on exporte, à 1 px près.
- Réagit en moins de 100 ms.

## Valeurs par défaut
Épaisseur Moyenne (6 %), couleur Blanc, cadrage Photo entière.

## Cas limites
- Épaisseur 0 % : pas de bordure, mais en mode « photo entière » les marges de ratio restent de la couleur choisie.
- Épaisseur telle que la boîte interne serait inférieure à 100 px : le curseur est borné à 25 %, ce cas n'arrive pas.

## Critères d'acceptation
- Bordure 6 % sur 1080 × 1350 → 65 px de chaque côté mesurés sur le fichier exporté.
- La pipette renvoie exactement la couleur du pixel de l'aperçu cliqué.

## Maquette
Étape 03 de l'écran principal.
