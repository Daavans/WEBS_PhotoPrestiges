# Photo Prestiges - Cloud Services Eindopdracht

Photo Prestiges is een schaalbare cloud-gebaseerde applicatie voor het organiseren van foto-wedstrijden met gamification-elementen. Het systeem maakt gebruik van een microservices-architectuur voor optimale schaalbaarheid en onderhoudbaarheid.

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
- Node.js 18+ of Python 3.9+
- Docker & Docker Compose
- Cloud provider account (AWS/GCP/Azure)
- API keys voor image analysis en email services

### Installatie
```bash
# Clone de repository
git clone https://github.com/Daavans/WEBS_PhotoPrestiges.git
cd WEBS_PhotoPrestiges

# Installeer dependencies voor elke service
cd services/auth && npm install
cd ../register && npm install
# ... herhaal voor elke service

# Of gebruik Docker Compose
docker-compose up -d
```

### Configuratie
Kopieer `.env.example` naar `.env` en vul de vereiste credentials in:
```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Cloud Storage
CLOUD_STORAGE_BUCKET=my-bucket
CLOUD_STORAGE_KEY=xxx

# Image Analysis
IMAGGA_API_KEY=xxx
IMAGGA_API_SECRET=xxx
GOOGLE_VISION_API_KEY=xxx

# Email
SENDGRID_API_KEY=xxx
EMAIL_FROM=noreply@photoprestiges.com

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h
```

## 📁 Project Structuur

```
WEBS_PhotoPrestiges/
├── README.md
├── docker-compose.yml
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