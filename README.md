# Photo Prestiges - Cloud Services Eindopdracht

[![CI – Tests & Docker Build](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml)

Photo Prestiges is een schaalbare cloud-gebaseerde applicatie voor het organiseren van foto-wedstrijden met gamification-elementen. Het systeem maakt gebruik van een microservices-architectuur voor optimale schaalbaarheid en onderhoudbaarheid.

## 🧪 CI Teststatus

De CI pipeline draait automatisch bij elke push en pull request. Elke service heeft zijn eigen Jest unit-tests en Docker build check.

| Service | Unit Tests | Docker Build |
|---------|-----------|--------------|
| auth | [![Test – auth](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |
| register | [![CI](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |
| target | [![CI](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |
| score | [![CI](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |
| mail | [![CI](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |
| clock | [![CI](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |
| read | [![CI](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg)](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml) | ![Docker](https://github.com/Daavans/WEBS_PhotoPrestiges/actions/workflows/ci.yml/badge.svg) |

> De badge toont de status van de **laatste run** op de huidige branch. Klik op de badge voor het volledige overzicht per service en job.

## 🏗️ Architectuur Overzicht

Het systeem bestaat uit 7 gespecialiseerde microservices die communiceren via REST APIs:

```
┌─────────────────────────────────────────────────────────────┐
│                    Photo Prestiges Platform                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌───────┐         │
│  │  Auth   │  │ Register │  │ Target │  │ Score │         │
│  │ Service │  │ Service  │  │Service │  │Service│         │
│  └─────────┘  └──────────┘  └────────┘  └───────┘         │
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌────────┐                    │
│  │  Mail   │  │  Clock   │  │  Read  │                    │
│  │ Service │  │ Service  │  │Service │                    │
│  └─────────┘  └──────────┘  └────────┘                    │
└─────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│Cloud Storage│  │Image Analysis│  │Email Service│
│  (Public    │  │  (Imagga/    │  │   (SMTP)    │
│   URLs)     │  │Google Vision)│  │             │
└─────────────┘  └──────────────┘  └─────────────┘
```

## 📦 Microservices

### 1. Auth Service
**Verantwoordelijkheid:** Authenticatie en autorisatie van gebruikers
- JWT token generatie en validatie
- Wachtwoord hashing en verificatie
- Session management
- OAuth2 integratie (optioneel)

### 2. Register Service
**Verantwoordelijkheid:** Gebruikersregistratie en profielbeheer
- Nieuwe gebruikers registreren
- Email verificatie
- Profielinformatie beheren
- Gebruikersgegevens opslaan

### 3. Target Service
**Verantwoordelijkheid:** Foto upload en opslag
- Foto's uploaden naar cloud storage
- Publieke URL's genereren voor afbeeldingen
- Metadata opslaan (gebruiker, timestamp, etc.)
- Integratie met externe image analysis APIs (Imagga/Google Vision)
- Tags en categorieën toekennen aan foto's

### 4. Score Service
**Verantwoordelijkheid:** Stemmen en scorebeheer
- Stemmen op foto's registreren
- Scores berekenen en bijwerken
- Ranglijsten genereren
- Anti-fraud maatregelen (duplicate votes, etc.)

### 5. Mail Service
**Verantwoordelijkheid:** E-mail notificaties
- Welkomstmails versturen
- Notificaties bij nieuwe votes
- Dagelijkse/wekelijkse updates
- Contest resultaten delen
- Email templates beheren

### 6. Clock Service
**Verantwoordelijkheid:** Geplande taken en tijdgebonden acties
- Cron jobs voor periodieke taken
- Contest start/einde beheren
- Automatische scores berekenen op schema
- Cleanup van oude data
- Trigger voor periodieke mail notificaties

### 7. Read Service
**Verantwoordelijkheid:** Data ophalen en weergave
- Foto's ophalen en tonen
- Ranglijsten weergeven
- Gebruikersprofielen ophalen
- Statistieken en analytics
- Read-only queries optimaliseren (caching)

## 🎮 Gamification Features

- **Punten Systeem:** Gebruikers verdienen punten voor uploads en votes
- **Badges:** Achievements voor actieve gebruikers
- **Leaderboards:** Top fotografen en meest geliefde foto's
- **Streaks:** Dagelijkse/wekelijkse activiteit bonussen
- **Levels:** Gebruikers levelen op basis van activiteit
- **Challenges:** Periodieke thematische wedstrijden

## 🔗 REST API Endpoints

### Auth Service
```
POST   /api/auth/login          - Inloggen
POST   /api/auth/logout         - Uitloggen
POST   /api/auth/refresh        - Token vernieuwen
GET    /api/auth/validate       - Token valideren
```

### Register Service
```
POST   /api/register            - Nieuwe gebruiker registreren
GET    /api/register/verify     - Email verificatie
PUT    /api/register/profile    - Profiel bijwerken
GET    /api/register/profile    - Profiel ophalen
```

### Target Service
```
POST   /api/target/upload       - Foto uploaden
GET    /api/target/{id}         - Foto ophalen
DELETE /api/target/{id}         - Foto verwijderen
PUT    /api/target/{id}         - Foto metadata bijwerken
GET    /api/target/user/{id}    - Foto's van gebruiker
```

### Score Service
```
POST   /api/score/vote          - Stem uitbrengen
GET    /api/score/photo/{id}    - Score van foto
GET    /api/score/leaderboard   - Top foto's
GET    /api/score/user/{id}     - Score van gebruiker
```

### Mail Service
```
POST   /api/mail/send           - Email versturen
POST   /api/mail/subscribe      - Inschrijven voor notificaties
DELETE /api/mail/unsubscribe    - Uitschrijven
```

### Clock Service
```
GET    /api/clock/jobs          - Actieve jobs
POST   /api/clock/trigger       - Handmatig job triggeren
GET    /api/clock/status        - Service status
```

### Read Service
```
GET    /api/read/photos         - Alle foto's (gepagineerd)
GET    /api/read/photo/{id}     - Enkele foto met details
GET    /api/read/leaderboard    - Ranglijst
GET    /api/read/stats          - Platform statistieken
GET    /api/read/user/{id}      - Gebruikersprofiel met stats
```

## ☁️ Cloud Infrastructuur

### Cloud Storage
- **Provider:** AWS S3 / Google Cloud Storage / Azure Blob Storage
- **Gebruik:** Opslag van foto's met publieke URLs
- **Features:** CDN integratie voor snelle delivery
- **Security:** Signed URLs voor tijdelijke toegang (optioneel)

### Image Analysis
- **Imagga API:** Tag detection, categorisatie, kleuranalyse
- **Google Cloud Vision API:** Object detection, facial detection, SafeSearch
- **Gebruik:** Automatische tags, content moderatie, categorisatie

### Email Service
- **Provider:** SendGrid / Mailgun / Amazon SES
- **Features:** Templates, tracking, analytics
- **Gebruik:** Transactionele emails en marketing

### Database
- **Primair:** PostgreSQL / MySQL (relationele data)
- **Cache:** Redis (sessions, leaderboards)
- **Optioneel:** MongoDB (flexibele data opslag)

## 🚀 Getting Started

### Vereisten
- Node.js 18+
- Docker & Docker Compose
- API keys voor image analysis (Imagga) en email (Resend)

### Lokaal draaien (Docker Compose)
```bash
# Clone de repository
git clone https://github.com/Daavans/WEBS_PhotoPrestiges.git
cd WEBS_PhotoPrestiges

# Configuratie
cp .env.example .env
# Vul .env in met JWT_SECRET, RESEND_API_KEY, etc.

# Alle services starten (inclusief RabbitMQ, Prometheus, Grafana)
docker-compose up -d

# Monitoring bereikbaar op:
#   Grafana:    http://localhost:3000  (admin/admin)
#   Prometheus: http://localhost:9090
#   RabbitMQ:   http://localhost:15672 (guest/guest)
```

### Unit tests draaien
```bash
# Per service
cd services/auth && npm test

# Of via het CI script (alle services)
for svc in auth register target score mail clock read; do
  (cd services/$svc && npm test)
done
```

### Database migrations
Migrations staan in de **projectroot** en gebruiken dezelfde MongoDB als Auth en Register. Draai ze vanuit de root (na `npm install`):

```bash
npm run migrate:up      # Alle pending migrations uitvoeren
npm run migrate:down    # Laatste migration terugdraaien
npm run migrate:status  # Status van migrations
npm run migrate:create -- <beschrijving>  # Nieuwe migration aanmaken
```

Zorg dat `MONGODB_URI` (of `DATABASE_URL`) in `.env` staat. Bij Docker: draai migrations lokaal tegen `mongodb://localhost:27017/photoprestiges` of in een one-off container met dezelfde `MONGODB_URI`.

### Register service starten
- **Lokaal:** `cd services/register && npm install && npm start` (poort uit `REGISTER_SERVICE_PORT` of `PORT`, default 3002). Laadt `.env` uit de projectroot.
- **Docker:** `docker-compose up -d` start naast Mongo en Auth ook Register op poort 3002.

### Configuratie
Eén gedeelde `.env` in de **projectroot** voor alle services. Auth en Register laden deze .env.

Vereist o.a.: `MONGODB_URI`, `JWT_SECRET`, `AUTH_SERVICE_PORT`, `REGISTER_SERVICE_PORT`. Zie `.env.example` voor alle opties.

## 📁 Project Structuur

```
WEBS_PhotoPrestiges/
├── README.md
├── docker-compose.yml       # Lokale ontwikkeling
├── docker-stack.yml         # Docker Swarm productie
├── .github/workflows/       # GitHub Actions CI/CD
├── monitoring/              # Prometheus + Grafana configuratie
├── scripts/                 # Build en test scripts
├── .gitignore
├── docs/
│   ├── architecture.md
│   ├── api-specification.md
│   └── deployment.md
└── services/
    ├── auth/
    │   ├── README.md
    │   ├── package.json
    │   ├── src/
    │   └── tests/
    ├── register/
    │   ├── README.md
    │   ├── package.json
    │   ├── src/
    │   └── tests/
    ├── target/
    │   ├── README.md
    │   ├── package.json
    │   ├── src/
    │   └── tests/
    ├── score/
    │   ├── README.md
    │   ├── package.json
    │   ├── src/
    │   └── tests/
    ├── mail/
    │   ├── README.md
    │   ├── package.json
    │   ├── src/
    │   └── tests/
    ├── clock/
    │   ├── README.md
    │   ├── package.json
    │   ├── src/
    │   └── tests/
    └── read/
        ├── README.md
        ├── package.json
        ├── src/
        └── tests/
```

## 🔒 Security

- HTTPS voor alle communicatie
- JWT tokens voor authenticatie
- Input validatie op alle endpoints
- Rate limiting op API calls
- Content moderatie via image analysis
- CORS configuratie
- SQL injection preventie
- XSS protection

## 📈 Monitoring & Logging

- Centralized logging (ELK stack of Cloud Logging)
- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Uptime monitoring
- Cost monitoring voor cloud resources

## 🧪 Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

## 📝 Licentie

Dit project is ontwikkeld als eindopdracht voor Cloud Services.

## 👥 Team

Ontwikkeld door studenten voor de Cloud Services cursus.

## 📧 Contact

Voor vragen of suggesties, open een issue op GitHub.