#!/bin/bash

# ============================================
# Evolution API - Installation Automatique
# Face Media Factory - WhatsApp Automation
# Ce script installe et configure Evolution API en 1 commande
# ============================================

set -e  # Stop si erreur

echo "=================================="
echo "    Evolution API Setup"
echo "=================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# API Key pour Evolution API
API_KEY="B6D711FCDE4D4FD5936544120E713976"

echo -e "${BLUE}[1/7]${NC} Update systeme..."
apt-get update -qq > /dev/null 2>&1
apt-get upgrade -y -qq > /dev/null 2>&1
echo -e "${GREEN}OK${NC} Systeme mis a jour"

echo -e "${BLUE}[2/7]${NC} Installation Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
    echo -e "${GREEN}OK${NC} Docker installe"
else
    echo -e "${GREEN}OK${NC} Docker deja installe"
fi

echo -e "${BLUE}[3/7]${NC} Installation Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    apt-get install -y docker-compose-plugin > /dev/null 2>&1 || apt-get install -y docker-compose > /dev/null 2>&1
    echo -e "${GREEN}OK${NC} Docker Compose installe"
else
    echo -e "${GREEN}OK${NC} Docker Compose deja installe"
fi

echo -e "${BLUE}[4/7]${NC} Creation repertoire Evolution API..."
mkdir -p /opt/evolution-api
cd /opt/evolution-api

echo -e "${BLUE}[5/7]${NC} Creation docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
version: '3.3'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://localhost:8080
      - AUTHENTICATION_API_KEY=B6D711FCDE4D4FD5936544120E713976
      - AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
      - DEL_INSTANCE=false
      - QRCODE_LIMIT=30
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=mongodb://mongodb:27017/evolution
      - DATABASE_CONNECTION_DB_PREFIX_NAME=evolution
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true
      - DATABASE_SAVE_MESSAGE_UPDATE=true
      - DATABASE_SAVE_DATA_CONTACTS=true
      - DATABASE_SAVE_DATA_CHATS=true
      - LOG_LEVEL=ERROR
      - LOG_COLOR=true
      - CONFIG_SESSION_PHONE_CLIENT=Face Media Factory
      - CONFIG_SESSION_PHONE_NAME=Chrome
    volumes:
      - evolution_instances:/evolution/instances
      - evolution_store:/evolution/store
    depends_on:
      - mongodb

  mongodb:
    image: mongo:latest
    container_name: mongodb
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=evolution

volumes:
  evolution_instances:
  evolution_store:
  mongodb_data:
EOF

echo -e "${GREEN}OK${NC} docker-compose.yml cree"

echo -e "${BLUE}[6/7]${NC} Demarrage Evolution API..."
docker-compose up -d

echo -e "${BLUE}[7/7]${NC} Attente demarrage (45 sec)..."
sleep 45

# Test de l'API
echo ""
echo "Test de l'API..."
HEALTH=$(curl -s http://localhost:8080/ 2>/dev/null || echo "error")

if [[ $HEALTH != "error" ]]; then
    echo -e "${GREEN}OK${NC} API operationnelle !"
    echo ""
    echo "=================================="
    echo -e "${GREEN}   INSTALLATION REUSSIE !${NC}"
    echo "=================================="
    echo ""

    # Get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "IP_INCONNUE")

    echo -e "IP Publique: ${BLUE}$PUBLIC_IP${NC}"
    echo -e "API URL:     ${BLUE}http://$PUBLIC_IP:8080${NC}"
    echo -e "API Key:     ${BLUE}$API_KEY${NC}"
    echo ""
    echo "=================================="
    echo ""
    echo "PROCHAINE ETAPE:"
    echo "   Cree une instance WhatsApp avec:"
    echo ""
    echo -e "   ${BLUE}./create-whatsapp-instance.sh${NC}"
    echo ""

    # Copie des scripts helper dans /opt/evolution-api
    cd /opt/evolution-api

    # Create instance script
    cat > create-whatsapp-instance.sh << 'EOFSCRIPT'
#!/bin/bash

# Creation Instance WhatsApp + QR Code
# Face Media Factory

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
else
    # Check if instance already exists
    if [[ $RESPONSE == *"already"* ]] || [[ $RESPONSE == *"exists"* ]]; then
        echo -e "${YELLOW}!${NC} Instance existe deja, reconnexion..."
    else
        echo -e "${RED}X${NC} Erreur creation instance"
        echo "$RESPONSE"
        exit 1
    fi
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
EOFSCRIPT

    chmod +x create-whatsapp-instance.sh

    # Create test script
    cat > test-whatsapp.sh << 'EOFSCRIPT'
#!/bin/bash

# Test WhatsApp Message
# Face Media Factory

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

API_KEY="B6D711FCDE4D4FD5936544120E713976"
INSTANCE_NAME="facemedia"

if [ -z "$1" ]; then
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
EOFSCRIPT

    chmod +x test-whatsapp.sh

    # Create status script
    cat > status.sh << 'EOFSCRIPT'
#!/bin/bash

# Status Evolution API
# Face Media Factory

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

API_KEY="B6D711FCDE4D4FD5936544120E713976"
INSTANCE_NAME="facemedia"

echo "=================================="
echo "   Evolution API Status"
echo "=================================="
echo ""

# Check Docker containers
echo -e "${BLUE}Docker Containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "evolution|mongo" || echo "  Aucun container trouve"
echo ""

# Check API
API_STATUS=$(curl -s http://localhost:8080/ 2>/dev/null)
if [[ ! -z "$API_STATUS" ]]; then
    echo -e "API Status: ${GREEN}ONLINE${NC}"
else
    echo -e "API Status: ${RED}OFFLINE${NC}"
fi

# Check instance
STATE=$(curl -s http://localhost:8080/instance/connectionState/$INSTANCE_NAME \
  -H "apikey: $API_KEY" 2>/dev/null | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

if [[ $STATE == "open" ]]; then
    echo -e "WhatsApp:   ${GREEN}CONNECTE${NC}"
else
    echo -e "WhatsApp:   ${YELLOW}$STATE${NC}"
fi

PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null)
echo ""
echo -e "IP:         ${BLUE}$PUBLIC_IP${NC}"
echo -e "URL:        ${BLUE}http://$PUBLIC_IP:8080${NC}"
echo ""
EOFSCRIPT

    chmod +x status.sh

    echo "Scripts helper crees:"
    echo "  - ./create-whatsapp-instance.sh"
    echo "  - ./test-whatsapp.sh"
    echo "  - ./status.sh"
    echo ""

else
    echo -e "${RED}X${NC} Erreur - API ne repond pas"
    echo ""
    echo "Logs:"
    docker-compose logs --tail=50
    exit 1
fi
