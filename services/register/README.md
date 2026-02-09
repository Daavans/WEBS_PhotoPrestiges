# Register Service

## Verantwoordelijkheid
De Register Service beheert gebruikersregistratie, email verificatie en profielbeheer binnen het Photo Prestiges platform.

## Functionaliteiten

### 1. Gebruikersregistratie
- Nieuwe gebruikers aanmaken
- Email uniekheid validatie
- Input validatie (email format, password strength)
- Wachtwoord hashing (via Auth Service)

### 2. Email Verificatie
- Verificatie token generatie
- Email versturen via Mail Service
- Token validatie bij activatie
- Account activatie

### 3. Profielbeheer
- Profiel informatie bijwerken (naam, bio, avatar)
- Account instellingen
- Privacy instellingen
- Account verwijderen (soft delete)

### 4. Gebruikersgegevens
- Profieldata opslaan en ophalen
- Avatar/profielfoto beheer
- Gebruikersstatistieken

## REST API Endpoints

### POST /api/register
Registreer nieuwe gebruiker.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "photomaster",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "user_id_here"
}
```

### GET /api/register/verify
Verifieer email address via token.

**Query Parameters:**
```
token=verification_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully. You can now login."
}
```

### GET /api/register/profile
Haal gebruikersprofiel op (authenticated).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "user_id",
  "email": "user@example.com",
  "username": "photomaster",
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Photography enthusiast",
  "avatarUrl": "https://storage.example.com/avatars/user_id.jpg",
  "verified": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "stats": {
    "totalPhotos": 42,
    "totalVotes": 156,
    "points": 1250
  }
}
```

### PUT /api/register/profile
Werk gebruikersprofiel bij (authenticated).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "bio": "Professional photographer",
  "avatarUrl": "https://storage.example.com/avatars/new_avatar.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": { /* updated profile data */ }
}
```

### DELETE /api/register/profile
Verwijder gebruikersaccount (soft delete).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

## Database Schema

### users
- id (primary key, UUID)
- email (unique, indexed)
- username (unique, indexed)
- password_hash
- first_name
- last_name
- bio (text)
- avatar_url
- verified (boolean, default: false)
- role (enum: 'user', 'admin', default: 'user')
- deleted_at (timestamp, nullable)
- created_at (timestamp)
- updated_at (timestamp)

### email_verifications
- id (primary key)
- user_id (foreign key)
- token (unique)
- expires_at (timestamp)
- created_at (timestamp)

### user_stats (denormalized for performance)
- user_id (primary key, foreign key)
- total_photos (integer, default: 0)
- total_votes_received (integer, default: 0)
- total_votes_given (integer, default: 0)
- points (integer, default: 0)
- level (integer, default: 1)
- updated_at (timestamp)

## Omgevingsvariabelen

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Service Configuration
PORT=3002
NODE_ENV=development

# Email Verification
VERIFICATION_TOKEN_EXPIRY=24h
FRONTEND_URL=https://photoprestiges.com

# External Services
MAIL_SERVICE_URL=http://localhost:3005
AUTH_SERVICE_URL=http://localhost:3001
```

## Validatie Regels

### Email
- Valid email format
- Unique in database
- Maximum 255 characters

### Password
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Username
- 3-30 characters
- Alphanumeric + underscore only
- Unique in database

### Bio
- Maximum 500 characters

## Interacties met andere services

### Mail Service
- Verstuur welkomst email na registratie
- Verstuur verificatie email
- Verstuur wachtwoord reset emails

### Auth Service
- Hash wachtwoorden
- Valideer tokens voor protected endpoints

### Read Service
- Voorziet profieldata voor read-only queries

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.11.0",
    "uuid": "^9.0.0",
    "joi": "^17.9.0",
    "dotenv": "^16.0.0",
    "axios": "^1.4.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Validation tests
npm run test:validation
```

## Error Handling

Common error responses:
- 400: Invalid input data
- 409: Email/username already exists
- 404: User not found
- 401: Unauthorized (invalid/expired token)
- 500: Internal server error

## Deployment

Service draait op poort 3002 en is toegankelijk via API Gateway.
