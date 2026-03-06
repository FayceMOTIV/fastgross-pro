#!/bin/bash
# ==============================================
# FMF — Fix Redis + Evolution API sur VPS
# Copier-coller ce script en entier sur le VPS
# ==============================================
set -e

echo "=== [1/7] Arret des containers ==="
docker stop evolution_api 2>/dev/null || true
docker stop evolution_redis 2>/dev/null || true
docker rm evolution_api 2>/dev/null || true
docker rm evolution_redis 2>/dev/null || true

echo "=== [2/7] Verification du reseau Docker ==="
docker network inspect evolution_default >/dev/null 2>&1 || docker network create evolution_default
echo "Reseau evolution_default OK"

echo "=== [3/7] Demarrage Redis ==="
docker run -d \
  --name evolution_redis \
  --network evolution_default \
  --restart unless-stopped \
  -v evolution_redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru

echo "Attente demarrage Redis..."
sleep 3

# Verifier que Redis repond
echo "=== [4/7] Test Redis ==="
REDIS_PING=$(docker exec evolution_redis redis-cli ping 2>&1)
if [ "$REDIS_PING" != "PONG" ]; then
  echo "ERREUR: Redis ne repond pas! ($REDIS_PING)"
  exit 1
fi
echo "Redis repond: $REDIS_PING"

echo "=== [5/7] Ecriture .env ==="
cat > /root/evolution/.env << 'ENVEOF'
SERVER_URL=http://94.130.184.44:8080
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=fmf-evolution-key-2026
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:evolution123@evolution_postgres:5432/evolution
DATABASE_CONNECTION_CLIENT_NAME=evolution_v2
REDIS_ENABLED=true
REDIS_URI=redis://evolution_redis:6379
REDIS_PREFIX_KEY=evo
LOG_LEVEL=ERROR,WARN
LOG_COLOR=true
LOG_BAILEYS=error
DEL_INSTANCE=false
ENVEOF
echo ".env ecrit"

echo "=== [6/7] Demarrage Evolution API ==="
docker run -d \
  --name evolution_api \
  --network evolution_default \
  --restart unless-stopped \
  --env-file /root/evolution/.env \
  -p 8080:8080 \
  evoapicloud/evolution-api:v2.3.7

echo "Attente demarrage Evolution API..."
sleep 8

echo "=== [7/7] Verification ==="
# Test connectivite Redis depuis Evolution API
echo "--- Test reseau Redis ---"
docker exec evolution_api sh -c "nc -zv evolution_redis 6379 2>&1" || echo "nc non disponible, test alternatif..."

# Verifier les logs (10 dernieres lignes)
echo "--- Logs Evolution API ---"
docker logs evolution_api --tail 15 2>&1

# Verifier l'etat de l'instance
echo "--- Etat instance ---"
sleep 2
curl -s http://localhost:8080/instance/connectionState/fmf-whatsapp3 \
  -H "apikey: fmf-evolution-key-2026" | python3 -m json.tool 2>/dev/null || \
curl -s http://localhost:8080/instance/connectionState/fmf-whatsapp3 \
  -H "apikey: fmf-evolution-key-2026"

echo ""
echo "=== Termine ==="
echo "Si l'instance est 'close', reconnecter avec:"
echo "  curl -s -X GET http://localhost:8080/instance/connect/fmf-whatsapp3 -H 'apikey: fmf-evolution-key-2026'"
echo ""
echo "Pour voir le QR code dans le terminal:"
echo "  curl -s http://localhost:8080/instance/connect/fmf-whatsapp3 -H 'apikey: fmf-evolution-key-2026' | python3 -c \"import sys,json; d=json.load(sys.stdin); print(d.get('base64','Pas de QR')[:100]+'...')\""
