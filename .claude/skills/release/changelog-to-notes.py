#!/usr/bin/env python3
"""Rend une section de CHANGELOG.md en notes de release.

Le fichier est organisé version par version, avec un titre, un chapeau et des
paragraphes de prose. Une page de release ne montre que les changements : ce
script en extrait les listes, sans l'appareillage du fichier.

Par défaut, la version la plus récente seule — ce que la release publie
normalement. `--all` fusionne toutes les versions, utile quand la release
précédente n'existe pas et que celle-ci doit décrire l'application entière.

Usage :
  changelog-to-notes.py [CHANGELOG.md]
  changelog-to-notes.py [CHANGELOG.md] --version 0.2.0
  changelog-to-notes.py [CHANGELOG.md] --all
"""

import argparse
import re
import sys

ORDRE = ["Ajouté", "Modifié", "Corrigé", "Supprimé", "Sécurité", "Déprécié"]


def decouper(texte):
    """CHANGELOG.md -> [(version, {type: [puces]})], du plus récent au plus ancien."""
    versions, sections, courante, version = [], {}, None, None

    def clore():
        if version is not None:
            versions.append((version, sections))

    for ligne in texte.splitlines():
        if entete := re.match(r"##\s+\[?([^\]\s]+)\]?", ligne):
            clore()
            version, sections, courante = entete.group(1), {}, None
        elif titre := re.fullmatch(r"#{3,}\s+(.+?)\s*", ligne):
            courante = titre.group(1)
            sections.setdefault(courante, [])
        elif ligne.startswith("#") or courante is None:
            continue
        elif ligne.startswith("- "):
            sections[courante].append(ligne)
        elif ligne.startswith("  ") and ligne.strip() and sections[courante]:
            sections[courante][-1] += "\n" + ligne  # continuation de puce

    clore()
    return versions


def fusionner(versions):
    fusion = {}
    for _, sections in versions:
        for titre, puces in sections.items():
            fusion.setdefault(titre, []).extend(puces)
    return fusion


def rendre(sections):
    titres = [t for t in ORDRE if sections.get(t)]
    titres += [t for t in sections if sections[t] and t not in ORDRE]
    return "\n\n".join("### " + t + "\n" + "\n".join(sections[t]) for t in titres) + "\n"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("fichier", nargs="?", default="CHANGELOG.md")
    p.add_argument("--version", help="version à extraire (défaut : la plus récente)")
    p.add_argument("--all", action="store_true", help="fusionner toutes les versions")
    args = p.parse_args()

    with open(args.fichier, encoding="utf-8") as f:
        versions = decouper(f.read())

    if not versions:
        sys.exit(f"{args.fichier} ne contient aucune version.")

    if args.all:
        sections = fusionner(versions)
    elif args.version:
        trouvees = [s for v, s in versions if v == args.version]
        if not trouvees:
            connues = ", ".join(v for v, _ in versions)
            sys.exit(f"Version {args.version} absente de {args.fichier}. Présentes : {connues}")
        sections = trouvees[0]
    else:
        sections = versions[0][1]

    if not any(sections.values()):
        cible = args.version or versions[0][0]
        sys.exit(f"La version {cible} ne liste aucun changement dans {args.fichier}.")

    sys.stdout.write(rendre(sections))


if __name__ == "__main__":
    main()
