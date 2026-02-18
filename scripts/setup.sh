#!/bin/bash

echo "🚀 FACE MEDIA FACTORY V2.0 - AUTO SETUP"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Erreur: Executez ce script depuis le dossier face-media-factory${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Installation des dependances...${NC}"
npm install
cd functions
npm install
cd ..

echo ""
echo -e "${GREEN}✅ Dependances installees!${NC}"
echo ""

echo -e "${YELLOW}🔑 CONFIGURATION DES API KEYS${NC}"
echo "================================"
echo ""

echo "1️⃣  GROQ (14K req/jour GRATUIT)"
echo "   → Allez sur: https://console.groq.com"
echo "   → Creez une API key"
read -p "   Collez votre cle Groq: " GROQ_KEY
echo ""

echo "2️⃣  OPENROUTER (1K req/jour GRATUIT)"
echo "   → Allez sur: https://openrouter.ai"
echo "   → Creez une API key"
read -p "   Collez votre cle OpenRouter: " OPENROUTER_KEY
echo ""

echo "3️⃣  GEMINI (1K req/jour GRATUIT)"
echo "   → Allez sur: https://aistudio.google.com"
echo "   → Creez une API key"
read -p "   Collez votre cle Gemini: " GEMINI_KEY
echo ""

echo -e "${BLUE}📧 Email Enrichment (OPTIONNEL - Appuyez sur Entree pour ignorer)${NC}"
read -p "   Derrick API key (200/mois): " DERRICK_KEY
read -p "   Apollo API key (60/mois): " APOLLO_KEY
read -p "   Hunter API key (50/mois): " HUNTER_KEY
echo ""

echo -e "${BLUE}📱 Multi-Platform Posting (OPTIONNEL)${NC}"
read -p "   Postiz URL (si self-hosted): " POSTIZ_URL
read -p "   Postiz API key: " POSTIZ_KEY
read -p "   Late API key (20/mois): " LATE_KEY
echo ""

# Create .env file
echo -e "${BLUE}💾 Creation du fichier .env...${NC}"
cat > functions/.env << EOF
# AI Providers (REQUIRED)
GROQ_API_KEY=$GROQ_KEY
OPENROUTER_API_KEY=$OPENROUTER_KEY
GEMINI_API_KEY=$GEMINI_KEY

# Email Enrichment (OPTIONAL)
DERRICK_API_KEY=$DERRICK_KEY
APOLLO_API_KEY=$APOLLO_KEY
HUNTER_API_KEY=$HUNTER_KEY

# Multi-Platform Posting (OPTIONAL)
POSTIZ_API_URL=$POSTIZ_URL
POSTIZ_API_KEY=$POSTIZ_KEY
LATE_API_KEY=$LATE_KEY
EOF

echo -e "${GREEN}✅ Fichier .env cree!${NC}"
echo ""

echo -e "${BLUE}🚀 Deploiement sur Firebase...${NC}"
echo ""

# Deploy functions
echo "Deploiement des Cloud Functions..."
cd functions
firebase deploy --only functions
cd ..

# Build and deploy frontend
echo "Build du frontend..."
npm run build

echo "Deploiement du hosting..."
firebase deploy --only hosting

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ SETUP TERMINE!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📊 VOTRE SYSTEME:${NC}"
echo "   🤖 AI: 492K req/mois (Groq + OpenRouter + Gemini)"
echo "   📧 Email: 310 enrichments/mois"
echo "   📱 Posting: UNLIMITED plateformes"
echo "   💰 Cout: €24/mois (vs €423 marche)"
echo ""
echo -e "${BLUE}🎯 Prochaines etapes:${NC}"
echo "   1. Visitez: https://face-media-factory.web.app/app/ai"
echo "   2. Testez la generation AI"
echo "   3. Testez l'enrichissement email"
echo "   4. Invitez vos beta users!"
echo ""
echo -e "${GREEN}🎉 Vous etes pret!${NC}"
