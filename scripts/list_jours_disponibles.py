#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script helper pour lister tous les jours disponibles dans le groupe GitLab
Affiche les sous-groupes "Quest - Jour XXX" avec le nombre de repos
"""

import sys
import re
import requests

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
            'per_page': per_page,
            'order_by': 'name',
            'sort': 'asc'
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
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status: {e.response.status_code}")
            return []

    return subgroups


def get_projects_count(group_id):
    """
    Récupère le nombre de projets dans un groupe

    Args:
        group_id (int): ID du groupe

    Returns:
        int: Nombre de projets
    """
    # On fait juste une requête pour obtenir le premier élément et les headers
    url = f"{config.GITLAB_URL}/api/v4/groups/{group_id}/projects"
    params = {
        'page': 1,
        'per_page': 1,
        'include_subgroups': True
    }

    try:
        response = requests.get(url, headers=get_gitlab_headers(), params=params)
        response.raise_for_status()

        # Le nombre total est dans le header X-Total
        if 'X-Total' in response.headers:
            return int(response.headers['X-Total'])

        # Sinon, on compte manuellement (moins efficace)
        return len(response.json())

    except requests.exceptions.RequestException:
        return 0


def extraire_numero_jour(group_name):
    """
    Extrait le numéro de jour depuis le nom du groupe
    Format: "Quest - Jour 001 54309" -> 1

    Args:
        group_name (str): Nom du groupe

    Returns:
        int ou None: Numéro du jour
    """
    match = re.search(r'Jour\s+(\d+)', group_name, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def lister_jours():
    """
    Liste tous les jours disponibles avec leur nombre de repos

    Returns:
        list: Liste des jours avec leurs infos
    """
    print("="*60)
    print("📚 JOURS DISPONIBLES")
    print("="*60)
    print()

    # Récupérer tous les sous-groupes
    print("🔍 Récupération des sous-groupes...")
    subgroups = get_all_subgroups(config.MAIN_GROUP_ID)

    if not subgroups:
        print("❌ Aucun sous-groupe trouvé")
        return []

    # Filtrer les groupes "Quest - Jour"
    jours = []
    for group in subgroups:
        if 'Quest - Jour' in group['name'] or 'quest - jour' in group['name'].lower():
            numero = extraire_numero_jour(group['name'])
            if numero is not None:
                jours.append({
                    'numero': numero,
                    'nom': group['name'],
                    'id': group['id'],
                    'path': group['full_path']
                })

    if not jours:
        print("❌ Aucun jour trouvé (groupes 'Quest - Jour XXX')")
        return []

    # Trier par numéro de jour
    jours.sort(key=lambda x: x['numero'])

    print(f"✅ {len(jours)} jour(s) trouvé(s)\n")

    # Afficher les jours avec le nombre de repos
    print("="*60)
    for jour in jours:
        print(f"\n📅 JOUR {jour['numero']:03d}")
        print(f"   Nom: {jour['nom']}")
        print(f"   ID: {jour['id']}")

        # Compter les repos (peut être lent)
        print(f"   🔍 Comptage des repos...", end="", flush=True)
        nb_repos = get_projects_count(jour['id'])
        print(f"\r   📦 Repos: {nb_repos}")

    print("\n" + "="*60)

    return jours


def main():
    """Fonction principale"""
    # Vérifier la configuration
    if not config.GITLAB_TOKEN:
        print("❌ GITLAB_TOKEN non configuré dans config_etna.py")
        sys.exit(1)

    if not config.MAIN_GROUP_ID:
        print("❌ MAIN_GROUP_ID non configuré dans config_etna.py")
        sys.exit(1)

    # Lister les jours
    jours = lister_jours()

    if jours:
        print("\n💡 Pour cloner un jour spécifique:")
        print("   python clone_repos_etna.py <numero_jour>")
        print("\n   Exemples:")
        print(f"   - python clone_repos_etna.py 1")
        print(f"   - python clone_repos_etna.py {jours[0]['numero']}")

        print("\n💡 Pour cloner tous les jours:")
        print("   bash clone_tous_les_jours.sh")
        print()


if __name__ == '__main__':
    main()
