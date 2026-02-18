#!/bin/bash

# ============================================
# Configure Firebase avec Evolution API
# Face Media Factory
# A executer sur ton Mac local
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=================================="
echo "   Configuration Firebase"
echo "=================================="
echo ""

# Verifie qu'on est dans le bon repertoire
if [ ! -f "package.json" ] || [ ! -d "functions" ]; then
    echo -e "${RED}X${NC} Erreur: Execute ce script depuis le repertoire face-media-factory"
    echo ""
    echo "   cd ~/Projects/face-media-factory"
    echo "   ./configure-firebase.sh"
    exit 1
fi

# Demande IP VPS
echo "Entre l'IP de ton VPS Hetzner"
echo "(exemple: 95.217.123.45)"
echo ""
read -p "IP du VPS: " VPS_IP

if [ -z "$VPS_IP" ]; then
    echo -e "${RED}X${NC} Erreur: IP requise"
    exit 1
fi

# Valide le format IP
if ! [[ $VPS_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${RED}X${NC} Erreur: Format IP invalide"
    exit 1
fi

# Test connexion au VPS
echo ""
echo -e "${BLUE}[1/5]${NC} Test connexion au VPS..."
HEALTH=$(curl -s --connect-timeout 5 "http://$VPS_IP:8080/" 2>/dev/null || echo "error")

if [[ $HEALTH == "error" ]]; then
    echo -e "${RED}X${NC} Impossible de contacter l'API sur $VPS_IP:8080"
    echo ""
    echo "Verifie que:"
    echo "  - Le VPS est allume"
    echo "  - Evolution API est lance (docker ps)"
    echo "  - Le port 8080 est ouvert dans le firewall"
    exit 1
fi

echo -e "${GREEN}OK${NC} API accessible sur $VPS_IP:8080"

# Configuration .env
echo -e "${BLUE}[2/5]${NC} Configuration .env..."

ENV_FILE="functions/.env"

# Backup si existe
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%s)"
    echo -e "${YELLOW}!${NC} Backup cree: $ENV_FILE.backup.*"

    # Remove old Evolution vars if exist
    grep -v "EVOLUTION_" "$ENV_FILE" > "$ENV_FILE.tmp" 2>/dev/null || true
    mv "$ENV_FILE.tmp" "$ENV_FILE" 2>/dev/null || true
fi

# Add Evolution API vars
cat >> "$ENV_FILE" << EOF

# WhatsApp Evolution API (Auto-configured)
EVOLUTION_API_URL=http://$VPS_IP:8080
EVOLUTION_API_KEY=B6D711FCDE4D4FD5936544120E713976
EVOLUTION_INSTANCE_NAME=facemedia
EOF

echo -e "${GREEN}OK${NC} .env configure"

# Verifier/installer axios
echo -e "${BLUE}[3/5]${NC} Verification dependances..."
cd functions

if ! grep -q '"axios"' package.json 2>/dev/null; then
    npm install axios --save > /dev/null 2>&1
    echo -e "${GREEN}OK${NC} axios installe"
else
    echo -e "${GREEN}OK${NC} axios deja present"
fi

cd ..

# Build
echo -e "${BLUE}[4/5]${NC} Build du projet..."
npm run build > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}OK${NC} Build reussi"
else
    echo -e "${RED}X${NC} Erreur de build"
    npm run build
    exit 1
fi

# Deploy WhatsApp functions
echo -e "${BLUE}[5/5]${NC} Deploiement des functions WhatsApp..."
echo ""

firebase deploy --only functions:whatsappChecker,functions:whatsappSender,functions:sendWhatsAppManual,functions:getWhatsAppStats 2>&1 | grep -E "(OK|functions\[|Error|error)" || true

echo ""
echo "=================================="
echo -e "${GREEN}   FIREBASE CONFIGURE !${NC}"
echo "=================================="
echo ""
echo "Configuration:"
echo -e "   API URL:   ${BLUE}http://$VPS_IP:8080${NC}"
echo -e "   Instance:  ${BLUE}facemedia${NC}"
echo -e "   API Key:   ${BLUE}B6D711FCDE4D4FD5936544120E713976${NC}"
echo ""
echo "Functions deployees:"
echo "   - whatsappChecker (2h daily)"
echo "   - whatsappSender (hourly 9h-22h)"
echo "   - sendWhatsAppManual (callable)"
echo "   - getWhatsAppStats (callable)"
echo ""
echo "=================================="
echo ""
echo "PROCHAINE ETAPE:"
echo ""
echo "1. Va sur https://face-media-factory.web.app/app/hunter"
echo "2. Lance un scraping Instagram (#restaurantparis)"
echo "3. Attends que des prospects avec 'phone' soient extraits"
echo "4. Va sur https://face-media-factory.web.app/app/whatsapp"
echo "5. Les stats s'afficheront automatiquement"
echo ""
