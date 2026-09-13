# Cadre — Product Requirements Document

Version 1.0 · 12 septembre 2026 · Auteur : Benjamin Lévêque

## 1. Problème

Préparer une photo pour Instagram demande à chaque fois les mêmes manipulations dans un outil généraliste (Photoshop, Aperçu, une app mobile) : recadrer au bon ratio, ajouter une marge de couleur, exporter à la bonne taille, vérifier le profil colorimétrique, retirer les données GPS. C'est lent pour un lot de photos et source d'erreurs (mauvais ratio, image recompressée deux fois, EXIF conservé).

## 2. Utilisateur cible

Photographe amateur ou pro sur Mac qui publie régulièrement des séries de photos sur Instagram et veut un rendu homogène (même bordure, même format) sans passer par un logiciel lourd.

## 3. Objectifs

- Passer d'un lot de photos brutes à des fichiers prêts à publier en moins d'une minute.
- Garantir que chaque fichier respecte les recommandations Instagram (voir `features/formats.md`).
- Rendre le résultat prévisible : l'aperçu montre exactement ce qui sera exporté.

## 4. Non-objectifs (v1)

- Retouche photo (exposition, couleurs, filtres).
- Publication directe sur Instagram.
- Bordures décoratives (ombres, coins arrondis, textures).
- Recadrage manuel de la photo dans le cadre.
- Distribution signée / notarisée sur l'App Store.

## 5. Parcours utilisateur

L'écran unique suit trois étapes numérotées, avec l'aperçu en permanence à droite (maquette : https://claude.ai/code/artifact/0945baa0-16c1-4bff-8877-c9d5dcd8d6e1).

1. **Vos photos** — l'utilisateur glisse des fichiers dans la fenêtre (ou clique sur « + »). Les vignettes apparaissent, la première est sélectionnée.
2. **Format** — il choisit un ratio parmi 4:5, 3:4, 1:1, 5:4. L'aperçu se met à jour instantanément.
3. **Bordure** — il choisit une épaisseur (aucune, fine, moyenne, large, perso), une couleur (blanc, noir, pipette, code hex) et un cadrage (photo entière ou remplir le cadre).
4. **Export** — il vérifie la taille (1× ou 2×) et l'option EXIF, clique sur « Exporter les N photos », confirme le dossier de destination dans le sélecteur macOS. Une progression s'affiche, puis le Finder s'ouvre sur le dossier.

Par défaut les réglages s'appliquent à tout le lot. Une bascule « Toutes les photos / X seulement » permet d'ajuster une photo à part.

## 6. Exigences fonctionnelles

| ID | Exigence | Fiche |
|---|---|---|
| F1 | Importer des images par glisser-déposer et par sélecteur de fichiers (JPEG, PNG, HEIC, TIFF, WebP) | `features/import.md` |
| F2 | Afficher une vignette et les dimensions de chaque photo importée | `features/import.md` |
| F3 | Proposer les formats 4:5, 3:4, 1:1, 5:4 avec le petit côté à 1080 px | `features/formats.md` |
| F4 | Régler l'épaisseur de la bordure en pourcentage du petit côté, avec des préréglages | `features/bordure.md` |
| F5 | Choisir la couleur de la bordure : blanc, noir, pipette, code hex, sélecteur système | `features/bordure.md` |
| F6 | Choisir le cadrage : photo entière (contenir) ou remplir le cadre (couvrir, recadrage centré) | `features/bordure.md` |
| F7 | Appliquer les réglages à tout le lot ou à une seule photo, avec retour aux réglages du lot | `features/reglages-par-photo.md` |
| F8 | Afficher un aperçu fidèle au rendu final, mis à jour en temps réel | `features/bordure.md` |
| F9 | Exporter tout le lot en JPEG sRGB, qualité 100, petit côté 1080 ou 2160 px, sans plafond de poids | `features/export.md` |
| F10 | Supprimer les métadonnées EXIF par défaut (option désactivable) | `features/export.md` |
| F11 | Afficher la progression de l'export et ouvrir le dossier à la fin | `features/export.md` |
| F12 | Mémoriser le dossier d'export et les derniers réglages entre deux lancements | `features/export.md` |

## 7. Exigences non fonctionnelles

- **Performance** : un lot de 20 photos de 24 Mpx s'exporte en moins de 30 s sur un Mac Apple Silicon ; l'aperçu réagit en moins de 100 ms à un changement de réglage.
- **Hors ligne** : aucune connexion réseau requise (polices embarquées).
- **Plateforme** : macOS 14 ou plus récent, Apple Silicon (arm64). Build Intel possible mais non testé en v1.
- **Fiabilité** : une photo illisible n'interrompt pas le lot ; elle est signalée et ignorée.
- **Sécurité** : le renderer n'a pas accès à Node ; toutes les opérations fichier passent par des IPC typés.

## 8. Critères d'acceptation

- Glisser un JPEG paysage 6000 × 4000 avec orientation EXIF, choisir 4:5, bordure moyenne blanche, exporter : le fichier fait 1080 × 1350, l'image est droite, la bordure fait 65 px, il n'y a plus d'EXIF, le profil est sRGB.
- Le même lot en 5:4 produit des fichiers 1350 × 1080.
- Un HEIC issu d'un iPhone s'importe et s'exporte sans étape manuelle.
- Modifier la couleur d'une seule photo ne change pas les autres ; « Revenir aux réglages du lot » l'aligne de nouveau.
- L'aperçu et le fichier exporté ont les mêmes proportions de bordure au pixel près (tolérance 1 px).

## 9. Questions ouvertes

- Faut-il une option de position (haut / centre / bas) en mode « remplir le cadre » ? Reporté après v1.
- Faut-il un export PNG pour les visuels avec texte ? Reporté après v1.
