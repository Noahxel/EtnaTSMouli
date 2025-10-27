# -*- coding: utf-8 -*-
"""
Fichier de configuration pour le clonage des repos GitLab ETNA

INSTRUCTIONS:
1. Copiez ce fichier vers config_etna.py
2. Remplissez vos informations GitLab
3. Ne partagez JAMAIS config_etna.py (il contient votre token)

Pour obtenir votre token GitLab:
1. Connectez-vous à GitLab
2. Allez dans Settings > Access Tokens
3. Créez un token avec les permissions: read_api, read_repository
4. Copiez le token ici

Pour trouver le MAIN_GROUP_ID:
Utilisez le script helper: python find_group_id.py
"""

# URL de votre instance GitLab
# Pour GitLab.com: https://gitlab.com
# Pour instance ETNA: https://gitlab.etna-alternance.net
GITLAB_URL = "https://rendu-git.etna-alternance.net"

# Votre token d'accès GitLab
# IMPORTANT: Gardez ce token secret!
GITLAB_TOKEN = "glpat-mi5xlNVO76AlzVlCbPGvv286MQp1OjJmdQk.01.0z0h1n3dc"

# ID du groupe principal contenant tous les sous-groupes de jours
# Exemple: Pour "2025_C2WK - Octobre_IDV-VUJS_1_0"
# Utilisez find_group_id.py pour trouver cet ID
MAIN_GROUP_ID = 12345678

# Répertoire de destination pour les repos clonés
# Les repos seront organisés comme: BASE_DIR/jour001/nom_eleve/repo/
BASE_DIR = "./repos_eleves"
