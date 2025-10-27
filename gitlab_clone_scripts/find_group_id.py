#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script helper pour trouver l'ID d'un groupe GitLab
Affiche tous les groupes accessibles avec leurs IDs
"""

import sys
import requests


def get_gitlab_info():
    """
    Demande interactivement les informations GitLab

    Returns:
        tuple: (url, token)
    """
    print("="*60)
    print("🔍 RECHERCHE D'ID DE GROUPE GITLAB")
    print("="*60)
    print()

    # Demander l'URL
    print("Entrez l'URL de votre instance GitLab:")
    print("  - Pour GitLab.com: https://gitlab.com")
    print("  - Pour ETNA: https://gitlab.etna-alternance.net")
    url = input("URL GitLab: ").strip().rstrip('/')

    if not url:
        print("❌ URL vide, utilisation de https://gitlab.com par défaut")
        url = "https://gitlab.com"

    # Demander le token
    print("\nEntrez votre token d'accès GitLab:")
    print("  (Settings > Access Tokens > Créer un token avec read_api)")
    token = input("Token: ").strip()

    if not token:
        print("❌ Token requis!")
        sys.exit(1)

    return url, token


def get_all_groups(gitlab_url, token):
    """
    Récupère tous les groupes accessibles avec pagination

    Args:
        gitlab_url (str): URL de l'instance GitLab
        token (str): Token d'accès

    Returns:
        list: Liste des groupes
    """
    groups = []
    page = 1
    per_page = 100

    headers = {'PRIVATE-TOKEN': token}

    print("\n🔍 Récupération des groupes...")

    while True:
        url = f"{gitlab_url}/api/v4/groups"
        params = {
            'page': page,
            'per_page': per_page,
            'order_by': 'name',
            'sort': 'asc'
        }

        try:
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()

            page_groups = response.json()
            if not page_groups:
                break

            groups.extend(page_groups)
            print(f"  Page {page}: {len(page_groups)} groupe(s)")
            page += 1

        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur: {e}")
            if hasattr(e, 'response') and e.response is not None:
                print(f"   Status: {e.response.status_code}")
                print(f"   Message: {e.response.text}")
            return []

    return groups


def afficher_groupes(groups, filtre=None):
    """
    Affiche les groupes dans un format lisible

    Args:
        groups (list): Liste des groupes
        filtre (str, optional): Terme de recherche
    """
    if not groups:
        print("\n❌ Aucun groupe trouvé")
        return

    # Filtrer si nécessaire
    if filtre:
        filtre_lower = filtre.lower()
        groups = [g for g in groups if filtre_lower in g['name'].lower() or
                                       filtre_lower in g['full_path'].lower()]

    if not groups:
        print(f"\n❌ Aucun groupe trouvé avec le filtre '{filtre}'")
        return

    print(f"\n{'='*60}")
    print(f"📚 GROUPES TROUVÉS: {len(groups)}")
    print(f"{'='*60}\n")

    for i, group in enumerate(groups, 1):
        print(f"[{i}] {group['name']}")
        print(f"    ID: {group['id']}")
        print(f"    Path: {group['full_path']}")
        if 'description' in group and group['description']:
            print(f"    Description: {group['description'][:60]}")
        print()


def recherche_interactive(groups):
    """
    Permet de faire des recherches interactives dans les groupes

    Args:
        groups (list): Liste des groupes
    """
    while True:
        print("\n" + "="*60)
        print("Entrez un terme de recherche (ou 'q' pour quitter):")
        terme = input("Recherche: ").strip()

        if terme.lower() in ['q', 'quit', 'exit', '']:
            break

        afficher_groupes(groups, filtre=terme)


def main():
    """Fonction principale"""
    # Obtenir les informations GitLab
    gitlab_url, token = get_gitlab_info()

    # Récupérer les groupes
    groups = get_all_groups(gitlab_url, token)

    if not groups:
        print("\n❌ Impossible de récupérer les groupes")
        sys.exit(1)

    print(f"✅ {len(groups)} groupe(s) récupéré(s)")

    # Afficher tous les groupes
    afficher_groupes(groups)

    # Mode recherche interactive
    print("\n" + "="*60)
    print("💡 TIP: Vous pouvez faire une recherche pour filtrer les groupes")
    print("="*60)

    choix = input("\nVoulez-vous faire une recherche? (o/N): ").strip().lower()
    if choix in ['o', 'oui', 'y', 'yes']:
        recherche_interactive(groups)

    print("\n" + "="*60)
    print("✅ TERMINÉ")
    print("="*60)
    print("\nCopiez l'ID du groupe dans config_etna.py:")
    print("  MAIN_GROUP_ID = <ID_DU_GROUPE>")
    print()


if __name__ == '__main__':
    main()
