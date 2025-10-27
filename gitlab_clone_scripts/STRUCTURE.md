# Structure du Système - Diagrammes

Documentation technique avec diagrammes ASCII de la structure du système.

## Table des Matières
- [Structure GitLab](#structure-gitlab)
- [Organisation des Dossiers Locaux](#organisation-des-dossiers-locaux)
- [Architecture des Scripts](#architecture-des-scripts)
- [Flux de Travail](#flux-de-travail)
- [Flux de Données](#flux-de-données)

---

## Structure GitLab

### Vue d'Ensemble

```
GitLab Instance (gitlab.com ou ETNA)
│
└── 📁 Groupe Principal
    "2025_C2WK - Octobre_IDV-VUJS_1_0"
    ID: MAIN_GROUP_ID (ex: 12345678)
    │
    ├── 📁 Quest - Jour 001 54309
    │   │   (Sous-groupe ID: 54309)
    │   ├── 📦 Groupe de abdelh_a 1065535
    │   │   └── 📄 Projet/Repo GitLab
    │   ├── 📦 Groupe de aimene_s 1065531
    │   │   └── 📄 Projet/Repo GitLab
    │   ├── 📦 Groupe de benoit_m 1065542
    │   │   └── 📄 Projet/Repo GitLab
    │   └── ... (autres élèves)
    │
    ├── 📁 Quest - Jour 002 54335
    │   │   (Sous-groupe ID: 54335)
    │   ├── 📦 Groupe de abdelh_a 1065536
    │   ├── 📦 Groupe de aimene_s 1065537
    │   └── ...
    │
    ├── 📁 Quest - Jour 003 54401
    │   └── ...
    │
    └── ... (autres jours)
```

### Hiérarchie Détaillée

```
Niveau 0: Instance GitLab
    │
    └── Niveau 1: Groupe Principal
        "2025_C2WK - Octobre_IDV-VUJS_1_0"
        │
        └── Niveau 2: Sous-groupes Jour
            "Quest - Jour XXX [ID]"
            │
            └── Niveau 3: Groupes Élèves
                "Groupe de nom_eleve [ID]"
                │
                └── Niveau 4: Projets/Repos
                    Code source de l'élève
```

---

## Organisation des Dossiers Locaux

### Structure Créée par les Scripts

```
📁 votre_dossier_travail/
│
├── 📄 clone_repos_etna.py          # Script principal
├── 📄 clone_tous_les_jours.sh      # Script batch
├── 📄 find_group_id.py             # Helper ID
├── 📄 list_jours_disponibles.py    # Helper listing
├── 📄 config_etna.py               # CONFIG (à créer)
├── 📄 config_etna.example.py       # Config exemple
├── 📄 requirements.txt             # Dépendances
├── 📄 .gitignore                   # Protection Git
├── 📄 README.md                    # Doc principale
├── 📄 QUICKSTART.md                # Guide rapide
├── 📄 INDEX.md                     # Index fichiers
├── 📄 STRUCTURE.md                 # Ce fichier
│
└── 📁 repos_eleves/                # GÉNÉRÉ automatiquement
    │
    ├── 📁 jour001/
    │   ├── 📁 abdelh_a/
    │   │   └── 📁 quest-jour-001/
    │   │       ├── .git/
    │   │       ├── src/
    │   │       ├── README.md
    │   │       └── ...
    │   │
    │   ├── 📁 aimene_s/
    │   │   └── 📁 quest-jour-001/
    │   │       └── ...
    │   │
    │   ├── 📁 benoit_m/
    │   │   └── 📁 quest-jour-001/
    │   │       └── ...
    │   │
    │   └── ... (autres élèves)
    │
    ├── 📁 jour002/
    │   ├── 📁 abdelh_a/
    │   │   └── 📁 quest-jour-002/
    │   ├── 📁 aimene_s/
    │   │   └── 📁 quest-jour-002/
    │   └── ...
    │
    ├── 📁 jour003/
    │   └── ...
    │
    └── ... (autres jours)
```

### Détail d'un Repo Cloné

```
📁 repos_eleves/jour001/abdelh_a/quest-jour-001/
├── 📁 .git/                    # Repo Git complet
│   ├── objects/
│   ├── refs/
│   ├── config
│   └── ...
│
├── 📁 src/                     # Code source (exemple)
│   ├── main.c
│   ├── utils.c
│   └── ...
│
├── 📁 tests/                   # Tests (exemple)
│   └── test_main.c
│
├── 📄 README.md                # Doc du projet
├── 📄 Makefile                 # Build (exemple)
└── ... (autres fichiers du projet)
```

### Conventions de Nommage

```
Patron: repos_eleves/jour{XXX}/{nom_eleve}/{nom_repo}/

Où:
  - {XXX}        = Numéro jour sur 3 chiffres (001, 002, ...)
  - {nom_eleve}  = Extrait de "Groupe de nom_eleve ID"
  - {nom_repo}   = Nom du repo GitLab (path)

Exemples:
  repos_eleves/jour001/abdelh_a/quest-jour-001/
  repos_eleves/jour002/aimene_s/my-project/
  repos_eleves/jour042/benoit_m/exercice-42/
```

---

## Architecture des Scripts

### Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR                          │
└────────────┬────────────────────────────────────────────┘
             │
             │ Commandes
             │
    ┌────────┴─────────┬─────────────┬──────────────┐
    │                  │             │              │
    ▼                  ▼             ▼              ▼
┌───────┐      ┌─────────────┐  ┌─────────┐  ┌──────────┐
│ find  │      │    clone    │  │  list   │  │  clone   │
│_group │      │_repos_etna  │  │ _jours  │  │tous_jours│
│_id.py │      │    .py      │  │_dispo.py│  │  .sh     │
└───┬───┘      └──────┬──────┘  └────┬────┘  └────┬─────┘
    │                 │              │            │
    │                 │              │            │ (appelle)
    │                 │              │            │
    │                 │              │            ▼
    │                 │              │     ┌─────────────┐
    │                 │              │     │clone_repos  │
    │                 │              │     │  _etna.py   │
    │                 │              │     └──────┬──────┘
    │                 │              │            │
    └────────┬────────┴──────────────┴────────────┘
             │
             │ Lit configuration
             │
             ▼
      ┌──────────────┐
      │config_etna.py│
      └──────┬───────┘
             │
             │ Contient:
             │ - GITLAB_URL
             │ - GITLAB_TOKEN
             │ - MAIN_GROUP_ID
             │ - BASE_DIR
             │
             ▼
      ┌──────────────┐
      │  API GitLab  │
      └──────┬───────┘
             │
             ▼
      ┌──────────────┐
      │ Repos Clonés │
      └──────────────┘
```

### Détail des Composants

```
┌──────────────────────────────────────────────────────┐
│           clone_repos_etna.py (Principal)            │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [1] Normaliser numéro jour                         │
│       normaliser_numero_jour()                      │
│       "1" → "001"                                   │
│                                                      │
│  [2] Trouver groupe du jour                         │
│       trouver_groupe_jour()                         │
│       → get_all_subgroups()                         │
│                                                      │
│  [3] Récupérer projets                              │
│       get_all_projects()                            │
│       (avec pagination)                             │
│                                                      │
│  [4] Pour chaque projet:                            │
│       extraire_nom_eleve()                          │
│       clone_ou_pull_repo()                          │
│         ├─ Si existe: git pull                      │
│         └─ Sinon: git clone                         │
│                                                      │
│  [5] Afficher résumé                                │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## Flux de Travail

### Workflow Complet - Première Installation

```
┌─────────────────────┐
│  1. INSTALLATION    │
│                     │
│  pip3 install -r    │
│  requirements.txt   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. TROUVER ID      │
│     GROUPE          │
│                     │
│  python3            │
│  find_group_id.py   │
│                     │
│  → Note l'ID        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. CONFIGURATION   │
│                     │
│  cp config_etna     │
│    .example.py      │
│    config_etna.py   │
│                     │
│  Éditer:            │
│  - GITLAB_TOKEN     │
│  - MAIN_GROUP_ID    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. VÉRIFICATION    │
│                     │
│  python3 list_      │
│  jours_disponibles  │
│  .py                │
│                     │
│  → Voir les jours   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. CLONAGE         │
│                     │
│  Option A:          │
│  python3 clone_     │
│  repos_etna.py 1    │
│                     │
│  Option B:          │
│  bash clone_tous_   │
│  les_jours.sh       │
└─────────────────────┘
```

### Workflow - Usage Quotidien

```
┌────────────────────┐
│  MISE À JOUR       │
│  QUOTIDIENNE       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐        ┌─────────────────┐
│ Lister les jours?  │───OUI─→│ python3 list_   │
│   (Optionnel)      │        │ jours_dispo.py  │
└─────────┬──────────┘        └─────────────────┘
          │
          │ NON
          │
          ▼
┌────────────────────┐
│  Cloner/Mettre     │
│  à jour un jour    │
│                    │
│  python3 clone_    │
│  repos_etna.py 1   │
│                    │
│  (fait auto un     │
│   git pull si      │
│   existe déjà)     │
└────────────────────┘
```

---

## Flux de Données

### Flux: clone_repos_etna.py

```
[ENTRÉE: Numéro de jour]
         │
         ▼
    ┌─────────┐
    │ Normali-│
    │  ser    │
    └────┬────┘
         │
         ▼ "001"
    ┌─────────────────┐
    │ API GitLab:     │
    │ GET /groups/    │
    │ {MAIN_GROUP_ID}/│
    │ subgroups       │
    └────┬────────────┘
         │
         ▼ Liste sous-groupes
    ┌─────────────────┐
    │ Filtrer:        │
    │ "Quest - Jour   │
    │  001"           │
    └────┬────────────┘
         │
         ▼ Groupe du jour
    ┌─────────────────┐
    │ API GitLab:     │
    │ GET /groups/    │
    │ {jour_id}/      │
    │ projects        │
    └────┬────────────┘
         │
         ▼ Liste projets
    ┌─────────────────┐
    │ Pour chaque:    │
    │                 │
    │ 1. Extraire nom │
    │    élève        │
    │                 │
    │ 2. Créer path   │
    │    local        │
    │                 │
    │ 3. git clone    │
    │    ou git pull  │
    └────┬────────────┘
         │
         ▼
    ┌─────────────────┐
    │ repos_eleves/   │
    │ jour001/        │
    │   nom_eleve/    │
    │     repo/       │
    └─────────────────┘
         │
         ▼
[SORTIE: Repos clonés/mis à jour]
```

### Flux API - Détaillé

```
Script                    API GitLab                Résultat
  │                          │
  │  GET /groups/{id}/       │
  │  subgroups?page=1        │
  ├─────────────────────────>│
  │                          │
  │  [...]  (JSON)           │
  │<─────────────────────────┤
  │                          │
  │  GET /groups/{id}/       │
  │  subgroups?page=2        │
  ├─────────────────────────>│
  │                          │
  │  []  (vide = fin)        │
  │<─────────────────────────┤
  │                          │
  │   [Tous les sous-        │
  │    groupes récupérés]    │
  │                          │
  │  GET /groups/{jour_id}/  │
  │  projects?page=1         │
  ├─────────────────────────>│
  │                          │
  │  [...]  (JSON)           │
  │<─────────────────────────┤
  │                          │
  │  GET /groups/{jour_id}/  │
  │  projects?page=2         │
  ├─────────────────────────>│
  │                          │
  │  []  (vide = fin)        │
  │<─────────────────────────┤
  │                          │
  │   [Tous les projets      │
  │    récupérés]            │
  │                          │
  ▼                          ▼
```

### Flux: clone_tous_les_jours.sh

```
[ENTRÉE: Plage de jours (1-5)]
         │
         ▼
    ┌─────────────────┐
    │ Vérifications:  │
    │ - Python installé
    │ - Scripts présents
    │ - config_etna.py│
    │ - Module requests
    └────┬────────────┘
         │
         ▼
    ┌─────────────────┐
    │ BOUCLE:         │
    │ Pour jour=1..5  │
    └────┬────────────┘
         │
         ├─────────┐
         │         │
         ▼         │
    ┌─────────────────┐
    │ python3 clone_  │
    │ repos_etna.py 1 │
    └────┬────────────┘
         │
         ▼ Succès/Échec
         │
         │ Compteur ++
         │ Pause 2s
         │
         └────────┐
                  │
         ▼        │
    ┌─────────────────┐
    │ python3 clone_  │
    │ repos_etna.py 2 │
    └────┬────────────┘
         │
         │  (etc...)
         │
         ▼
    ┌─────────────────┐
    │ Résumé final:   │
    │ - Total: 5      │
    │ - Succès: 5     │
    │ - Échecs: 0     │
    └─────────────────┘
         │
         ▼
[SORTIE: Rapport + Exit code]
```

---

## Gestion des Erreurs

### Pyramide de Validation

```
     ┌─────────────────┐
     │  Configuration  │
     │  Valide?        │
     └────────┬────────┘
              │ OUI
              ▼
     ┌─────────────────┐
     │  API Token      │
     │  Valide?        │
     └────────┬────────┘
              │ OUI
              ▼
     ┌─────────────────┐
     │  Groupe Jour    │
     │  Existe?        │
     └────────┬────────┘
              │ OUI
              ▼
     ┌─────────────────┐
     │  Projets        │
     │  Trouvés?       │
     └────────┬────────┘
              │ OUI
              ▼
     ┌─────────────────┐
     │  Clone/Pull     │
     │  Réussi?        │
     └─────────────────┘

     Chaque niveau peut
     échouer avec un
     message d'erreur
     spécifique
```

---

## Architecture Modulaire

```
┌──────────────────────────────────────────────┐
│              COUCHE PRÉSENTATION             │
│  (Messages utilisateur, progression)         │
├──────────────────────────────────────────────┤
│              COUCHE MÉTIER                   │
│  - normaliser_numero_jour()                  │
│  - trouver_groupe_jour()                     │
│  - extraire_nom_eleve()                      │
│  - clone_ou_pull_repo()                      │
├──────────────────────────────────────────────┤
│              COUCHE API                      │
│  - get_all_subgroups()                       │
│  - get_all_projects()                        │
│  - get_gitlab_headers()                      │
├──────────────────────────────────────────────┤
│              COUCHE CONFIGURATION            │
│  - config_etna.py                            │
├──────────────────────────────────────────────┤
│              COUCHE EXTERNE                  │
│  - API GitLab                                │
│  - Git (clone/pull)                          │
│  - Système de fichiers                       │
└──────────────────────────────────────────────┘
```

---

## Pour Aller Plus Loin

Cette structure est extensible:

- **Ajoutez des filtres** (par nom d'élève, par date, etc.)
- **Ajoutez des statistiques** (lignes de code, commits, etc.)
- **Intégrez des tests** automatiques sur les repos clonés
- **Créez des rapports** (repos vides, pas de commits, etc.)

Consultez [INDEX.md](INDEX.md) pour la liste complète des fichiers.
