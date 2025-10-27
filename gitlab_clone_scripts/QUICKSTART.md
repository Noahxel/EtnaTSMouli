# Guide de Démarrage Rapide - 5 Minutes

Clonez tous vos repos GitLab en 5 minutes chrono!

## Étape 1: Installation (1 minute)

```bash
# Installer les dépendances
pip3 install -r requirements.txt
```

## Étape 2: Configuration (3 minutes)

### A. Créer votre Token GitLab

1. Allez sur GitLab > **Settings** > **Access Tokens**
2. Créez un token avec les permissions:
   - `read_api`
   - `read_repository`
3. **Copiez le token**

### B. Trouver l'ID de votre Groupe

```bash
python3 find_group_id.py
```

Entrez:
- URL GitLab: `https://gitlab.com` (ou votre URL ETNA)
- Votre token
- Cherchez votre groupe et notez l'**ID**

### C. Configurer le Script

```bash
# Copier le fichier exemple
cp config_etna.example.py config_etna.py

# Éditer avec vos infos
nano config_etna.py
```

Remplissez:
```python
GITLAB_URL = "https://gitlab.com"
GITLAB_TOKEN = "glpat-votre_token"  # Token copié à l'étape A
MAIN_GROUP_ID = 12345678            # ID trouvé à l'étape B
BASE_DIR = "./repos_eleves"
```

Sauvegardez: `Ctrl+O` puis `Ctrl+X`

## Étape 3: Clonage (1 minute)

### Option A: Clone un Jour Spécifique

```bash
python3 clone_repos_etna.py 1
```

### Option B: Clone Tous les Jours

```bash
bash clone_tous_les_jours.sh
```

## C'est Fait!

Vos repos sont dans `repos_eleves/`:
```
repos_eleves/
├── jour001/
│   ├── eleve1/
│   └── eleve2/
└── jour002/
    └── ...
```

## Utilisation Quotidienne

**Mettre à jour un jour:**
```bash
python3 clone_repos_etna.py 1
```

Le script fait automatiquement un `git pull` sur les repos existants.

**Voir les jours disponibles:**
```bash
python3 list_jours_disponibles.py
```

## Problèmes Courants

### Erreur "config_etna.py introuvable"
```bash
cp config_etna.example.py config_etna.py
```

### Erreur "Module requests non installé"
```bash
pip3 install requests
```

### Erreur "401 Unauthorized"
- Vérifiez votre token dans `config_etna.py`
- Créez un nouveau token si expiré

## Besoin d'Aide?

Consultez [README.md](README.md) pour la documentation complète.
