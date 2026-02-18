#!/bin/bash

# ============================================
# Creation Instance WhatsApp + QR Code
# Face Media Factory
# A executer sur le VPS apres install-evolution-api.sh
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

API_KEY="B6D711FCDE4D4FD5936544120E713976"
INSTANCE_NAME="facemedia"

echo "=================================="
echo "   Creation Instance WhatsApp"
echo "=================================="
echo ""

echo -e "${BLUE}[1/3]${NC} Creation de l'instance..."

RESPONSE=$(curl -s -X POST http://localhost:8080/instance/create \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"instanceName\": \"$INSTANCE_NAME\",
    \"qrcode\": true,
    \"integration\": \"WHATSAPP-BAILEYS\"
  }")

if [[ $RESPONSE == *"instance"* ]] || [[ $RESPONSE == *"qrcode"* ]]; then
    echo -e "${GREEN}OK${NC} Instance creee: $INSTANCE_NAME"
elif [[ $RESPONSE == *"already"* ]] || [[ $RESPONSE == *"exists"* ]]; then
    echo -e "${YELLOW}!${NC} Instance existe deja, reconnexion..."
else
    echo -e "${RED}X${NC} Erreur creation instance"
    echo "$RESPONSE"
    exit 1
fi

echo ""
echo -e "${BLUE}[2/3]${NC} Generation QR Code..."
sleep 2

PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null)

echo -e "${GREEN}OK${NC} QR Code disponible !"
echo ""
echo "=================================="
echo -e "${YELLOW}   SCANNE CE QR CODE${NC}"
echo "=================================="
echo ""
echo "Ouvre ce lien dans ton navigateur:"
echo ""
echo -e "   ${BLUE}http://$PUBLIC_IP:8080/instance/connect/$INSTANCE_NAME${NC}"
echo ""
echo "Puis:"
echo "1. Ouvre WhatsApp sur ton telephone"
echo "2. Settings > Linked Devices"
echo "3. Link a Device"
echo "4. Scanne le QR code du navigateur"
echo ""
echo "Le QR code expire dans 1 minute"
echo ""
read -p "Appuie sur Entree quand tu as scanne..."
echo ""

echo -e "${BLUE}[3/3]${NC} Verification connexion..."
sleep 3

STATE=$(curl -s http://localhost:8080/instance/connectionState/$INSTANCE_NAME \
  -H "apikey: $API_KEY" 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [[ $STATE == "open" ]]; then
    echo -e "${GREEN}OK${NC} WhatsApp connecte !"
    echo ""
    echo "=================================="
    echo -e "${GREEN}   SETUP TERMINE !${NC}"
    echo "=================================="
    echo ""
    echo "PROCHAINE ETAPE:"
    echo "   Teste l'envoi avec:"
    echo ""
    echo -e "   ${BLUE}./test-whatsapp.sh +33612345678${NC}"
    echo "   (remplace par TON numero)"
    echo ""
else
    echo -e "${YELLOW}!${NC} Etat: $STATE"
    echo ""
    echo "Si non connecte, rescanne le QR code:"
    echo -e "   ${BLUE}http://$PUBLIC_IP:8080/instance/connect/$INSTANCE_NAME${NC}"
    echo ""
fi
