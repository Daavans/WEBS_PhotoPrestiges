# API Specification - Photo Prestiges

## Overzicht

Dit document beschrijft alle REST API endpoints van het Photo Prestiges platform. Alle endpoints gebruiken JSON voor request en response bodies.

## Base URLs

```
Development: http://localhost:3000/api
Production:  https://api.photoprestiges.com/api
```

## Authenticatie

De meeste endpoints vereisen authenticatie via JWT tokens.

### Request Header
```
Authorization: Bearer <jwt_token>
```

### Token Verkrijgen
```http
POST /api/auth/login
```

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { /* response data */ }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* optional additional info */ }
  }
}
```

## HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Rate Limiting

- Anonymous: 100 requests per minute
- Authenticated: 300 requests per minute
- Per IP: 200 requests per minute

Response headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1640995200
```

---

# Auth Service API

Base URL: `/api/auth`

## POST /login
Authenticate user en verkrijg JWT token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_string",
    "expiresIn": 86400,
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "username": "photomaster",
      "role": "user"
    }
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `400` - Missing email or password

## POST /logout
Invalideer huidige sessie.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## POST /refresh
Vernieuw JWT token.

**Request:**
```json
{
  "refreshToken": "refresh_token_string"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expiresIn": 86400
  }
}
```

## GET /validate
Valideer JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "valid": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

# Register Service API

Base URL: `/api/register`

## POST /register
Registreer nieuwe gebruiker.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "securePass123!",
  "username": "newphotomaster",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "userId": "new_user_id",
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Errors:**
- `409` - Email or username already exists
- `422` - Validation failed

## GET /verify
Verifieer email address.

**Query Parameters:**
- `token` (required) - Verification token from email

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login."
}
```

**Errors:**
- `400` - Invalid or expired token

## GET /profile
Haal eigen profiel op.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "photomaster",
    "firstName": "John",
    "lastName": "Doe",
    "bio": "Photography enthusiast",
    "avatarUrl": "https://storage.example.com/avatars/user_id.jpg",
    "verified": true,
    "level": 12,
    "points": 1250,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

## PUT /profile
Update eigen profiel.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "bio": "Professional photographer",
  "avatarUrl": "https://storage.example.com/avatars/new_avatar.jpg"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "firstName": "Jane",
    "lastName": "Smith",
    "bio": "Professional photographer",
    "avatarUrl": "https://storage.example.com/avatars/new_avatar.jpg"
  }
}
```

---

# Target Service API

Base URL: `/api/target`

## POST /upload
Upload nieuwe foto.

**Headers:** 
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart):**
- `photo` (file, required) - Image file
- `title` (string, optional) - Photo title
- `description` (string, optional) - Photo description
- `tags` (array, optional) - Tags as JSON array

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "photo_id",
    "url": "https://storage.example.com/photos/photo_id.jpg",
    "thumbnailUrl": "https://storage.example.com/thumbnails/photo_id.jpg",
    "title": "Sunset at the beach",
    "description": "Beautiful sunset photo",
    "userId": "user_id",
    "analysis": {
      "tags": ["sunset", "beach", "ocean", "sky"],
      "colors": ["#FF6B35", "#F7931E", "#004E89"],
      "categories": ["nature", "landscapes"]
    },
    "uploadedAt": "2024-01-01T12:00:00Z"
  }
}
```

**Errors:**
- `400` - Invalid file type or size
- `413` - File too large
- `422` - Validation failed

## GET /{id}
Haal specifieke foto op.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "photo_id",
    "url": "https://storage.example.com/photos/photo_id.jpg",
    "thumbnailUrl": "https://storage.example.com/thumbnails/photo_id.jpg",
    "title": "Sunset at the beach",
    "description": "Beautiful sunset photo",
    "userId": "user_id",
    "username": "photomaster",
    "tags": ["sunset", "beach", "ocean"],
    "uploadedAt": "2024-01-01T12:00:00Z"
  }
}
```

## DELETE /{id}
Verwijder foto (alleen eigen foto's).

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

**Errors:**
- `403` - Not authorized to delete this photo
- `404` - Photo not found

## PUT /{id}
Update foto metadata.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "tags": ["new", "tags"]
}
```

**Response:** `200 OK`

## GET /user/{userId}
Haal foto's van gebruiker op.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "photos": [ /* array of photo objects */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

---

# Score Service API

Base URL: `/api/score`

## POST /vote
Stem op foto.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "photoId": "photo_id"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "voteId": "vote_id",
    "photoId": "photo_id",
    "userId": "user_id",
    "votedAt": "2024-01-01T12:00:00Z",
    "newScore": 43,
    "pointsEarned": 1
  }
}
```

**Errors:**
- `409` - Already voted on this photo
- `400` - Cannot vote on own photo

## DELETE /vote/{photoId}
Trek vote in.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Vote removed successfully",
  "newScore": 42
}
```

## GET /photo/{photoId}
Haal score van foto op.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "photoId": "photo_id",
    "totalVotes": 42,
    "score": 42,
    "rank": 15,
    "trending": true
  }
}
```

