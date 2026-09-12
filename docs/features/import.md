# Import des photos

## But
Faire entrer des photos dans l'app le plus vite possible, avec un retour visuel immédiat.

## Comportement
- **Glisser-déposer** : toute la fenêtre accepte le dépôt. Pendant le survol, la zone « Glissez d'autres photos ici » se met en surbrillance. Au dépôt, les fichiers d'image sont ajoutés à la fin du lot ; les autres types sont ignorés silencieusement.
- **Bouton « + »** : ouvre le sélecteur de fichiers macOS filtré sur les images, multi-sélection.
- **Formats acceptés** : `.jpg .jpeg .png .heic .heif .tif .tiff .webp`. Les HEIC sont convertis en JPEG temporaire via l'outil système `sips` avant traitement (les binaires de sharp lisent l'en-tête HEIC mais ne décodent pas les pixels HEVC).
- **À l'import** (3 photos en parallèle au maximum), pour chaque photo, le processus principal calcule : dimensions réelles (après orientation EXIF), un aperçu JPEG de 1600 px de large maximum, la couleur dominante.
- La première photo importée est sélectionnée ; l'aperçu l'affiche.
- Un clic sur une vignette la sélectionne. Un survol affiche une croix pour la retirer du lot.
- Un doublon (même chemin) n'est ajouté qu'une fois.

## Règles et valeurs par défaut
- Aperçu : 1600 px max, JPEG qualité 85.
- Nombre de photos : illimité en théorie ; l'interface est prévue pour une rangée défilante.

## Cas limites
- Fichier illisible ou corrompu : vignette grise avec un message « Impossible de lire ce fichier », la photo est exclue de l'export.
- Fichier très grand (> 100 Mpx) : accepté, mais l'aperçu peut prendre 1 à 2 s ; une vignette d'attente s'affiche.
- Dossier déposé : ignoré en v1 (pas de récursion).

## Critères d'acceptation
- Déposer 4 fichiers (JPEG, PNG, HEIC, TIFF) affiche 4 vignettes en moins de 3 s.
- Déposer un `.txt` ne produit ni vignette ni erreur.
- Le compteur « N photos » du bandeau se met à jour.

## Maquette
Étape 01 de l'écran principal.
