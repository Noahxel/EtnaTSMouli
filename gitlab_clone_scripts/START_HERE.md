# Système de Clonage GitLab ETNA - Démarrage

Tous les fichiers ont été créés avec succès!

## Fichiers Créés (11)

### Scripts Principaux
- `clone_repos_etna.py` - Script principal de clonage
- `clone_tous_les_jours.sh` - Clone automatique de plusieurs jours
- `find_group_id.py` - Helper pour trouver l'ID du groupe
- `list_jours_disponibles.py` - Liste les jours disponibles

### Configuration
- `config_etna.example.py` - Modèle de configuration
- `requirements.txt` - Dépendances Python
- `.gitignore` - Protection des fichiers sensibles

### Documentation
- `README.md` - Documentation complète
- `QUICKSTART.md` - Guide de démarrage en 5 minutes
- `INDEX.md` - Index de tous les fichiers
- `STRUCTURE.md` - Diagrammes et architecture

## Démarrage Rapide

### 1. Installation (1 minute)
```bash
pip3 install -r requirements.txt
```

### 2. Configuration (3 minutes)

#### A. Obtenez votre Token GitLab
1. Allez sur GitLab > Settings > Access Tokens
2. Créez un token avec: `read_api`, `read_repository`
3. Copiez le token

#### B. Trouvez l'ID du groupe
```bash
python3 find_group_id.py
```

#### C. Configurez
```bash
cp config_etna.example.py config_etna.py
nano config_etna.py
```

Remplissez:
```python
GITLAB_URL = "https://gitlab.com"  # ou votre URL ETNA
GITLAB_TOKEN = "glpat-votre_token"
MAIN_GROUP_ID = 12345678  # ID trouvé à l'étape B
BASE_DIR = "./repos_eleves"
```

### 3. Clonage (1 minute)

#### Option A: Un jour spécifique
```bash
python3 clone_repos_etna.py 1
```

#### Option B: Tous les jours
```bash
bash clone_tous_les_jours.sh
```

## Structure Résultante

```
repos_eleves/
├── jour001/
│   ├── abdelh_a/
│   │   └── quest-jour-001/
│   ├── aimene_s/
│   │   └── quest-jour-001/
│   └── ...
└── jour002/
    └── ...
```

## Fichiers à Lire

1. **Débutant?** Lisez `QUICKSTART.md`
2. **Documentation complète?** Lisez `README.md`
3. **Comprendre la structure?** Lisez `STRUCTURE.md`
4. **Référence rapide?** Lisez `INDEX.md`

## Commandes Utiles

```bash
# Lister les jours disponibles
python3 list_jours_disponibles.py

# Clone le jour 1
python3 clone_repos_etna.py 1

# Clone les jours 1 à 5
bash clone_tous_les_jours.sh

# Clone les jours 1 à 10
bash clone_tous_les_jours.sh 1 10

# Mettre à jour (fait automatiquement git pull)
python3 clone_repos_etna.py 1
```

## Support

- **Erreur "config_etna.py introuvable"?** → Créez-le depuis l'exemple
- **Erreur "401 Unauthorized"?** → Vérifiez votre token
- **Erreur "Module requests"?** → Installez les dépendances

Consultez README.md pour la résolution complète des problèmes.

## Sécurité

**IMPORTANT:**
- Ne partagez JAMAIS `config_etna.py` (contient votre token)
- Le `.gitignore` protège automatiquement ce fichier
- Ne committez jamais le dossier `repos_eleves/`

## Prêt?

Commencez par:
```bash
cat QUICKSTART.md
```

Ou directement:
```bash
pip3 install -r requirements.txt
python3 find_group_id.py
```

---

**Note:** Ce fichier `START_HERE.md` est un guide rapide. Pour plus de détails, consultez les autres fichiers de documentation.
