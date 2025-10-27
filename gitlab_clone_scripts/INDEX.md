# Index des Fichiers - Clonage GitLab ETNA

Documentation complète de tous les fichiers du système.

## Scripts Principaux

### clone_repos_etna.py
**Type:** Script Python exécutable
**Usage:** `python3 clone_repos_etna.py <numero_jour>`
**Description:** Script principal de clonage des repos GitLab

**Fonctionnalités:**
- Clone tous les repos d'un jour spécifié
- Organise les repos par élève
- Fait un `git pull` si le repo existe déjà
- Gère la pagination de l'API GitLab
- Affiche une progression détaillée

**Exemples:**
```bash
python3 clone_repos_etna.py 1
python3 clone_repos_etna.py jour001
```

**Dépendances:** `config_etna.py`, `requests`

---

### clone_tous_les_jours.sh
**Type:** Script Bash exécutable
**Usage:** `bash clone_tous_les_jours.sh [debut] [fin]`
**Description:** Clone automatiquement une plage de jours

**Fonctionnalités:**
- Clone plusieurs jours en séquence
- Vérifie les dépendances
- Affiche un résumé final
- Gère les erreurs par jour

**Exemples:**
```bash
bash clone_tous_les_jours.sh        # Jours 1-5
bash clone_tous_les_jours.sh 1 10   # Jours 1-10
```

**Dépendances:** `clone_repos_etna.py`, `config_etna.py`

---

## Scripts Helpers

### find_group_id.py
**Type:** Script Python interactif
**Usage:** `python3 find_group_id.py`
**Description:** Aide à trouver l'ID du groupe principal GitLab

**Fonctionnalités:**
- Demande interactivement l'URL et le token
- Affiche tous les groupes accessibles
- Permet de chercher par terme
- Affiche les IDs des groupes

**Workflow:**
1. Entrez URL GitLab
2. Entrez votre token
3. Tous les groupes sont affichés avec leurs IDs
4. Option de recherche par terme

**Dépendances:** `requests`

---

### list_jours_disponibles.py
**Type:** Script Python exécutable
**Usage:** `python3 list_jours_disponibles.py`
**Description:** Liste tous les jours disponibles avec leur nombre de repos

**Fonctionnalités:**
- Liste tous les sous-groupes "Quest - Jour XXX"
- Compte le nombre de repos par jour
- Trie par numéro de jour
- Affiche les IDs des groupes

**Exemple de sortie:**
```
📅 JOUR 001
   Nom: Quest - Jour 001 54309
   ID: 123456
   📦 Repos: 25
```

**Dépendances:** `config_etna.py`, `requests`

---

## Configuration

### config_etna.example.py
**Type:** Fichier de configuration exemple
**Usage:** Modèle pour `config_etna.py`
**Description:** Fichier de configuration exemple avec documentation

**Contenu:**
- `GITLAB_URL`: URL de l'instance GitLab
- `GITLAB_TOKEN`: Token d'accès personnel
- `MAIN_GROUP_ID`: ID du groupe principal
- `BASE_DIR`: Répertoire de destination

**Instructions:**
```bash
cp config_etna.example.py config_etna.py
nano config_etna.py  # Éditez avec vos infos
```

**IMPORTANT:** Ne committez jamais `config_etna.py` (contient le token)

---

### config_etna.py
**Type:** Fichier de configuration (à créer)
**Usage:** Configuration personnelle
**Description:** Votre configuration avec vos credentials

**Créé depuis:** `config_etna.example.py`
**Protégé par:** `.gitignore`
**Requis pour:** Tous les scripts

---

## Documentation

### README.md
**Type:** Documentation principale
**Description:** Documentation complète du système

**Sections:**
- Présentation
- Installation
- Configuration détaillée
- Utilisation
- Résolution de problèmes
- Exemples
- Sécurité

**Pour qui:** Tous les utilisateurs

---

### QUICKSTART.md
**Type:** Guide de démarrage rapide
**Description:** Guide en 5 minutes pour commencer

**Contenu:**
- Installation rapide
- Configuration minimale
- Premiers clonages
- Problèmes courants

