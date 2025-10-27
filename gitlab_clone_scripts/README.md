# Clonage Automatique des Repos GitLab ETNA

Système complet de clonage automatique des repos GitLab des élèves, organisé par jour et par élève.

## Table des Matières

- [Présentation](#présentation)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Scripts Disponibles](#scripts-disponibles)
- [Structure des Dossiers](#structure-des-dossiers)
- [Résolution de Problèmes](#résolution-de-problèmes)
- [Exemples](#exemples)

## Présentation

Ce système permet de cloner automatiquement tous les repos GitLab de vos élèves organisés en sous-groupes par jour.

**Fonctionnalités principales:**
- Clone tous les repos d'un jour spécifique
- Organise les repos par élève: `repos_eleves/jour001/nom_eleve/repo/`
- Met à jour automatiquement les repos existants (`git pull`)
- Affiche une progression claire avec des indicateurs visuels
- Gère la pagination de l'API GitLab
- Support de plusieurs formats de numéro de jour (1, jour1, jour001)

**Structure GitLab attendue:**
```
Groupe principal: "2025_C2WK - Octobre_IDV-VUJS_1_0"
├── Quest - Jour 001 54309
│   ├── Groupe de abdelh_a 1065535
│   ├── Groupe de aimene_s 1065531
│   └── ...
├── Quest - Jour 002 54335
│   └── ...
└── ...
```

## Installation

### Prérequis

- **Python 3.6+** (vérifiez avec `python3 --version`)
- **Git** (vérifiez avec `git --version`)
- **pip** pour installer les dépendances Python

### Étapes d'installation

1. **Téléchargez tous les fichiers** dans un dossier dédié

2. **Installez les dépendances Python:**
   ```bash
   pip3 install -r requirements.txt
   ```

3. **Rendez les scripts exécutables** (Linux/Mac):
   ```bash
   chmod +x clone_repos_etna.py
   chmod +x find_group_id.py
   chmod +x list_jours_disponibles.py
   chmod +x clone_tous_les_jours.sh
   ```

## Configuration

### 1. Obtenir un Token GitLab

1. Connectez-vous à votre GitLab
2. Allez dans **Settings > Access Tokens**
3. Créez un token avec les permissions:
   - `read_api`
   - `read_repository`
4. **Copiez le token** (vous ne pourrez plus le voir après)

### 2. Trouver l'ID du Groupe Principal

Utilisez le script helper interactif:

```bash
python3 find_group_id.py
```

Le script vous demandera:
- L'URL GitLab (ex: `https://gitlab.com` ou `https://gitlab.etna-alternance.net`)
- Votre token d'accès
- Puis il affichera tous vos groupes avec leurs IDs

Cherchez votre groupe principal (ex: "2025_C2WK - Octobre_IDV-VUJS_1_0") et notez son **ID**.

### 3. Créer le Fichier de Configuration

```bash
cp config_etna.example.py config_etna.py
```

Éditez `config_etna.py` avec vos informations:

```python
GITLAB_URL = "https://gitlab.com"  # ou votre URL ETNA
GITLAB_TOKEN = "glpat-VOTRE_TOKEN_ICI"
MAIN_GROUP_ID = 12345678  # L'ID trouvé avec find_group_id.py
BASE_DIR = "./repos_eleves"  # Où stocker les repos
```

**IMPORTANT:** Ne partagez JAMAIS votre `config_etna.py` (il contient votre token!)

## Utilisation

### Lister les Jours Disponibles

Avant de cloner, vérifiez quels jours sont disponibles:

```bash
python3 list_jours_disponibles.py
```

Résultat:
```
============================================================
📚 JOURS DISPONIBLES
============================================================

📅 JOUR 001
   Nom: Quest - Jour 001 54309
   ID: 123456
   📦 Repos: 25

📅 JOUR 002
   Nom: Quest - Jour 002 54335
   ID: 123457
   📦 Repos: 24
```

### Cloner un Jour Spécifique

```bash
python3 clone_repos_etna.py 1
```

Formats acceptés:
- `python3 clone_repos_etna.py 1`
- `python3 clone_repos_etna.py jour1`
- `python3 clone_repos_etna.py jour001`

Le script va:
1. Chercher le groupe "Quest - Jour 001"
2. Récupérer tous les repos du groupe
3. Les cloner dans `repos_eleves/jour001/nom_eleve/`
4. Faire un `git pull` si le repo existe déjà

### Cloner Tous les Jours

Pour cloner les jours 1 à 5 automatiquement:

```bash
bash clone_tous_les_jours.sh
```

Ou spécifier une plage:

```bash
bash clone_tous_les_jours.sh 1 10  # Jours 1 à 10
```

## Scripts Disponibles

| Script | Description |
|--------|-------------|
| `clone_repos_etna.py` | Script principal de clonage |
| `find_group_id.py` | Helper pour trouver l'ID du groupe |
| `list_jours_disponibles.py` | Liste tous les jours disponibles |
| `clone_tous_les_jours.sh` | Clone automatiquement plusieurs jours |
| `config_etna.example.py` | Fichier de configuration exemple |

## Structure des Dossiers

Après clonage, voici la structure créée:

```
repos_eleves/
├── jour001/
│   ├── abdelh_a/
│   │   └── quest-jour-001/  # Repo GitLab cloné
│   ├── aimene_s/
│   │   └── quest-jour-001/
│   └── ...
├── jour002/
│   ├── abdelh_a/
│   │   └── quest-jour-002/
│   └── ...
└── ...
```

**Organisation:**
- `jourXXX/` : Dossier pour chaque jour
- `nom_eleve/` : Dossier pour chaque élève
- `nom_repo/` : Repo Git cloné de l'élève

## Résolution de Problèmes

### Erreur: "fichier config_etna.py introuvable"

**Solution:**
```bash
cp config_etna.example.py config_etna.py
# Puis éditez config_etna.py avec vos informations
```

### Erreur: "Module 'requests' non installé"

**Solution:**
```bash
pip3 install requests
```

### Erreur: "401 Unauthorized"

**Causes possibles:**
1. Token invalide ou expiré
2. Token sans les bonnes permissions

**Solution:**
1. Créez un nouveau token GitLab
2. Vérifiez les permissions: `read_api`, `read_repository`
3. Mettez à jour `GITLAB_TOKEN` dans `config_etna.py`

### Erreur: "Aucun groupe trouvé pour le jour X"

**Causes possibles:**
1. Le jour n'existe pas
2. Mauvais format de nom du groupe

**Solution:**
```bash
# Listez les jours disponibles
python3 list_jours_disponibles.py

# Vérifiez que les groupes suivent le format: "Quest - Jour XXX"
```

### Erreur: "403 Forbidden"

**Cause:** Vous n'avez pas accès au groupe

**Solution:**
1. Vérifiez que vous êtes membre du groupe principal
2. Demandez les accès appropriés à l'administrateur

### Erreur: "Timeout lors de l'opération Git"

**Cause:** Repo trop volumineux ou connexion lente

**Solution:**
1. Vérifiez votre connexion internet
2. Réessayez plus tard
3. Clonez les repos un par un

### Le clonage est très lent

**Optimisations possibles:**

1. **Clone shallow** (historique limité):
   Modifiez `clone_repos_etna.py` ligne 199:
   ```python
   ['git', 'clone', '--depth', '1', authenticated_url, repo_dir]
   ```

2. **Clonez seulement certains jours:**
   ```bash
   python3 clone_repos_etna.py 1  # Jour 1 uniquement
   ```

## Exemples

### Exemple 1: Premier Clonage Complet

```bash
# 1. Configuration
cp config_etna.example.py config_etna.py
nano config_etna.py  # Éditez avec vos infos

# 2. Vérification
python3 list_jours_disponibles.py

# 3. Clone tous les jours
bash clone_tous_les_jours.sh
```

### Exemple 2: Mise à Jour Quotidienne

```bash
# Clone/met à jour le jour 1
python3 clone_repos_etna.py 1
```

Le script fait automatiquement un `git pull` sur les repos existants.

### Exemple 3: Clone Sélectif

```bash
# Clone seulement les jours 3, 4, 5
for jour in 3 4 5; do
    python3 clone_repos_etna.py $jour
done
```

### Exemple 4: Automatisation avec Cron

Mettez à jour automatiquement tous les jours à 18h:

```bash
# Éditez votre crontab
crontab -e

# Ajoutez:
0 18 * * * cd /chemin/vers/scripts && python3 clone_repos_etna.py 1
```

## Sécurité

**IMPORTANT - Bonnes Pratiques:**

1. **Ne committez JAMAIS `config_etna.py`** dans Git
2. **Gardez votre token secret** - ne le partagez jamais
3. Le `.gitignore` protège automatiquement:
   - `config_etna.py`
   - `repos_eleves/`
   - `__pycache__/`

4. **Permissions du token** - Minimum requis:
   - `read_api`
   - `read_repository`
   - **NE donnez PAS** `write` ou `admin` sauf si nécessaire

5. **Révocation** - Si votre token est compromis:
   - Révoquéz-le immédiatement dans GitLab
   - Créez-en un nouveau
   - Mettez à jour `config_etna.py`

## Contribution

Si vous améliorez ces scripts:

1. Testez bien vos modifications
2. Documentez les nouvelles fonctionnalités
3. Respectez le style de code existant
4. Ajoutez des commentaires en français

## Support

Pour plus d'aide:

1. Lisez [QUICKSTART.md](QUICKSTART.md) pour un guide rapide
2. Consultez [STRUCTURE.md](STRUCTURE.md) pour les diagrammes
3. Vérifiez [INDEX.md](INDEX.md) pour la liste des fichiers

## Licence

Scripts à usage éducatif pour l'ETNA.
Libre d'utilisation et de modification.
