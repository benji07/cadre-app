#!/usr/bin/env python3
"""Rend CHANGELOG.md en notes de release : uniquement les changements.

Le fichier est organisé version par version ; la page de release, elle, montre
ce que fait et ce que corrige l'application. Le titre du fichier, son chapeau,
les en-têtes de version et les paragraphes de prose sont donc retirés, et les
listes de même type sont fusionnées dans un ordre stable.

Usage : changelog-to-notes.py [CHANGELOG.md]
"""

import re
import sys

ORDRE = ["Ajouté", "Modifié", "Corrigé", "Supprimé", "Sécurité", "Déprécié"]


def rendre(texte: str) -> str:
    sections: dict[str, list[str]] = {}
    courante = None

    for ligne in texte.splitlines():
        if titre := re.fullmatch(r"#{3,}\s+(.+?)\s*", ligne):
            courante = titre.group(1)
            sections.setdefault(courante, [])
        elif re.match(r"#{1,2}\s", ligne):
            # Titre du fichier ou en-tête de version : hors sujet ici.
            courante = None
        elif courante is None:
            continue
        elif ligne.startswith("- "):
            sections[courante].append(ligne)
        elif ligne.startswith("  ") and ligne.strip() and sections[courante]:
            # Continuation de la puce précédente.
            sections[courante][-1] += "\n" + ligne

    connues = [t for t in ORDRE if sections.get(t)]
    autres = [t for t in sections if sections[t] and t not in ORDRE]

    blocs = [
        "### " + titre + "\n" + "\n".join(sections[titre])
        for titre in connues + autres
    ]
    return "\n\n".join(blocs) + "\n"


if __name__ == "__main__":
    chemin = sys.argv[1] if len(sys.argv) > 1 else "CHANGELOG.md"
    with open(chemin, encoding="utf-8") as f:
        sys.stdout.write(rendre(f.read()))
