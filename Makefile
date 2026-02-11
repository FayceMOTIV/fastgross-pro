.PHONY: up down build logs dev dev-down dev-logs restart clean ps

# ─── PRODUCTION ────────────────────────────────

# Démarrer en production (Nginx + static build)
up:
	docker compose up -d

# Démarrer avec logs visibles
up-logs:
	docker compose up

# Arrêter
down:
	docker compose down

# Build Next.js + rebuild image Docker
build:
	npm run build && docker compose build --no-cache

# Voir les logs
logs:
	docker compose logs -f

# Status des containers
ps:
	docker compose ps

# Redémarrer
restart:
	docker compose restart

# ─── DEVELOPMENT ───────────────────────────────

# Démarrer en dev (hot-reload)
dev:
	docker compose -f docker-compose.dev.yml up -d

# Démarrer dev avec logs
dev-logs:
	docker compose -f docker-compose.dev.yml up

# Arrêter dev
dev-down:
	docker compose -f docker-compose.dev.yml down

# Logs dev
dev-log:
	docker compose -f docker-compose.dev.yml logs -f

# Shell dans le container dev
shell:
	docker compose -f docker-compose.dev.yml exec dev sh

# ─── UTILITAIRES ───────────────────────────────

# Nettoyer tout (containers, images, volumes)
clean:
	docker compose down -v --rmi local 2>/dev/null || true
	docker compose -f docker-compose.dev.yml down -v --rmi local 2>/dev/null || true
	docker system prune -f

# Build local (sans Docker)
local-build:
	npm run build

# Deploy Firebase (sans Docker)
deploy:
	npm run build && firebase deploy --only hosting
