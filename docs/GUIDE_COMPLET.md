# Evolution API - Setup 99% Automatise

## Ce que TU fais (6 minutes)

1. **Cree VPS Hetzner** (5 min) - Carte bancaire requise
2. **Copie 1 script** (10 sec) - 1 ligne de commande
3. **Scanne QR WhatsApp** (30 sec) - Avec ton telephone

## Ce que les SCRIPTS font (tout le reste)

- Install Docker
- Install Evolution API
- Configure tout
- Cree instance WhatsApp
- Genere QR code
- Test automatique
- Configure Firebase
- Deploy functions

---

## START

### ETAPE 1: Cree VPS (5 min)

#### Sur Hetzner:

https://www.hetzner.com/cloud

```
1. Creer compte
2. Ajouter carte bancaire
3. Nouveau projet "Face Media Factory"
4. Creer serveur:
   - Location: Germany
   - Image: Ubuntu 24.04
   - Type: CX11 (4.15 EUR/mois)
   - SSH Key: Ta cle publique Mac
5. Note l'IP (ex: 95.217.123.45)
```

**SSH Key?**
```bash
# Sur ton Mac:
cat ~/.ssh/id_rsa.pub

# Copie TOUT le texte
# Colle dans Hetzner
```

Pas de cle? Cree-en une:
```bash
ssh-keygen -t rsa -b 4096
# Appuie Entree 3 fois pour valeurs par defaut
cat ~/.ssh/id_rsa.pub
```

---

### ETAPE 2: Run Script Installation (10 sec)

```bash
# Connecte au VPS:
ssh root@TON-IP

# Copie-colle:
curl -fsSL https://raw.githubusercontent.com/faicalkriouar/face-media-factory/main/install-evolution-api.sh | bash
```

**Attends 2-3 min** - Le script fait TOUT automatiquement

Output attendu:
```
==================================
   INSTALLATION REUSSIE !
==================================

IP Publique: 95.217.123.45
API URL:     http://95.217.123.45:8080
API Key:     B6D711FCDE4D4FD5936544120E713976

PROCHAINE ETAPE:
   ./create-whatsapp-instance.sh
```

---

### ETAPE 3: Scanne QR WhatsApp (30 sec)

```bash
# Sur le VPS:
cd /opt/evolution-api
./create-whatsapp-instance.sh
```

Le script affiche un lien:
```
http://95.217.123.45:8080/instance/connect/facemedia
```

1. Ouvre le lien dans ton navigateur
2. WhatsApp > Settings > Linked Devices
3. Scanne le QR

**DONE!**

---

### ETAPE 4: Configure Firebase (Auto)

```bash
# Sur TON Mac:
cd ~/Projects/face-media-factory

./configure-firebase.sh
```

Entre l'IP de ton VPS quand demande

**Attends 2-3 min** - Deploy automatique

---

## TEST FINAL

### Test 1: WhatsApp Direct

```bash
# Sur le VPS:
cd /opt/evolution-api
./test-whatsapp.sh +33612345678
```

Tu dois recevoir un message !

### Test 2: Instagram > WhatsApp

1. https://face-media-factory.web.app/app/hunter
2. Hashtag: `#restaurantparis`
3. Max profiles: `20`
4. Start Hunter

Attends 10 min

5. Firestore > prospects
6. Verifie que `phone` est extrait
7. https://face-media-factory.web.app/app/whatsapp
8. Stats doivent s'afficher

---

## C'EST FINI !

**Ton Evolution API:**
- URL: `http://TON-IP:8080`
- Instance: `facemedia`
- Status: LIVE

**Automatisation:**
- WhatsApp Checker: `2h daily`
- WhatsApp Sender: `Every hour 9h-22h`
- Phones extraction: Auto

**Cout:**
- VPS: `4.15 EUR/mois`
- Messages: `GRATUIT illimites`

---

## COMMANDES UTILES

### Status

```bash
cd /opt/evolution-api
./status.sh
```

### Logs Evolution API

```bash
cd /opt/evolution-api
docker-compose logs -f evolution-api
```

### Redemarrer

```bash
cd /opt/evolution-api
docker-compose restart
```

### Reconnecter WhatsApp

```bash
cd /opt/evolution-api
./create-whatsapp-instance.sh
```

### Envoyer message manuel

```bash
./test-whatsapp.sh +33XXXXXXXXX "Ton message ici"
```

---

## ARCHITECTURE

```
VPS Hetzner (4.15 EUR/mois)
    |
    +-- Docker
    |     |
    |     +-- evolution-api (port 8080)
    |     +-- mongodb (stockage sessions)
    |
    +-- Scripts
          |
          +-- create-whatsapp-instance.sh
          +-- test-whatsapp.sh
          +-- status.sh

Firebase Cloud Functions
    |
    +-- whatsappChecker (2h daily)
    |     Verifie numeros WhatsApp
    |
    +-- whatsappSender (hourly)
    |     Envoie messages (10/h max)
    |
    +-- sendWhatsAppManual (callable)
    |     Envoi manuel depuis UI
    |
    +-- getWhatsAppStats (callable)
          Stats pour dashboard
```

---

## SECURITE

### Firewall VPS (optionnel)

```bash
ufw allow 22/tcp    # SSH
ufw allow 8080/tcp  # Evolution API
ufw enable
```

### Changer API Key (optionnel)

1. Sur le VPS:
```bash
cd /opt/evolution-api
nano docker-compose.yml
# Change AUTHENTICATION_API_KEY
docker-compose down && docker-compose up -d
```

2. Sur ton Mac:
```bash
nano functions/.env
# Change EVOLUTION_API_KEY
firebase deploy --only functions
```

---

## TROUBLESHOOTING

### "Connection refused"

```bash
# Verifier que les containers tournent
docker ps

# Si rien:
cd /opt/evolution-api
docker-compose up -d
```

### "QR code expire"

```bash
./create-whatsapp-instance.sh
```

### "WhatsApp deconnecte apres quelques jours"

Normal si le telephone est eteint trop longtemps.
Rescanne le QR code.

### "Messages non envoyes"

1. Verifie que WhatsApp est connecte:
```bash
./status.sh
```

2. Verifie les quotas (50/jour max)

3. Verifie les heures (9h-22h, pas weekend)
