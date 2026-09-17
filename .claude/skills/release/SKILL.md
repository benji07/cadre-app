---
name: release
description: Publie une nouvelle version de Cadre — choisit le numéro de version, rédige l'entrée de changelog, pose le tag, crée la release GitHub et surveille le build macOS jusqu'à ce que le dmg y soit attaché. À utiliser quand on demande de sortir une version, publier une release, livrer, ou faire un changelog de version.
---

# Publier une version de Cadre

Une release, ici, c'est une chaîne : un numéro de version dans `package.json`, un
tag git qui le reflète, une release GitHub sur ce tag, et un workflow qui réagit à
sa publication en construisant le dmg. Chaque maillon dépend du précédent, et le
workflow refuse de construire si le tag et `package.json` divergent. Suivre les
étapes dans l'ordre.

## 1. Vérifier que le dépôt est en état

```bash
git rev-parse --abbrev-ref HEAD   # doit être main
git status --porcelain            # doit être vide
git fetch origin && git status -sb
gh auth status
```

Arrêter et le dire si la branche n'est pas `main`, si l'arbre est sale, ou si
`main` est en retard sur `origin/main`. Ne jamais publier depuis une branche de
travail : le tag doit porter sur ce qui est réellement sur `main`.

Puis lancer les vérifications que la CI de release ne fait pas elle-même — elle
ne joue que le `typecheck` embarqué dans `npm run build:mac` :

```bash
npm run lint && npm run typecheck && npm test
```

Un échec ici arrête la release.

## 2. Lire ce qui a changé depuis la dernière version

```bash
LAST=$(git describe --tags --abbrev=0)
git log --format='%h %s%n%b' "$LAST..HEAD"
git diff --stat "$LAST..HEAD"
```

Lire les corps de commit, pas seulement les sujets : ils expliquent le pourquoi,
qui est la matière du changelog. En cas de doute sur l'effet réel d'un commit,
ouvrir le diff (`git show <sha>`) plutôt que de deviner. **Ne jamais décrire dans
le changelog un changement qu'on n'a pas vu dans le diff.**

S'il n'y a aucun commit depuis le dernier tag, le dire et s'arrêter.

## 3. Proposer le numéro de version

Cadre est en `0.x` : l'API publique n'est pas figée, donc

- **patch** (`0.1.0` → `0.1.1`) — corrections, ajustements internes, docs
- **minor** (`0.1.0` → `0.2.0`) — nouvelle fonctionnalité visible, changement de
  comportement d'export ou de rendu, toute rupture
- **major** — réservé au passage en `1.0.0`, sur décision explicite

Le rendu et l'export sont le cœur du produit : un changement qui modifie les
pixels produits est un `minor`, même si le code touché est minuscule.

Proposer le bump avec sa justification en une phrase, et **demander confirmation**
avant d'écrire quoi que ce soit. L'utilisateur peut imposer un autre numéro.

## 4. Rédiger l'entrée de changelog

Écrire dans `CHANGELOG.md`, en tête, sous le titre. Format :

```markdown
## [0.2.0] — 2026-09-18

### Ajouté
- Une phrase par changement, du point de vue de quelqu'un qui utilise l'app.

### Modifié
### Corrigé
### Supprimé
```

Règles :

- **En français**, au même registre que le README et les messages de commit :
  des phrases, pas des fragments télégraphiques.
- **Du point de vue de l'utilisateur.** « Les HEIC d'iPhone s'importent sans
  conversion préalable », pas « ajout de heif-convert dans le pipeline ».
- N'écrire que les sections qui ont du contenu ; supprimer les autres.
- **Omettre le travail invisible** : CI, refactors, dépendances, docs internes.
  S'il n'en reste rien de visible, une seule ligne suffit : « Maintenance interne,
  aucun changement visible dans l'application. »
- Dater du jour, au format `AAAA-MM-JJ`. Vérifier la date réelle plutôt que la
  supposer.

Si `CHANGELOG.md` n'existe pas, le créer avec ce chapeau :

```markdown
# Changelog

Les changements notables de Cadre, version par version.
Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versions selon [semver](https://semver.org/lang/fr/).
```

Montrer l'entrée rédigée à l'utilisateur et **attendre son accord** avant de
commiter. C'est le seul texte de la release que personne d'autre ne relira.

## 5. Poser la version et le tag

Un seul commit porte le bump et le changelog, et le tag porte dessus :

```bash
VERSION=$(npm version <bump> --no-git-tag-version | tr -d 'v')
git add package.json package-lock.json CHANGELOG.md
git commit -m "Version $VERSION"
git tag -a "v$VERSION" -m "Version $VERSION"
git push --follow-tags origin main
```

`--no-git-tag-version` est voulu : `npm version` seul commiterait sans le
changelog, et poserait le tag avant qu'on ait relu le commit.

## 6. Créer la release GitHub

Les notes sont dérivées de `CHANGELOG.md`, jamais écrites à part, et surtout pas
par `--generate-notes` qui recracherait la liste brute des commits.

Le fichier est organisé version par version ; la page de release, elle, montre ce
que fait et ce que corrige l'application. `changelog-to-notes.py` fait la
traduction : il retire le titre du fichier, son chapeau, les en-têtes de version
et les paragraphes de prose, et fusionne les listes de même type dans l'ordre
Ajouté / Modifié / Corrigé / Supprimé.

```bash
NOTES=$(mktemp)
python3 .claude/skills/release/changelog-to-notes.py CHANGELOG.md > "$NOTES"
cat "$NOTES"   # relire avant de publier
gh release create "v$VERSION" --title "v$VERSION" --notes-file "$NOTES"
```

Le corps est donc cumulatif : il décrit l'application telle qu'elle est à cette
version, pas seulement le delta. C'est voulu — quelqu'un qui arrive sur la page
de release veut savoir ce qu'il télécharge. (Limite GitHub : 125 000 caractères.
Loin devant, mais le jour où le changelog s'en approche, il faudra n'en passer
que les dernières versions au script.)

Sa publication déclenche le workflow `Build macOS`.

## 7. Suivre le build jusqu'aux binaires

La release est vide tant que le workflow n'a pas fini. Ne pas annoncer la
release comme terminée avant d'avoir vu les fichiers :

```bash
sleep 10 && gh run watch "$(gh run list --workflow=release-macos.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
gh release view "v$VERSION" --json assets --jq '.assets[].name'
```

Il faut y voir un `.dmg` et un `.zip`. Si le workflow échoue, lire le log
(`gh run view <id> --log-failed`), diagnostiquer, et le dire — la release existe
alors sans binaire, et il faudra relancer le build après correction.

Terminer en donnant l'URL de la release et la liste des fichiers attachés.
