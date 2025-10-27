#!/bin/bash
# -*- coding: utf-8 -*-
#
# Script pour cloner automatiquement tous les jours (1 à 5 par défaut)
# Usage: bash clone_tous_les_jours.sh [jour_debut] [jour_fin]
# Exemple: bash clone_tous_les_jours.sh 1 5

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration par défaut
JOUR_DEBUT=${1:-1}
JOUR_FIN=${2:-5}

echo "============================================================"
echo "📚 CLONAGE AUTOMATIQUE DES REPOS - JOURS $JOUR_DEBUT à $JOUR_FIN"
echo "============================================================"
echo

# Vérifier que Python est installé
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 n'est pas installé${NC}"
    exit 1
fi

# Vérifier que le script principal existe
if [ ! -f "clone_repos_etna.py" ]; then
    echo -e "${RED}❌ Fichier clone_repos_etna.py introuvable${NC}"
    echo -e "${YELLOW}⚠️  Assurez-vous d'exécuter ce script depuis le bon répertoire${NC}"
    exit 1
fi

# Vérifier que config_etna.py existe
if [ ! -f "config_etna.py" ]; then
    echo -e "${RED}❌ Fichier config_etna.py introuvable${NC}"
    echo -e "${YELLOW}⚠️  Copiez config_etna.example.py vers config_etna.py et configurez-le${NC}"
    exit 1
fi

# Vérifier que les dépendances sont installées
echo "🔍 Vérification des dépendances..."
if ! python3 -c "import requests" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Module 'requests' non installé${NC}"
    echo "📦 Installation de requests..."
    pip3 install requests
fi
echo -e "${GREEN}✅ Dépendances OK${NC}"
echo

# Variables pour les statistiques
TOTAL_JOURS=0
SUCCES_JOURS=0
ECHEC_JOURS=0

# Cloner chaque jour
for jour in $(seq $JOUR_DEBUT $JOUR_FIN); do
    TOTAL_JOURS=$((TOTAL_JOURS + 1))

    echo
    echo "============================================================"
    echo -e "${BLUE}📅 JOUR $jour${NC}"
    echo "============================================================"
    echo

    # Exécuter le script de clonage
    if python3 clone_repos_etna.py $jour; then
        SUCCES_JOURS=$((SUCCES_JOURS + 1))
        echo -e "${GREEN}✅ Jour $jour terminé avec succès${NC}"
    else
        ECHEC_JOURS=$((ECHEC_JOURS + 1))
        echo -e "${RED}❌ Jour $jour terminé avec des erreurs${NC}"
    fi

    # Petite pause entre chaque jour pour éviter de surcharger l'API
    if [ $jour -lt $JOUR_FIN ]; then
        echo
        echo "⏳ Pause de 2 secondes..."
        sleep 2
    fi
done

# Afficher le résumé final
echo
echo "============================================================"
echo "📊 RÉSUMÉ FINAL"
echo "============================================================"
echo -e "Total de jours traités: ${BLUE}$TOTAL_JOURS${NC}"
echo -e "Succès: ${GREEN}$SUCCES_JOURS${NC}"

if [ $ECHEC_JOURS -gt 0 ]; then
    echo -e "Échecs: ${RED}$ECHEC_JOURS${NC}"
fi

echo
echo "============================================================"

# Code de sortie
if [ $ECHEC_JOURS -eq 0 ]; then
    echo -e "${GREEN}✅ TOUS LES JOURS ONT ÉTÉ CLONÉS AVEC SUCCÈS${NC}"
    echo "============================================================"
    exit 0
else
    echo -e "${YELLOW}⚠️  CERTAINS JOURS ONT DES ERREURS${NC}"
    echo "============================================================"
    exit 1
fi
