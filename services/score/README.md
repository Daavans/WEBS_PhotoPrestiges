# Score Service

## Verantwoordelijkheid
De Score Service beheert het stemmen op foto's, score berekeningen, ranglijsten en gamification elementen binnen het Photo Prestiges platform.

## Functionaliteiten

### 1. Voting System
- Vote registratie op foto's
- Vote validatie (1 vote per gebruiker per foto)
- Vote intrekken/wijzigen
- Real-time score updates

### 2. Score Berekening
- Basis score: aantal votes
- Gewogen score: tijd-gerelateerde decay
- Trending algorithm
- Wilson score confidence interval (optional)

### 3. Leaderboards
- Top foto's (overall, week, maand)
- Top gebruikers (meeste punten)
- Trending foto's
- Category-specific rankings

### 4. Gamification
- Punten systeem
- Levels en XP
- Badges en achievements
- Streaks (dagelijkse activiteit)
- Rewards bij milestones

## REST API Endpoints

### POST /api/score/vote
Stem op een foto.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "photoId": "photo_id",
  "value": 1
}
```

**Response:**
```json
{
  "success": true,
  "vote": {
    "id": "vote_id",
    "photoId": "photo_id",
    "userId": "user_id",
    "value": 1,
    "votedAt": "2024-01-01T12:00:00Z"
  },
  "newScore": 43,
  "userPoints": 1255
}
```

### DELETE /api/score/vote/{photoId}
Trek vote in.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Vote removed successfully",
  "newScore": 42
}
```

### GET /api/score/photo/{photoId}
Haal score van foto op.

**Response:**
```json
{
  "photoId": "photo_id",
  "totalVotes": 42,
  "score": 42,
  "rank": 15,
  "trending": true,
  "userVoted": true
}
```

### GET /api/score/leaderboard
Haal top foto's op.

**Query Parameters:**
```
period=week  # all, day, week, month
category=nature  # optional
limit=50
offset=0
```

**Response:**
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
      "totalVotes": 156,
      "uploadedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "period": "week",
  "total": 1000
}
```

### GET /api/score/user/{userId}
Haal gebruiker statistieken op.

**Response:**
```json
{
  "userId": "user_id",
  "points": 1250,
  "level": 12,
  "xp": 450,
  "xpToNextLevel": 550,
  "rank": 42,
  "stats": {
    "totalPhotos": 25,
    "totalVotesReceived": 356,
    "totalVotesGiven": 892,
    "averageScore": 14.2
  },
  "badges": [
    {
      "id": "first_photo",
      "name": "First Upload",
      "description": "Uploaded your first photo",
      "earnedAt": "2024-01-01T12:00:00Z"
    }
  ],
  "currentStreak": 7
}
```

### GET /api/score/trending
Haal trending foto's op.

**Query Parameters:**
```
limit=20
period=24h  # 1h, 6h, 24h, 7d
```

**Response:**
```json
{
  "trending": [
    {
      "photoId": "photo_id",
      "title": "Trending photo",
      "score": 45,
      "velocityScore": 8.5,
      "votesInPeriod": 15
    }
  ]
}
```

## Database Schema

### votes
- id (primary key, UUID)
- photo_id (foreign key, indexed)
- user_id (foreign key, indexed)
- value (integer, default: 1)
- voted_at (timestamp)
- UNIQUE(photo_id, user_id)

### photo_scores (denormalized)
- photo_id (primary key, foreign key)
- total_votes (integer, default: 0)
- score (float)
- rank (integer, nullable)
- trending_score (float, nullable)
- last_voted_at (timestamp)
- updated_at (timestamp)

### user_points
- user_id (primary key, foreign key)
- points (integer, default: 0)
- level (integer, default: 1)
- xp (integer, default: 0)
- rank (integer, nullable)
- updated_at (timestamp)

### badges
- id (primary key)
- code (string, unique)
- name (string)
- description (text)
- icon_url (string)
- points_reward (integer)

### user_badges
- user_id (foreign key)
- badge_id (foreign key)
- earned_at (timestamp)
- PRIMARY KEY (user_id, badge_id)

### streaks
- user_id (primary key, foreign key)
- current_streak (integer, default: 0)
- longest_streak (integer, default: 0)
- last_activity_date (date)

## Omgevingsvariabelen

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Service Configuration
PORT=3004
NODE_ENV=development

# Redis (for caching and real-time updates)
REDIS_URL=redis://localhost:6379

# Scoring Algorithm
TRENDING_DECAY_HOURS=24
VOTE_COOLDOWN_SECONDS=3

# Gamification
POINTS_PER_UPLOAD=10
POINTS_PER_VOTE_RECEIVED=1
POINTS_PER_VOTE_GIVEN=0.5
XP_PER_LEVEL=1000

# External Services
AUTH_SERVICE_URL=http://localhost:3001
TARGET_SERVICE_URL=http://localhost:3003
MAIL_SERVICE_URL=http://localhost:3005
```

## Scoring Algorithms

### Basic Score
```
score = total_votes
```

### Trending Score (Reddit-like)
```
hours = (now - upload_time) / 3600
order = log10(max(abs(total_votes), 1))
sign = 1 if total_votes > 0 else -1
trending_score = sign * order + hours / 45000
```

### Wilson Score (Confidence Interval)
```
For future implementation with up/down votes
```

## Gamification System

### Point Rewards
- Upload photo: +10 points
- Receive vote: +1 point
- Give vote: +0.5 points (encourage engagement)
- Daily login: +5 points
- 7-day streak: +50 points bonus

### Levels
- Level 1: 0-1000 XP
- Level 2: 1000-2200 XP
- Level N: exponential growth
- XP = Points / 10

### Badges
- **First Upload:** Upload your first photo
- **Social Butterfly:** Give 100 votes
- **Popular:** Receive 100 votes
- **Consistent:** 7-day streak
- **Veteran:** 30-day streak
- **Top 10:** Reach top 10 on leaderboard
- **Master:** Reach level 50

### Streaks
- Daily activity required (upload or vote)
- Streak breaks after 24 hours of inactivity
- Streak bonuses every 7 days

## Anti-Fraud Measures

1. **Vote Validation:**
   - One vote per user per photo
   - Vote cooldown (3 seconds between votes)
   - Rate limiting per user

2. **Suspicious Activity Detection:**
   - Multiple votes from same IP in short time
   - Vote circles (users voting for each other)
   - Bot detection

3. **Admin Tools:**
   - Reset suspicious votes
   - Ban users
   - Manual score adjustments

## Caching Strategy

### Redis Cache
- Leaderboards (TTL: 5 minutes)
- Trending scores (TTL: 1 minute)
- User ranks (TTL: 10 minutes)
- Badge progress (TTL: 1 hour)

### Cache Invalidation
- On new vote: invalidate photo score, user points, leaderboards
- On badge earned: invalidate user badges
- On streak update: invalidate user streaks

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "redis": "^4.6.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.0",
    "axios": "^1.4.0",
    "node-cron": "^3.0.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Load tests (voting simulation)
npm run test:load
```

## Performance Optimisaties

- Redis caching voor leaderboards
- Denormalized photo_scores table
- Batch updates voor scores
- Asynchrone badge checking
- Database indexing op photo_id, user_id, voted_at

## Deployment

Service draait op poort 3004 en is toegankelijk via API Gateway.

## Monitoring

- Vote rate per minute
- Average response time
- Cache hit ratio
- Top voted photos
- Suspicious activity alerts
