# Formats et recommandations Instagram

## But
Produire des fichiers au ratio et à la taille qu'Instagram affiche sans les recadrer ni les dégrader plus que nécessaire.

## Ce que fait Instagram (vérifié septembre 2026)
- Le fil affiche les photos à **1080 px de large maximum** ; tout fichier plus large est réduit par Instagram.
- Ratios acceptés dans le fil : de 1,91:1 (paysage) à 4:5 (portrait). Le **3:4** est accepté nativement depuis mai 2025 et correspond à la **grille du profil**, qui recadre les aperçus en 3:4.
- Formats de fichier : JPEG ou PNG, moins de 8 Mo. L'app n'impose pas cette limite : elle exporte en qualité 100 (voir `features/export.md`).
- Sources : guides 2026 de Buffer, Influencer Marketing Hub, Hootsuite et SocialBee. Meta ne publie pas de page officielle avec ces chiffres.

## Règle de l'app : le petit côté fait toujours 1080 px
Décision produit : un paysage est un portrait tourné, donc on garde 1080 px sur le petit côté quel que soit le format.

| Format | Nom affiché | Sortie 1× | Sortie 2× | Remarque |
|---|---|---|---|---|
| 4:5 | Portrait | 1080 × 1350 | 2160 × 2700 | recommandé pour le fil |
| 3:4 | Grille | 1080 × 1440 | 2160 × 2880 | ratio de la grille du profil |
| 1:1 | Carré | 1080 × 1080 | 2160 × 2160 | |
| 5:4 | Paysage | 1350 × 1080 | 2700 × 2160 | Instagram le réduira à 1080 × 864 |

## Comportement
- Quatre cartes, une par format, avec un pictogramme à la bonne proportion, les dimensions de sortie et une indication courte (« recommandé », « grille du profil », « réduit par Instagram »).
- Le format sélectionné a un contour accentué. Un seul format à la fois par photo.
- Changer de format met à jour l'aperçu et le libellé « Sortie W × H » sous l'aperçu.
- Le format fait partie des réglages du lot ; il peut être surchargé par photo (voir `reglages-par-photo.md`).

## Valeurs par défaut
- Format : 4:5.
- Taille : 1× (petit côté 1080).

## Cas limites
- Photo déjà au ratio cible : en mode « photo entière », la bordure est uniforme sur les quatre côtés.
- Photo très allongée (panorama) en mode « photo entière » : de larges marges apparaissent en haut et en bas, de la couleur de la bordure. C'est voulu ; le mode « remplir » est l'alternative.

## Critères d'acceptation
- Export en 4:5 → fichiers 1080 × 1350 exactement ; en 5:4 → 1350 × 1080 ; en 2× les valeurs doublent.
