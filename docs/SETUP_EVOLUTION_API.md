# Setup Evolution API - Guide Ultra-Simple

## Temps Total: 6 minutes

Tu fais **SEULEMENT 3 ACTIONS**, le reste est automatique.

---

## ETAPE 1: Cree ton VPS (5 min)

### 1.1 Va sur Hetzner

https://www.hetzner.com/cloud

### 1.2 Creer un compte

- Email
- Mot de passe
- Verifie ton email

### 1.3 Ajoute ta carte bancaire

- Card details
- Pas de charge immediate

### 1.4 Cree un projet

- Nom: "Face Media Factory"

### 1.5 Cree un serveur

```
Location: Germany (Falkenstein)
Image: Ubuntu 24.04
Type: CX11 (4.15 EUR/mois)
Name: facemedia-whatsapp
```

**SSH Key**:

Sur ton Mac:
```bash
cat ~/.ssh/id_rsa.pub
```

Copie TOUT le texte, colle dans Hetzner

Si tu n'as pas de cle SSH:
```bash
ssh-keygen -t rsa -b 4096
# Appuie Entree 3 fois
cat ~/.ssh/id_rsa.pub
```

### 1.6 Create & Buy

Attends 30-60 secondes

### 1.7 Note l'IP

Example: `95.217.123.45`

**VPS CREE !**

---

## ETAPE 2: Installe Evolution API (30 sec)

### 2.1 Connecte-toi au VPS

```bash
ssh root@TON-IP
```

Remplace `TON-IP` par l'IP de ton VPS (ex: `ssh root@95.217.123.45`)

Tape `yes` si demande

### 2.2 Copie-colle CE script

```bash
curl -fsSL https://raw.githubusercontent.com/faicalkriouar/face-media-factory/main/install-evolution-api.sh | bash
```

**C'EST TOUT !** Attends 2-3 minutes

Le script fait TOUT automatiquement:
- Update systeme
- Install Docker
- Clone Evolution API
- Demarre l'API
- Teste que ca marche

**API INSTALLEE !**

---

## ETAPE 3: Connecte WhatsApp (30 sec)

### 3.1 Cree l'instance

Sur le VPS:
```bash
cd /opt/evolution-api
./create-whatsapp-instance.sh
```

### 3.2 Ouvre le lien

Le script affiche:
```
http://95.217.123.45:8080/instance/connect/facemedia
```

Ouvre ce lien dans ton navigateur

### 3.3 Scanne le QR code

1. WhatsApp sur ton telephone
2. Settings > Linked Devices
3. Link a Device
4. Scanne le QR

**WHATSAPP CONNECTE !**

---

## TEST

Sur le VPS:
```bash
cd /opt/evolution-api
./test-whatsapp.sh +33612345678
```

Remplace par TON numero

Tu dois recevoir le message en 5 secondes !

---

## CONFIGURATION FIREBASE

Sur ton Mac:
```bash
cd ~/Projects/face-media-factory
./configure-firebase.sh
```

Entre l'IP de ton VPS quand demande.

---

## C'EST FINI !

**IP de ton VPS**: `ton-ip`
**Instance**: `facemedia`
**API Key**: `B6D711FCDE4D4FD5936544120E713976`

Retourne dans Face Media Factory:
- https://face-media-factory.web.app/app/whatsapp

---

## TROUBLESHOOTING

### L'API ne repond pas

```bash
# Sur le VPS:
cd /opt/evolution-api
docker-compose logs -f
```

### WhatsApp deconnecte

```bash
cd /opt/evolution-api
./create-whatsapp-instance.sh
```

Rescanne le QR code.

### Redemarrer l'API

```bash
cd /opt/evolution-api
docker-compose restart
```

### Voir le status

```bash
cd /opt/evolution-api
./status.sh
```
