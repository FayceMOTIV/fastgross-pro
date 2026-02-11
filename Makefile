# ============================================
# Face Media Factory - Makefile
# ============================================
# Commandes Docker simplifiees
#
# Usage:
#   make help      - Affiche l'aide
#   make up        - Demarre le stack
#   make down      - Arrete le stack
#   make logs      - Voir les logs

.PHONY: help up down build logs restart clean test shell-frontend shell-firebase status seed prod

# Couleurs pour l'affichage
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

# ─────────────────────────────────────────────
# AIDE
# ─────────────────────────────────────────────
help:
	@echo ""
	@echo "$(CYAN)╔════════════════════════════════════════════════════════════╗$(RESET)"
	@echo "$(CYAN)║      Face Media Factory - Commandes Docker                 ║$(RESET)"
	@echo "$(CYAN)╚════════════════════════════════════════════════════════════╝$(RESET)"
	@echo ""
	@echo "$(GREEN)Demarrage:$(RESET)"
	@echo "  make up              Demarrer tous les services"
	@echo "  make up-logs         Demarrer avec logs visibles"
	@echo "  make down            Arreter tous les services"
	@echo "  make restart         Redemarrer tous les services"
	@echo ""
	@echo "$(GREEN)Build:$(RESET)"
	@echo "  make build           Rebuild les images Docker"
	@echo "  make build-no-cache  Rebuild sans cache"
	@echo "  make prod            Build et demarrer en mode production"
	@echo ""
	@echo "$(GREEN)Logs & Debug:$(RESET)"
	@echo "  make logs            Voir tous les logs"
	@echo "  make logs-frontend   Logs du frontend uniquement"
	@echo "  make logs-firebase   Logs de Firebase uniquement"
	@echo "  make status          Etat des conteneurs"
	@echo ""
	@echo "$(GREEN)Shell:$(RESET)"
	@echo "  make shell-frontend  Shell dans le conteneur frontend"
	@echo "  make shell-firebase  Shell dans le conteneur Firebase"
	@echo ""
	@echo "$(GREEN)Database:$(RESET)"
	@echo "  make seed            Charger les donnees de test"
	@echo "  make db-export       Exporter les donnees Firestore"
	@echo "  make db-import       Importer les donnees Firestore"
	@echo ""
	@echo "$(GREEN)Tests:$(RESET)"
	@echo "  make test            Lancer les tests frontend"
	@echo "  make lint            Lancer le linter"
	@echo ""
	@echo "$(GREEN)Nettoyage:$(RESET)"
	@echo "  make clean           Arreter et supprimer les conteneurs"
	@echo "  make clean-all       Supprimer tout (volumes inclus)"
	@echo "  make prune           Nettoyer Docker (images inutilisees)"
	@echo ""
	@echo "$(YELLOW)URLs:$(RESET)"
	@echo "  Frontend:      http://localhost:5173"
	@echo "  Firebase UI:   http://localhost:4000"
	@echo "  Firestore:     http://localhost:8080"
	@echo "  Functions:     http://localhost:5001"
	@echo "  Auth:          http://localhost:9099"
	@echo ""

# ─────────────────────────────────────────────
# DEMARRAGE
# ─────────────────────────────────────────────
up:
	@echo "$(GREEN)Demarrage du stack Face Media Factory...$(RESET)"
	docker compose up -d
	@echo ""
	@echo "$(GREEN)Stack demarre !$(RESET)"
	@echo "  Frontend:      http://localhost:5173"
	@echo "  Firebase UI:   http://localhost:4000"
	@echo ""
	@echo "Utilisez 'make logs' pour voir les logs"

up-logs:
	@echo "$(GREEN)Demarrage du stack avec logs...$(RESET)"
	docker compose up

down:
	@echo "$(YELLOW)Arret du stack...$(RESET)"
	docker compose down
	@echo "$(GREEN)Stack arrete.$(RESET)"

restart:
	@echo "$(YELLOW)Redemarrage du stack...$(RESET)"
	docker compose restart
	@echo "$(GREEN)Stack redemarre.$(RESET)"

# ─────────────────────────────────────────────
# BUILD
# ─────────────────────────────────────────────
build:
	@echo "$(GREEN)Build des images Docker...$(RESET)"
	docker compose build

build-no-cache:
	@echo "$(GREEN)Build des images Docker (sans cache)...$(RESET)"
	docker compose build --no-cache

prod:
	@echo "$(GREEN)Build et demarrage en mode production...$(RESET)"
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
	@echo ""
	@echo "$(GREEN)Production demarre sur http://localhost:80$(RESET)"

# ─────────────────────────────────────────────
# LOGS
# ─────────────────────────────────────────────
logs:
	docker compose logs -f

logs-frontend:
	docker compose logs -f frontend

logs-firebase:
	docker compose logs -f firebase

status:
	@echo "$(CYAN)Etat des conteneurs:$(RESET)"
	docker compose ps

# ─────────────────────────────────────────────
# SHELL
# ─────────────────────────────────────────────
shell-frontend:
	docker compose exec frontend sh

shell-firebase:
	docker compose exec firebase bash

# ─────────────────────────────────────────────
# DATABASE
# ─────────────────────────────────────────────
seed:
	@echo "$(GREEN)Chargement des donnees de test...$(RESET)"
	docker compose exec firebase firebase emulators:exec \
		--only firestore \
		"node -e \"import('./functions/src/dev/seedData.js').then(m => m.seedData())\""

db-export:
	@echo "$(GREEN)Export des donnees Firestore...$(RESET)"
	docker compose exec firebase firebase emulators:export /app/.firebase-data --force
	@echo "$(GREEN)Donnees exportees dans firebase_data volume$(RESET)"

db-import:
	@echo "$(GREEN)Import des donnees Firestore...$(RESET)"
	docker compose restart firebase
	@echo "$(GREEN)Donnees importees depuis firebase_data volume$(RESET)"

# ─────────────────────────────────────────────
# TESTS
# ─────────────────────────────────────────────
test:
	@echo "$(GREEN)Lancement des tests...$(RESET)"
	docker compose exec frontend npm run test:run

lint:
	@echo "$(GREEN)Lancement du linter...$(RESET)"
	docker compose exec frontend npm run lint

# ─────────────────────────────────────────────
# NETTOYAGE
# ─────────────────────────────────────────────
clean:
	@echo "$(YELLOW)Nettoyage des conteneurs...$(RESET)"
	docker compose down --rmi local
	@echo "$(GREEN)Conteneurs supprimes.$(RESET)"

clean-all:
	@echo "$(YELLOW)Nettoyage complet (volumes inclus)...$(RESET)"
	docker compose down -v --rmi local
	@echo "$(GREEN)Tout supprime.$(RESET)"

prune:
	@echo "$(YELLOW)Nettoyage Docker...$(RESET)"
	docker system prune -f
	@echo "$(GREEN)Docker nettoye.$(RESET)"

# ─────────────────────────────────────────────
# INITIALISATION
# ─────────────────────────────────────────────
init:
	@echo "$(GREEN)Initialisation du projet...$(RESET)"
	@if [ ! -f .env ]; then \
		cp .env.docker.example .env; \
		echo "$(GREEN)Fichier .env cree depuis .env.docker.example$(RESET)"; \
	else \
		echo "$(YELLOW)Fichier .env existe deja$(RESET)"; \
	fi
	@echo ""
	@echo "$(CYAN)Prochaines etapes:$(RESET)"
	@echo "  1. Editez .env avec vos cles API"
	@echo "  2. Lancez 'make up'"
	@echo "  3. Ouvrez http://localhost:5173"
