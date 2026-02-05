#!/bin/bash

# =============================================================================
# FastGross Pro - Script de deploiement
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="FastGross Pro"
VERCEL_PROJECT="fastgross-pro"

echo -e "${BLUE}"
echo "=============================================="
echo "  $PROJECT_NAME - Deploiement"
echo "=============================================="
echo -e "${NC}"

# Verification des outils
echo -e "${YELLOW}Verification des prerequis...${NC}"

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Erreur: npm n'est pas installe${NC}"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}Installation de Vercel CLI...${NC}"
    npm install -g vercel
fi

# Verification des fichiers d'environnement
if [ ! -f ".env.local" ] && [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}Attention: Aucun fichier .env trouve${NC}"
    echo "Assurez-vous que les variables d'environnement sont configurees sur Vercel"
fi

# Installation des dependances
echo -e "${BLUE}Installation des dependances...${NC}"
npm install

# Linting
echo -e "${BLUE}Verification du code (lint)...${NC}"
npm run lint || {
    echo -e "${RED}Erreurs de lint detectees${NC}"
    read -p "Continuer quand meme ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

# Build
echo -e "${BLUE}Build de l'application...${NC}"
npm run build || {
    echo -e "${RED}Erreur lors du build${NC}"
    exit 1
}

echo -e "${GREEN}Build reussi !${NC}"

# Deploiement
echo -e "${BLUE}Deploiement sur Vercel...${NC}"

read -p "Deployer en production ? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deploiement en PRODUCTION...${NC}"
    vercel --prod
else
    echo -e "${YELLOW}Deploiement en preview...${NC}"
    vercel
fi

echo -e "${GREEN}"
echo "=============================================="
echo "  Deploiement termine avec succes !"
echo "=============================================="
echo -e "${NC}"

# Afficher l'URL
echo -e "${BLUE}Prochaines etapes:${NC}"
echo "1. Verifier le deploiement sur Vercel Dashboard"
echo "2. Tester l'application en ligne"
echo "3. Verifier les logs si necessaire"
