# Photo Prestiges - Cloud Architectuur

## Overzicht

Photo Prestiges is een gedistribueerde, schaalbare cloud-applicatie gebouwd met een microservices-architectuur. Dit document beschrijft de technische architectuur, design decisions, en schaalbaarheidsoverwegingen.

## Architectuur Principes

### 1. Microservices Pattern
Elke service heeft een specifieke verantwoordelijkheid en kan onafhankelijk worden ontwikkeld, gedeployed, en geschaald.

**Voordelen:**
- Onafhankelijke development en deployment
- Technologie heterogeniteit (verschillende talen/frameworks mogelijk)
- Fault isolation (failures beïnvloeden niet het hele systeem)
- Granulaire schaalbaarheid

### 2. API-First Design
Alle services communiceren via goed gedefinieerde REST APIs.

**Voordelen:**
- Duidelijke contracten tussen services
- Eenvoudige integratie van nieuwe services
- Mogelijkheid voor meerdere clients (web, mobile, desktop)

### 3. Cloud-Native
Applicatie is ontworpen om optimaal gebruik te maken van cloud capabilities.

**Features:**
- Cloud storage voor photos (S3/GCS/Azure)
- Managed databases (RDS/Cloud SQL/Azure Database)
- CDN voor snelle content delivery
- Auto-scaling based on load
- Geographic distribution

## Service Architectuur

### Service Lagen

```
┌─────────────────────────────────────────────────┐
│              API Gateway / Load Balancer         │
│         (Authenticatie, Rate Limiting, CORS)     │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│Public Service│ │Private       │ │Background    │
│              │ │Services      │ │Services      │
│ - Read       │ │ - Auth       │ │ - Clock      │
│ - Target     │ │ - Register   │ │ - Mail       │
│ - Score      │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │     Data Layer                │
        │  - PostgreSQL (Primary)       │
        │  - PostgreSQL (Read Replicas) │
        │  - Redis (Cache)              │
        └───────────────────────────────┘
```

### Data Flow Patterns

#### Write Path (Photo Upload)
```
User → API Gateway → Target Service → Cloud Storage
                  ↓
            PostgreSQL (photos table)
                  ↓
            Image Analysis APIs
                  ↓
            PostgreSQL (analysis data)
                  ↓
            Response to User
```

#### Read Path (Browse Photos)
```
User → API Gateway → Read Service → Redis Cache?
                                         │
                                    Yes  │  No
                                         │
                                    Cache Hit  → PostgreSQL Read Replica
                                         │              │
                                    Response ←──────────┘
```

#### Vote Path
```
User → API Gateway → Score Service → PostgreSQL (votes)
                                  ↓
                              Redis Cache (invalidate)
                                  ↓
                              Update Scores (async)
                                  ↓
                              Mail Service (notification)
```

## Database Design

### Schema Overview

**Core Tables:**
- `users` - Gebruikersgegevens
- `photos` - Foto metadata
- `votes` - Stemmen op foto's
- `badges` - Badge definities
- `user_badges` - Verdiende badges

**Supporting Tables:**
- `photo_scores` - Denormalized scores
- `user_stats` - Denormalized statistieken
- `email_queue` - Email verzend queue
- `scheduled_jobs` - Cron job tracking

### Replication Strategy

**Primary-Replica Setup:**
- 1 Primary (write operations)
- 2+ Read Replicas (read operations)
- Asynchronous replication
- Read Service gebruikt replicas
- Write services gebruiken primary

**Benefits:**
- Reduced load on primary
- Better read performance
- Geographic distribution possible
- High availability

## Caching Strategy

### Redis Cache Layers

**L1 Cache (1-5 min TTL):**
- Individual photos
- User profiles
- Search results

**L2 Cache (15-60 min TTL):**
- Leaderboards
- Trending content
- Statistics

**Cache Invalidation:**
- Time-based expiry
- Event-based (on write operations)
- Cache-aside pattern

### Cache Key Design
```
photo:{id}
photos:list:{page}:{sort}:{filters}
leaderboard:{period}:{type}
user:{id}:profile
stats:platform
```

## External Services Integratie

### Cloud Storage
**Requirements:**
- Public URLs voor photos
- CDN integratie
- Large file support (up to 10MB)
- High availability

**Providers:**
- AWS S3 + CloudFront
- Google Cloud Storage + CDN
- Azure Blob Storage + CDN

### Image Analysis
**Imagga API:**
- Auto-tagging
- Color extraction
- Categorization

