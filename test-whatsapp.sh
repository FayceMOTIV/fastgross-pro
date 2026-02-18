#!/bin/bash

# ============================================
# Test WhatsApp Message
# Face Media Factory
# A executer sur le VPS
# ============================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

API_KEY="B6D711FCDE4D4FD5936544120E713976"
INSTANCE_NAME="facemedia"

if [ -z "$1" ]; then
    echo "=================================="
    echo "   Test WhatsApp Message"
    echo "=================================="
    echo ""
    echo "Usage: ./test-whatsapp.sh +33612345678"
    echo ""
    echo "Exemple: ./test-whatsapp.sh +33601020304"
    exit 1
fi

PHONE_NUMBER="${1//+/}"  # Remove + if present

echo "=================================="
echo "   Test Envoi WhatsApp"
echo "=================================="
echo ""
echo -e "Numero: ${BLUE}+$PHONE_NUMBER${NC}"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:8080/message/sendText/$INSTANCE_NAME \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"number\": \"$PHONE_NUMBER\",
    \"text\": \"Test depuis Evolution API\\n\\nFace Media Factory WhatsApp Automation est LIVE !\\n\\nSysteme operationnel\"
  }")

if [[ $RESPONSE == *"key"* ]] || [[ $RESPONSE == *"messageId"* ]] || [[ $RESPONSE == *"status"* ]]; then
    echo -e "${GREEN}OK Message envoye avec succes !${NC}"
    echo ""
    echo "Verifie ton WhatsApp dans quelques secondes"
else
    echo -e "${RED}X Erreur${NC}"
    echo "$RESPONSE"
fi

echo ""