## GET /leaderboard
Haal leaderboard op.

**Query Parameters:**
- `period` (default: all) - all, day, week, month
- `category` (optional) - Filter by category
- `limit` (default: 50, max: 100)
- `offset` (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "photoId": "photo_id",
        "title": "Amazing sunset",
        "thumbnailUrl": "https://...",
        "userId": "user_id",
        "username": "photomaster",
        "score": 156
      }
    ],
    "period": "week",
    "total": 1000
  }
}
```

## GET /user/{userId}
Haal gebruiker score statistieken op.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "points": 1250,
    "level": 12,
    "xp": 450,
    "rank": 42,
    "badges": [
      {
        "id": "first_photo",
        "name": "First Upload",
        "earnedAt": "2024-01-01T12:00:00Z"
      }
    ],
    "currentStreak": 7
  }
}
```

---

# Read Service API

Base URL: `/api/read`

## GET /photos
Haal foto's op (gepagineerd).

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 20, max: 100)
- `sort` (default: new) - new, popular, trending
- `category` (optional)
- `tag` (optional)
- `userId` (optional)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "photos": [
      {
        "id": "photo_id",
        "title": "Sunset at the beach",
        "thumbnailUrl": "https://...",
        "userId": "user_id",
        "username": "photomaster",
        "score": 42,
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
}
```

## GET /photo/{id}
Haal foto details op.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "photo_id",
    "title": "Sunset at the beach",
    "url": "https://...",
    "user": {
      "id": "user_id",
      "username": "photomaster",
      "avatarUrl": "https://..."
    },
    "stats": {
      "score": 42,
      "views": 350,
      "rank": 15
    },
    "tags": ["sunset", "beach"],
    "uploadedAt": "2024-01-01T12:00:00Z"
  }
}
```

## GET /stats
Haal platform statistieken op.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "totalUsers": 10542,
    "totalPhotos": 45230,
    "totalVotes": 234567,
    "activeUsers24h": 542,
    "uploadsToday": 123
  }
}
```

## GET /search
Zoek foto's.

**Query Parameters:**
- `q` (required) - Search query
- `limit` (default: 20)
- `page` (default: 1)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "results": [ /* photo objects */ ],
    "query": "sunset beach",
    "total": 150
  }
}
```

---

# Mail Service API

Base URL: `/api/mail` (Internal only)

## POST /send
Verstuur email (internal API).

**Request:**
```json
{
  "to": "user@example.com",
  "template": "welcome",
  "data": {
    "username": "photomaster",
    "verificationUrl": "https://..."
  }
}
```

**Response:** `200 OK`

## POST /subscribe
Inschrijven voor notificaties.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "types": ["votes", "badges", "weekly_summary"]
}
```

**Response:** `200 OK`

---

# Clock Service API

Base URL: `/api/clock` (Admin only)

## GET /jobs
Lijst alle scheduled jobs.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`

## POST /trigger/{jobId}
Trigger job handmatig.

**Headers:** `Authorization: Bearer <admin_token>`

**Response:** `200 OK`

## GET /status
Health check.

**Response:** `200 OK`
```json
{
  "status": "healthy",
  "uptime": 86400,
  "activeJobs": 12
}
```

---

## Webhooks

### Event Types
- `photo.uploaded` - New photo uploaded
- `photo.voted` - Photo received a vote
- `user.registered` - New user registered
- `badge.earned` - User earned a badge

### Webhook Payload
```json
{
  "event": "photo.voted",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "photoId": "photo_id",
    "userId": "user_id",
    "score": 43
  }
}
```

## SDK Examples

### JavaScript
```javascript
const PhotoPrestiges = require('photoprestiges-sdk');

const client = new PhotoPrestiges({
  apiKey: 'your_api_key',
  baseUrl: 'https://api.photoprestiges.com'
});

// Upload photo
const photo = await client.photos.upload({
  file: photoFile,
  title: 'Sunset',
  tags: ['sunset', 'beach']
});

// Vote on photo
await client.votes.create({ photoId: 'photo_id' });
```

### Python
```python
from photoprestiges import Client

client = Client(api_key='your_api_key')

# Upload photo
photo = client.photos.upload(
    file=photo_file,
    title='Sunset',
    tags=['sunset', 'beach']
)

# Vote on photo
client.votes.create(photo_id='photo_id')
```

## Testing

### Postman Collection
Import the Postman collection from `/docs/postman_collection.json`

### API Testing
```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get photos
curl http://localhost:3007/api/read/photos?limit=10
```

## Versionering

API versie wordt aangegeven in URL:
- v1: `/api/v1/...` (huidige versie)
- v2: `/api/v2/...` (toekomstige versie)

## Support

Voor vragen over de API:
- GitHub Issues: https://github.com/Daavans/WEBS_PhotoPrestiges/issues
- Email: support@photoprestiges.com
