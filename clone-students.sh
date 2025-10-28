#!/bin/bash
# -*- coding: utf-8 -*-
#
# Script to automatically clone all student repositories by day
# Usage: ./clone-students.sh [start_day] [end_day]
# Example: ./clone-students.sh 1 5

set -e  # Stop on error

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
echo "📚 CLONING STUDENT REPOS - DAYS $JOUR_DEBUT to $JOUR_FIN"
echo "============================================================"
echo

# Vérifier que Python est installé
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi

# Vérifier que le script principal existe
if [ ! -f "scripts/clone_repos_etna.py" ]; then
    echo -e "${RED}❌ File scripts/clone_repos_etna.py not found${NC}"
    echo -e "${YELLOW}⚠️  Make sure to run this script from the project root directory${NC}"
    exit 1
fi

# Vérifier que config_etna.py existe
if [ ! -f "config_etna.py" ]; then
    echo -e "${RED}❌ File config_etna.py not found${NC}"
    echo -e "${YELLOW}⚠️  Copy scripts/config_etna.example.py to config_etna.py and configure it${NC}"
    exit 1
fi

# Vérifier que les dépendances sont installées
echo "🔍 Checking dependencies..."
if ! python3 -c "import requests" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Module 'requests' not installed${NC}"
    echo "📦 Installing requests..."
    pip3 install requests
fi
echo -e "${GREEN}✅ Dependencies OK${NC}"
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
    echo -e "${BLUE}📅 DAY $jour${NC}"
    echo "============================================================"
    echo

    # Exécuter le script de clonage
    if python3 scripts/clone_repos_etna.py $jour; then
        SUCCES_JOURS=$((SUCCES_JOURS + 1))
        echo -e "${GREEN}✅ Day $jour completed successfully${NC}"
    else
        ECHEC_JOURS=$((ECHEC_JOURS + 1))
        echo -e "${RED}❌ Day $jour completed with errors${NC}"
    fi

    # Petite pause entre chaque jour pour éviter de surcharger l'API
    if [ $jour -lt $JOUR_FIN ]; then
        echo
        echo "⏳ Pause 2 seconds..."
        sleep 2
    fi
done

# Afficher le résumé final
echo
echo "============================================================"
echo "📊 FINAL SUMMARY"
echo "============================================================"
echo -e "Total days processed: ${BLUE}$TOTAL_JOURS${NC}"
echo -e "Success: ${GREEN}$SUCCES_JOURS${NC}"

if [ $ECHEC_JOURS -gt 0 ]; then
    echo -e "Failures: ${RED}$ECHEC_JOURS${NC}"
fi

echo
echo "============================================================"

# Code de sortie
if [ $ECHEC_JOURS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL DAYS CLONED SUCCESSFULLY${NC}"
    echo "============================================================"
    exit 0
else
    echo -e "${YELLOW}⚠️  SOME DAYS HAD ERRORS${NC}"
    echo "============================================================"
    exit 1
fi
