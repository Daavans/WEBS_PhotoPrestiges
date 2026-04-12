# Read Service

## Verantwoordelijkheid
De Read Service optimaliseert het ophalen en weergeven van data binnen het Photo Prestiges platform. Het is gespecialiseerd in read-only queries met caching voor optimale performance.

## Functionaliteiten

### 1. Foto Weergave
- Alle foto's ophalen (gepagineerd)
- Enkele foto met details
- Foto's filteren en zoeken
- Foto's sorteren (nieuw, populair, trending)

### 2. Leaderboards
- Top foto's (overall, week, maand)
- Top fotografen
- Trending foto's
- Category-specific rankings

### 3. Gebruikersprofielen
- Profiel informatie
- Gebruikersstatistieken
- Badge collectie
- Upload geschiedenis

### 4. Statistieken
- Platform statistieken
- Real-time counters
- Activity feeds
- Trend analysis

### 5. Zoeken & Filteren
- Full-text search op foto's
- Tag-based filtering
- Category filtering
- User filtering
- Date range filtering

## REST API Endpoints

### GET /api/read/photos
Haal alle foto's op (gepagineerd).

**Query Parameters:**
```
page=1
limit=20
sort=new  # new, popular, trending
category=nature  # optional
tag=sunset  # optional
userId=user_id  # optional
```

**Response:**
```json
{
  "photos": [
    {
      "id": "photo_id",
      "title": "Sunset at the beach",
      "thumbnailUrl": "https://...",
      "userId": "user_id",
      "username": "photomaster",
      "userAvatar": "https://...",
      "score": 42,
      "totalVotes": 42,
      "tags": ["sunset", "beach", "nature"],
      "uploadedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1000,
    "pages": 50
  }
}
```

### GET /api/read/photo/{id}
Haal enkele foto met volledige details op.

**Response:**
```json
{
  "id": "photo_id",
  "title": "Sunset at the beach",
  "description": "Beautiful sunset photo taken on vacation",
  "url": "https://storage.example.com/photos/photo_id.jpg",
  "thumbnailUrl": "https://storage.example.com/thumbnails/photo_id.jpg",
  "width": 3000,
  "height": 2000,
  "format": "jpg",
  "user": {
    "id": "user_id",
    "username": "photomaster",
    "avatarUrl": "https://...",
    "level": 12,
    "badge": "Pro Photographer"
  },
  "stats": {
    "score": 42,
    "totalVotes": 42,
    "rank": 15,
    "views": 350
  },
  "tags": ["sunset", "beach", "ocean", "nature"],
  "analysis": {
    "colors": ["#FF6B35", "#F7931E", "#004E89"],
    "categories": ["nature", "landscapes"]
  },
  "exif": {
    "camera": "Canon EOS R5",
    "lens": "RF 24-105mm F4",
    "iso": 100,
    "aperture": "f/8",
    "shutterSpeed": "1/125",
    "focalLength": "50mm",
    "takenAt": "2024-01-01T18:30:00Z"
  },
  "uploadedAt": "2024-01-01T19:00:00Z"
}
```

### GET /api/read/leaderboard
Haal ranglijst op.

**Query Parameters:**
```
period=week  # all, day, week, month
category=nature  # optional
type=photos  # photos or users
limit=50
```

**Response (photos):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "photoId": "photo_id",
      "title": "Amazing sunset",
      "thumbnailUrl": "https://...",
      "userId": "user_id",
      "username": "photomaster",
      "score": 156,
      "uploadedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "period": "week",
  "category": "nature",
  "total": 1000
}
```

**Response (users):**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_id",
      "username": "photomaster",
      "avatarUrl": "https://...",
      "points": 5420,
      "level": 25,
      "totalPhotos": 150,
      "totalVotes": 3250
    }
  ],
  "period": "week",
  "total": 500
}
```

### GET /api/read/stats
Haal platform statistieken op.

**Response:**
```json
{
  "platform": {
    "totalUsers": 10542,
    "totalPhotos": 45230,
    "totalVotes": 234567,
    "activeUsers24h": 542,
    "uploadsToday": 123,
    "votesToday": 4567
  },
  "trending": {
    "topCategory": "nature",
    "hotTags": ["sunset", "portrait", "architecture"],
    "topPhotographer": {
      "username": "photomaster",
      "photoCount": 250
    }
  }
}
```

