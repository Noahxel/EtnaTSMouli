#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de clonage automatique des repos GitLab des élèves ETNA
Usage: python clone_repos_etna.py <numero_jour>
Exemple: python clone_repos_etna.py 1
"""

import os
import sys
import subprocess
import re
import requests
from urllib.parse import quote

# Add parent directory to path to import config from root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Importer la configuration
try:
    import config_etna as config
except ImportError:
    print("❌ Erreur : fichier config_etna.py introuvable!")
    print("⚠️  Copiez config_etna.example.py vers config_etna.py et configurez-le.")
    sys.exit(1)


def get_gitlab_headers():
    """Retourne les headers pour les requêtes API GitLab"""
    return {
        'PRIVATE-TOKEN': config.GITLAB_TOKEN
    }


def normaliser_numero_jour(jour_input):
    """
    Normalise le numéro de jour en format 'XXX' (ex: '001', '042')

    Args:
        jour_input (str ou int): Numéro de jour (ex: 1, '1', '001', 'jour1', 'jour001')

    Returns:
        str: Numéro formaté sur 3 chiffres (ex: '001')
    """
    jour_str = str(jour_input).lower().strip()
    # Extraire le numéro du format "jourXXX"
    if jour_str.startswith('jour'):
        jour_str = jour_str[4:]
    # Convertir en int puis formater sur 3 chiffres
    try:
        numero = int(jour_str)
        return f"{numero:03d}"
    except ValueError:
        raise ValueError(f"Format de jour invalide: {jour_input}")


def get_all_subgroups(group_id):
    """
    Récupère tous les sous-groupes d'un groupe avec pagination

    Args:
        group_id (int): ID du groupe parent

    Returns:
        list: Liste des sous-groupes
    """
    subgroups = []
    page = 1
    per_page = 100

    while True:
        url = f"{config.GITLAB_URL}/api/v4/groups/{group_id}/subgroups"
        params = {
            'page': page,
            'per_page': per_page
        }

        try:
            response = requests.get(url, headers=get_gitlab_headers(), params=params)
            response.raise_for_status()

            page_groups = response.json()
            if not page_groups:
                break

            subgroups.extend(page_groups)
            page += 1

        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur lors de la récupération des sous-groupes: {e}")
            return []

    return subgroups


def trouver_groupe_jour(numero_jour):
    """
    Trouve le sous-groupe correspondant au jour spécifié

    Args:
        numero_jour (str): Numéro du jour formaté (ex: '001')

    Returns:
        dict ou None: Informations du groupe trouvé
    """
    print(f"🔍 Recherche du groupe pour le jour {numero_jour}...")

    subgroups = get_all_subgroups(config.MAIN_GROUP_ID)

    if not subgroups:
        print("❌ Aucun sous-groupe trouvé ou erreur d'accès")
        return None

    # Chercher le groupe correspondant au jour
    # Format attendu: "Quest - Jour 001 54309" ou "Quest - Jour 1 54309"
    patterns = [
        f"Quest - Jour {numero_jour}",  # "Quest - Jour 001"
        f"Quest - Jour {int(numero_jour)}"  # "Quest - Jour 1"
    ]

    for group in subgroups:
        group_name = group['name']
        for pattern in patterns:
            if pattern in group_name:
                print(f"✅ Groupe trouvé: {group_name} (ID: {group['id']})")
                return group

    print(f"❌ Aucun groupe trouvé pour le jour {numero_jour}")
    print(f"⚠️  Vérifiez que le groupe existe avec: python list_jours_disponibles.py")
    return None


def get_all_projects(group_id):
    """
    Récupère tous les projets d'un groupe avec pagination

    Args:
        group_id (int): ID du groupe

    Returns:
        list: Liste des projets
    """
    projects = []
    page = 1
    per_page = 100

    while True:
        url = f"{config.GITLAB_URL}/api/v4/groups/{group_id}/projects"
        params = {
            'page': page,
            'per_page': per_page,
            'include_subgroups': True
        }

        try:
            response = requests.get(url, headers=get_gitlab_headers(), params=params)
            response.raise_for_status()

            page_projects = response.json()
            if not page_projects:
                break

            projects.extend(page_projects)
            page += 1

        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur lors de la récupération des projets: {e}")
            return []

    return projects


def extraire_nom_eleve(project_name):
    """
    Extrait le nom de l'élève depuis le nom du projet
    Format: "Groupe de nom_eleve ID" -> "nom_eleve"

    Args:
        project_name (str): Nom du projet

    Returns:
        str: Nom de l'élève
    """
    # Pattern: "Groupe de abdelh_a 1065535"
    match = re.search(r'Groupe de ([a-z_]+)', project_name, re.IGNORECASE)
    if match:
        return match.group(1)

    # Fallback: utiliser le nom du projet nettoyé
    return re.sub(r'[^a-z0-9_-]', '_', project_name.lower())


def extraire_group_id(project_name):
    """
    Extrait le groupId depuis le nom du projet
    Format: "Groupe de nom_eleve 1065535" -> 1065535

    Args:
        project_name (str): Nom du projet

    Returns:
        int or None: GroupId si trouvé, None sinon
    """
    # Pattern: "Groupe de student_name digits"
    match = re.search(r'Groupe de [a-z_]+\s+(\d+)', project_name, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def clone_ou_pull_repo(project, dest_dir, numero_jour):
    """
    Clone un repo ou fait un git pull s'il existe déjà

    Args:
        project (dict): Informations du projet GitLab
        dest_dir (str): Répertoire de destination
        numero_jour (str): Numéro du jour formaté

    Returns:
        bool: True si succès, False sinon
    """
    nom_eleve = extraire_nom_eleve(project['name'])

    # Créer le chemin: test-repos/day01/repos/student_name/
    jour_formatted = f"day{int(numero_jour):02d}"  # day01, day02, etc.
    jour_dir = os.path.join(dest_dir, jour_formatted, "repos")
    repo_dir = os.path.join(jour_dir, nom_eleve)

    # Créer les dossiers parents si nécessaire
    os.makedirs(jour_dir, exist_ok=True)

    # Construire l'URL avec le token pour l'authentification
    http_url = project['http_url_to_repo']
    # Insérer le token dans l'URL: https://oauth2:TOKEN@gitlab.com/...
    authenticated_url = http_url.replace('https://', f'https://oauth2:{config.GITLAB_TOKEN}@')

    try:
        if os.path.exists(repo_dir):
            # Le repo existe déjà, faire un pull
            print(f"  📥 Update: {nom_eleve}")
            result = subprocess.run(
                ['git', '-C', repo_dir, 'pull'],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                if 'Already up to date' in result.stdout:
                    print(f"  ✅ Already up to date")
                else:
                    print(f"  ✅ Updated")
                return True
            else:
                print(f"  ❌ Error during pull: {result.stderr}")
                return False
        else:
            # Cloner le repo
            print(f"  📚 Clone: {nom_eleve}")
            result = subprocess.run(
                ['git', 'clone', authenticated_url, repo_dir],
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode == 0:
                print(f"  ✅ Cloned successfully")
                return True
            else:
                print(f"  ❌ Error during clone: {result.stderr}")
                return False

    except subprocess.TimeoutExpired:
        print(f"  ⚠️  Git operation timeout")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False


def clone_repos_jour(numero_jour):
    """
    Clone tous les repos d'un jour spécifique

    Args:
        numero_jour (str): Numéro du jour formaté

    Returns:
        tuple: (nombre_succès, nombre_total)
    """
    print(f"\n{'='*60}")
    print(f"📚 CLONAGE DES REPOS - JOUR {numero_jour}")
    print(f"{'='*60}\n")

    # Trouver le groupe du jour
    groupe_jour = trouver_groupe_jour(numero_jour)
    if not groupe_jour:
        return 0, 0

    # Récupérer tous les projets du groupe
    print(f"\n🔍 Récupération de la liste des projets...")
    projects = get_all_projects(groupe_jour['id'])

    if not projects:
        print("❌ Aucun projet trouvé dans ce groupe")
        return 0, 0

    print(f"✅ {len(projects)} projet(s) trouvé(s)\n")
    
    # Créer le fichier de log pour sauvegarder les groupIds
    jour_formatted = f"day{int(numero_jour):02d}"
    log_dir = os.path.join(config.BASE_DIR, jour_formatted)
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "clone_log.txt")
    
    with open(log_file, 'w') as log:
        log.write(f"Clone log for {jour_formatted}\n")
        log.write(f"{'='*60}\n\n")
        
        # Cloner chaque projet
        succes = 0
        total = len(projects)

        for i, project in enumerate(projects, 1):
            project_name = project['name']
            nom_eleve = extraire_nom_eleve(project_name)
            group_id = extraire_group_id(project_name)
            
            # Log project info with groupId
            log.write(f"[{i}/{total}] {project_name}\n")
            log.write(f"  Student: {nom_eleve}\n")
            log.write(f"  GroupID: {group_id}\n\n")
            
            print(f"\n[{i}/{total}] {project_name}")
            if clone_ou_pull_repo(project, config.BASE_DIR, numero_jour):
                succes += 1
    
    print(f"\n✅ Clone log saved: {log_file}")
    
    # Automatically initialize/update Excel with GroupIDs
    print(f"\n📊 Updating Excel file with students and GroupIDs...")
    try:
        import subprocess
        init_script = os.path.join(os.path.dirname(__file__), 'init_excel.py')
        result = subprocess.run(
            ['python3', init_script, numero_jour],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(result.stdout)
        else:
            print(f"⚠️  Warning: Could not update Excel automatically")
            print(f"   Run manually: python3 scripts/init_excel.py {numero_jour}")
    except Exception as e:
        print(f"⚠️  Warning: Could not update Excel automatically: {e}")
        print(f"   Run manually: python3 scripts/init_excel.py {numero_jour}")
    
    return succes, total


def main():
    """Fonction principale"""
    # Vérifier les arguments
    if len(sys.argv) != 2:
        print("❌ Usage: python clone_repos_etna.py <numero_jour>")
        print("   Exemple: python clone_repos_etna.py 1")
        print("   Exemple: python clone_repos_etna.py jour001")
        sys.exit(1)

    # Normaliser le numéro de jour
    try:
        numero_jour = normaliser_numero_jour(sys.argv[1])
    except ValueError as e:
        print(f"❌ {e}")
        sys.exit(1)

    # Vérifier la configuration
    if not config.GITLAB_TOKEN:
        print("❌ GITLAB_TOKEN non configuré dans config_etna.py")
        sys.exit(1)

    if not config.MAIN_GROUP_ID:
        print("❌ MAIN_GROUP_ID non configuré dans config_etna.py")
        sys.exit(1)

    # Créer le répertoire de base si nécessaire
    os.makedirs(config.BASE_DIR, exist_ok=True)

    # Cloner les repos
    succes, total = clone_repos_jour(numero_jour)

    # Afficher le résumé
    print(f"\n{'='*60}")
    print(f"📊 RÉSUMÉ")
    print(f"{'='*60}")
    print(f"✅ Succès: {succes}/{total}")
    if succes < total:
        print(f"❌ Échecs: {total - succes}")
    print(f"\n📂 Répertoire: {config.BASE_DIR}/jour{numero_jour}/")
    print(f"{'='*60}\n")

    # Code de sortie
    sys.exit(0 if succes == total else 1)


if __name__ == '__main__':
    main()
