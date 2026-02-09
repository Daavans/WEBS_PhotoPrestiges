# Auth Service

## Verantwoordelijkheid
De Auth Service is verantwoordelijk voor authenticatie en autorisatie van gebruikers binnen het Photo Prestiges platform.

## Functionaliteiten

### 1. Authenticatie
- **Login:** Verificatie van gebruikerscredentials (email/username + wachtwoord)
- **Logout:** Invalideren van actieve sessies en tokens
- **Token Management:** Genereren en valideren van JWT tokens

### 2. Wachtwoord Beveiliging
- Bcrypt/Argon2 hashing voor wachtwoorden
- Salt generation
- Password strength validatie

### 3. Session Management
- JWT token generatie met claims (user_id, roles, permissions)
- Token refresh mechanisme
- Token expiry handling
- Blacklist voor geïnvalideerde tokens

### 4. Autorisatie
- Role-Based Access Control (RBAC)
- Permission checks
- Middleware voor route protection

## REST API Endpoints

### POST /api/auth/login
Authenticate user en retourneer JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 86400,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

### POST /api/auth/logout
Invalideer huidige sessie.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### POST /api/auth/refresh
Vernieuw JWT token met refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "token": "new_jwt_token",
  "expiresIn": 86400
}
```

### GET /api/auth/validate
Valideer JWT token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
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

## Database Schema

### users (gedeeld met Register Service)
- id (primary key)
- email (unique)
- password_hash
- role (user/admin)
- created_at
- updated_at

### sessions
- id (primary key)
- user_id (foreign key)
- token_hash
- refresh_token_hash
- expires_at
- created_at

### token_blacklist
- id (primary key)
- token_hash
- blacklisted_at
- expires_at

## Omgevingsvariabelen

```env
# JWT Configuration
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=24h
JWT_REFRESH_EXPIRY=7d

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Service Configuration
PORT=3001
NODE_ENV=development

# Security
BCRYPT_ROUNDS=10
```

## Security Overwegingen

1. **Token Security:**
   - Gebruik sterke secrets voor JWT signing
   - Implementeer token rotation
   - Korte expiry times voor access tokens
   - Langere expiry voor refresh tokens

2. **Password Security:**
   - Minimum wachtwoordlengte: 8 karakters
   - Vereiste: hoofdletters, kleine letters, cijfers, speciale tekens
   - Rate limiting op login endpoints
   - Account lockout na meerdere mislukte pogingen

3. **API Security:**
   - HTTPS only communicatie
   - CORS configuratie
   - Rate limiting
   - Input validatie

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "pg": "^8.11.0",
    "dotenv": "^16.0.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# Test coverage
npm run test:coverage
```

## Deployment

Service draait op poort 3001 en is toegankelijk via API Gateway of direct.

## Contact met andere services

- **Register Service:** Validatie van gebruikersgegevens bij registratie
- **Alle Services:** Token validatie voor protected endpoints