**Pour qui:** Nouveaux utilisateurs pressés

---

### STRUCTURE.md
**Type:** Documentation technique
**Description:** Diagrammes de la structure du système

**Contenu:**
- Structure GitLab
- Organisation des dossiers
- Flux de travail
- Architecture des scripts

**Pour qui:** Développeurs, utilisateurs avancés

---

### INDEX.md
**Type:** Index des fichiers (ce fichier)
**Description:** Liste et décrit tous les fichiers

**Pour qui:** Référence rapide

---

## Fichiers de Support

### requirements.txt
**Type:** Liste de dépendances Python
**Usage:** `pip3 install -r requirements.txt`
**Description:** Liste des packages Python requis

**Contenu:**
```
requests>=2.28.0
```

**Installation:**
```bash
pip3 install -r requirements.txt
```

---

### .gitignore
**Type:** Configuration Git
**Description:** Protège les fichiers sensibles du commit

**Fichiers protégés:**
- `config_etna.py` (contient le token)
- `repos_eleves/` (repos clonés)
- `__pycache__/` (cache Python)
- `*.pyc` (bytecode Python)

**Pourquoi:** Sécurité et propreté du repo

---

## Structure des Dossiers Générés

### repos_eleves/
**Type:** Dossier (généré automatiquement)
**Description:** Contient tous les repos clonés

**Structure:**
```
repos_eleves/
├── jour001/
│   ├── eleve1/
│   │   └── repo_name/
│   └── eleve2/
│       └── repo_name/
└── jour002/
    └── ...
```

**Protégé par:** `.gitignore`

---

## Tableau Récapitulatif

| Fichier | Type | Usage | Requis |
|---------|------|-------|--------|
| clone_repos_etna.py | Script | Clonage d'un jour | Oui |
| clone_tous_les_jours.sh | Script | Clonage multi-jours | Optionnel |
| find_group_id.py | Helper | Trouver l'ID groupe | Configuration |
| list_jours_disponibles.py | Helper | Lister les jours | Optionnel |
| config_etna.example.py | Config | Modèle config | Non |
| config_etna.py | Config | Config perso | Oui |
| requirements.txt | Support | Dépendances | Oui |
| .gitignore | Support | Protection Git | Recommandé |
| README.md | Doc | Doc complète | Lecture |
| QUICKSTART.md | Doc | Guide rapide | Débutants |
| STRUCTURE.md | Doc | Diagrammes | Référence |
| INDEX.md | Doc | Ce fichier | Référence |

---

## Ordre d'Utilisation Recommandé

### Première Installation
1. `requirements.txt` - Installer les dépendances
2. `find_group_id.py` - Trouver l'ID du groupe
3. `config_etna.example.py` → `config_etna.py` - Configuration
4. `list_jours_disponibles.py` - Vérifier les jours
5. `clone_repos_etna.py` ou `clone_tous_les_jours.sh` - Clonage

### Usage Quotidien
1. `list_jours_disponibles.py` - (Optionnel) Voir les jours
2. `clone_repos_etna.py` - Cloner/mettre à jour un jour

---

## Chemins et Dépendances

### Graphe de Dépendances

```
config_etna.py (requis par)
├── clone_repos_etna.py
├── list_jours_disponibles.py
└── (via) clone_tous_les_jours.sh

requests (requis par)
├── clone_repos_etna.py
├── find_group_id.py
└── list_jours_disponibles.py

clone_repos_etna.py (requis par)
└── clone_tous_les_jours.sh
```

---

## Permissions et Sécurité

### Fichiers à Protéger
- `config_etna.py` - Contient le token (SENSIBLE)
- `repos_eleves/` - Peut contenir code sensible

### Fichiers Partageables
- Tous les `.py` sauf `config_etna.py`
- Tous les `.md`
- `requirements.txt`
- `.gitignore`
- `.sh` scripts

---

## Pour Aller Plus Loin

- **Personnalisation:** Modifiez les scripts selon vos besoins
- **Automatisation:** Utilisez cron pour automatiser les clonages
- **Extensions:** Ajoutez vos propres fonctionnalités

**Questions?** Consultez [README.md](README.md) pour plus de détails.