### GET /api/read/user/{userId}
Haal gebruikersprofiel met statistieken op.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "username": "photomaster",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Photography enthusiast",
    "avatarUrl": "https://...",
    "level": 12,
    "points": 1250,
    "rank": 42,
    "joinedAt": "2023-01-01T00:00:00Z"
  },
  "stats": {
    "totalPhotos": 25,
    "totalVotesReceived": 356,
    "totalVotesGiven": 892,
    "averageScore": 14.2,
    "topPhoto": {
      "id": "photo_id",
      "title": "Best photo",
      "thumbnailUrl": "https://...",
      "score": 89
    }
  },
  "badges": [
    {
      "id": "first_photo",
      "name": "First Upload",
      "icon": "https://...",
      "earnedAt": "2023-01-01T12:00:00Z"
    }
  ],
  "recentPhotos": [ /* last 5 photos */ ]
}
```

### GET /api/read/search
Zoek foto's via full-text search.

**Query Parameters:**
```
q=sunset beach
limit=20
page=1
```

**Response:**
```json
{
  "results": [
    {
      "id": "photo_id",
      "title": "Sunset at the beach",
      "thumbnailUrl": "https://...",
      "score": 42,
      "relevance": 0.95
    }
  ],
  "query": "sunset beach",
  "total": 150,
  "page": 1
}
```

### GET /api/read/feed
Haal activity feed op (voor logged-in users).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
```
limit=50
before=timestamp  # for pagination
```

**Response:**
```json
{
  "activities": [
    {
      "id": "activity_id",
      "type": "new_vote",
      "userId": "other_user_id",
      "username": "voter123",
      "photoId": "photo_id",
      "photoTitle": "Sunset",
      "timestamp": "2024-01-01T12:00:00Z"
    },
    {
      "id": "activity_id_2",
      "type": "badge_earned",
      "badgeName": "Popular",
      "badgeIcon": "https://...",
      "timestamp": "2024-01-01T11:00:00Z"
    }
  ],
  "hasMore": true
}
```

### GET /api/read/trending
Haal trending content op.

**Query Parameters:**
```
type=photos  # photos, tags, users
period=24h  # 1h, 6h, 24h, 7d
limit=20
```

**Response:**
```json
{
  "trending": [
    {
      "photoId": "photo_id",
      "title": "Trending photo",
      "thumbnailUrl": "https://...",
      "trendingScore": 8.5,
      "recentVotes": 15
    }
  ],
  "period": "24h"
}
```

## Database Access

### Read Replicas
- Primary DB: write operations (handled by other services)
- Read replicas: all read operations from this service
- Reduces load on primary database
- Near real-time replication

### Denormalized Data
Read service gebruikt denormalized tables voor snellere queries:
- photo_view (joined photo + user + score data)
- user_stats (aggregated statistics)
- leaderboard_cache (pre-calculated rankings)

## Caching Strategy

### Redis Cache Layers

#### L1: Short TTL (1-5 minutes)
- Individual photo details
- User profiles
- Search results

#### L2: Medium TTL (15-60 minutes)
- Leaderboards
- Statistics
- Trending content

#### L3: Long TTL (1-24 hours)
- Static content
- Historical data
- Aggregated stats

### Cache Keys
```
photo:{id}                    # Single photo
photos:list:{page}:{filters}  # Photo list
leaderboard:{period}:{type}   # Leaderboard
user:{id}:profile             # User profile
stats:platform                # Platform stats
trending:{period}             # Trending content
```

### Cache Invalidation
- Time-based (TTL)
- Event-based (via message queue from write services)
- Manual (admin tool)

## Omgevingsvariabelen

```env
# Database (Read Replica)
DATABASE_READ_URL=postgresql://user:pass@read-replica:5432/photoprestiges

# Service Configuration
PORT=3007
NODE_ENV=development

# Redis Cache
REDIS_URL=redis://localhost:6379
CACHE_DEFAULT_TTL=300  # 5 minutes

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Search
ENABLE_FULL_TEXT_SEARCH=true

# External Services
AUTH_SERVICE_URL=http://localhost:3001
```

## Query Optimisaties

### Database Indexes
```sql
-- Photos
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_uploaded_at ON photos(uploaded_at DESC);
CREATE INDEX idx_photos_status ON photos(status);

-- Scores
CREATE INDEX idx_photo_scores_score ON photo_scores(score DESC);
CREATE INDEX idx_photo_scores_trending ON photo_scores(trending_score DESC);

-- Tags
CREATE INDEX idx_photo_tags_tag ON photo_tags(tag);

-- Full-text search
CREATE INDEX idx_photos_fulltext ON photos USING GIN(to_tsvector('english', title || ' ' || description));
```

### Query Examples

#### Top Photos
```sql
SELECT p.*, u.username, ps.score
FROM photos p
JOIN users u ON p.user_id = u.id
JOIN photo_scores ps ON p.id = ps.photo_id
WHERE p.status = 'active'
ORDER BY ps.score DESC
LIMIT 20 OFFSET 0;
```

#### Trending Photos
```sql
SELECT p.*, u.username, ps.trending_score
FROM photos p
JOIN users u ON p.user_id = u.id
JOIN photo_scores ps ON p.id = ps.photo_id
WHERE p.status = 'active'
  AND p.uploaded_at > NOW() - INTERVAL '7 days'
ORDER BY ps.trending_score DESC
LIMIT 20;
```

## Performance Monitoring

### Metrics
- Query response time
- Cache hit ratio
- Database query time
- API endpoint latency
- Throughput (requests/second)

### Slow Query Logging
- Log queries > 1 second
- Analyze and optimize
- Add missing indexes

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "dotenv": "^16.0.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance
```

## API Response Format

### Success Response
```json
{
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2024-01-01T12:00:00Z",
    "cached": false,
    "executionTime": 45
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Photo not found",
    "statusCode": 404
  }
}
```

## Pagination

### Cursor-based (recommended for feeds)
```
GET /api/read/feed?limit=50&before=2024-01-01T12:00:00Z
```

### Offset-based (for leaderboards)
```
GET /api/read/photos?page=1&limit=20
```

## Rate Limiting

- Anonymous: 100 requests per minute
- Authenticated: 300 requests per minute
- Per IP: 200 requests per minute

## CORS Configuration

```javascript
{
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET'],
  allowedHeaders: ['Content-Type', 'Authorization']
}
```

## Best Practices

1. **Read-only:** Geen write operations in deze service
2. **Caching:** Agressieve caching voor vaak opgevraagde data
3. **Pagination:** Altijd paginering voor lists
4. **Filtering:** Efficiënte filters met database indexes
5. **Monitoring:** Real-time performance monitoring
6. **Fallback:** Cache-aside pattern bij DB failure

## Deployment

Service draait op poort 3007 en is toegankelijk via API Gateway.

### Horizontal Scaling
- Stateless design allows easy horizontal scaling
- Load balancer distributes traffic
- Shared Redis cache across instances
- Read replica connection pooling

## Future Enhancements

- GraphQL API (flexibility for clients)
- Elasticsearch voor advanced search
- Real-time updates via WebSockets
- Geo-based photo discovery
- AI-powered recommendations