**Google Cloud Vision:**
- Object detection
- SafeSearch (content moderation)
- Label detection

### Email Service
**SendGrid/Mailgun/SES:**
- Transactional emails
- Template support
- Delivery tracking
- High deliverability

## Schaalbaarheid

### Horizontal Scaling

**Stateless Services:**
Alle services zijn stateless en kunnen horizontaal schalen:
```
Load Balancer
    ├─ Auth Service Instance 1
    ├─ Auth Service Instance 2
    └─ Auth Service Instance N
```

**Auto-Scaling Triggers:**
- CPU utilization > 70%
- Memory utilization > 80%
- Request rate > threshold
- Queue depth > threshold

### Vertical Scaling

**Database:**
- Upgrade instance size as needed
- Add more read replicas
- Consider sharding for very large scale

**Cache:**
- Redis cluster mode
- Multiple Redis instances
- Cache partitioning

### Geographic Distribution

**Multi-Region Deployment:**
```
Region: EU-West
  ├─ All Services
  ├─ PostgreSQL Primary
  └─ Redis Cache

Region: US-East (optional)
  ├─ Read Services
  ├─ PostgreSQL Read Replica
  └─ Redis Cache
```

## Security Architectuur

### Authentication Flow
```
1. User logs in → Auth Service
2. Auth Service validates credentials
3. Generate JWT token (claims: user_id, role)
4. Return token to user
5. User includes token in subsequent requests
6. Services validate token with Auth Service
```

### Authorization Levels
- **Public:** Anyone (read photos, leaderboards)
- **Authenticated:** Logged-in users (upload, vote, profile)
- **Admin:** Platform administrators (moderation, analytics)

### Data Security
- All data encrypted at rest (cloud storage, database)
- All communication over HTTPS/TLS
- Secrets in environment variables (not in code)
- Regular security audits

## Monitoring & Observability

### Metrics to Track

**Application Metrics:**
- Request rate per service
- Response time (p50, p95, p99)
- Error rate
- Active users

**Business Metrics:**
- Photos uploaded per day
- Votes per day
- New user registrations
- Active users (DAU, MAU)

**Infrastructure Metrics:**
- CPU/Memory utilization
- Database connections
- Cache hit ratio
- Disk I/O

### Logging Strategy

**Structured Logging:**
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "service": "target-service",
  "level": "info",
  "message": "Photo uploaded",
  "userId": "user_id",
  "photoId": "photo_id",
  "duration": 234
}
```

**Centralized Logging:**
- All services → Log aggregation (ELK, CloudWatch, Stackdriver)
- Searchable logs
- Alerts on errors
- Audit trail

## Disaster Recovery

### Backup Strategy
- Database backups: Daily automated
- Retention: 30 days
- Point-in-time recovery enabled
- Photos: Versioning enabled in cloud storage

### Recovery Plan
1. Restore database from backup
2. Replay transaction logs if available
3. Verify data integrity
4. Restore service

**RTO (Recovery Time Objective):** < 4 hours
**RPO (Recovery Point Objective):** < 1 hour

## Deployment Strategy

### CI/CD Pipeline
```
Code Push → GitHub
    ↓
Automated Tests
    ↓
Build Docker Images
    ↓
Push to Container Registry
    ↓
Deploy to Staging
    ↓
Integration Tests
    ↓
Manual Approval
    ↓
Deploy to Production (Rolling Update)
```

### Blue-Green Deployment
- Maintain two identical environments
- Switch traffic when new version is ready
- Instant rollback if issues detected

## Cost Optimisatie

### Compute
- Auto-scaling: scale down during low traffic
- Reserved instances for baseline capacity
- Spot instances for non-critical workloads

### Storage
- S3 Intelligent-Tiering for photos
- Lifecycle policies (archive old photos)
- Compress images

### Database
- Right-size instances
- Use read replicas efficiently
- Archive old data

## Toekomstige Uitbreidingen

### Phase 2 Features
- Real-time updates (WebSockets)
- Advanced search (Elasticsearch)
- Video support
- Social features (comments, follows)
- Mobile apps (iOS, Android)

### Scalability Improvements
- Service mesh (Istio/Linkerd)
- Event-driven architecture (message queues)
- GraphQL API
- Database sharding
- Multi-region active-active

## Conclusie

Deze architectuur biedt een solide basis voor een schaalbare, onderhoudbare foto-wedstrijd applicatie. De microservices benadering zorgt voor flexibiliteit en onafhankelijke schaalbaarheid, terwijl cloud-native patterns optimale gebruik maken van cloud resources.
