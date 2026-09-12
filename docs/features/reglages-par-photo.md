# Réglages du lot et réglages par photo

## But
Traiter un lot homogène en une fois, tout en permettant d'ajuster une photo qui fait exception (un paysage dans une série de portraits, une photo qui appelle une autre couleur).

## Modèle
- `global : Settings` — format, épaisseur, couleur, cadrage. S'applique à toutes les photos.
- `overrides : Record<photoId, Partial<Settings>>` — pour une photo, seuls les champs modifiés « à part » sont stockés.
- Réglage effectif d'une photo = `{ ...global, ...overrides[id] }`.

## Comportement
- Bascule au-dessus des étapes 02 et 03 : **« Toutes les photos »** / **« <nom de la photo sélectionnée> seulement »**.
- En mode « Toutes les photos », modifier un réglage change `global`. Les photos qui ont une surcharge sur ce champ la conservent.
- En mode « X seulement », modifier un réglage écrit dans `overrides[X]`. Les autres photos ne bougent pas.
- Une photo avec au moins une surcharge affiche un **badge** (point noir) sur sa vignette.
- En mode « X seulement », un lien « Revenir aux réglages du lot » supprime `overrides[X]`.
- Sélectionner une autre vignette conserve le mode courant.

## Valeurs par défaut
Mode « Toutes les photos ».

## Cas limites
- Retirer une photo du lot supprime aussi sa surcharge.
- Aucune photo importée : la bascule est masquée.

## Critères d'acceptation
- Changer la couleur en mode « X seulement » puis passer en mode lot et changer le format : X garde sa couleur et prend le nouveau format.
- « Revenir aux réglages du lot » fait disparaître le badge et réaligne l'aperçu.

## Maquette
Bascule entre les étapes 01 et 02 ; badge sur la troisième vignette.
