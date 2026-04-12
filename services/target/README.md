# Target Service

## Verantwoordelijkheid
De Target Service beheert foto uploads, opslag in de cloud, en integratie met externe image analysis APIs (Imagga/Google Cloud Vision).

## Functionaliteiten

### 1. Foto Upload
- Multi-part form upload handling
- Image validatie (type, size, dimensions)
- Upload naar cloud storage (S3/GCS/Azure Blob)
- Publieke URL generatie
- Thumbnail generatie

### 2. Image Analysis
- Integratie met Imagga API voor:
  - Tag detection
  - Color analysis
  - Categorization
- Integratie met Google Cloud Vision voor:
  - Object detection
  - Label detection
  - SafeSearch (content moderation)
  - Face detection

### 3. Metadata Beheer
- Photo metadata opslaan (titel, beschrijving, tags)
- EXIF data extractie
- GPS locatie (indien beschikbaar)
- Upload timestamp en gebruiker

### 4. Content Moderatie
- Automatische content filtering via SafeSearch
- Flagging van inappropriate content
- Admin review queue

## REST API Endpoints

### POST /api/target/upload
Upload nieuwe foto.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body (multipart):**
```
photo: <file>
title: "Sunset at the beach"
description: "Beautiful sunset photo"
tags: ["sunset", "beach", "nature"]
```

**Response:**
```json
{
  "success": true,
  "photo": {
    "id": "photo_id",
    "url": "https://storage.example.com/photos/photo_id.jpg",
    "thumbnailUrl": "https://storage.example.com/thumbnails/photo_id.jpg",
    "title": "Sunset at the beach",
    "description": "Beautiful sunset photo",
    "userId": "user_id",
    "analysis": {
      "tags": ["sunset", "beach", "ocean", "sky", "nature"],
      "colors": ["#FF6B35", "#F7931E", "#004E89"],
      "categories": ["nature", "landscapes"],
      "safeSearch": {
        "adult": "VERY_UNLIKELY",
        "violence": "UNLIKELY"
      }
    },
    "uploadedAt": "2024-01-01T12:00:00Z"
  }
}
```

### GET /api/target/{id}
Haal specifieke foto op.

**Response:**
```json
{
  "id": "photo_id",
  "url": "https://storage.example.com/photos/photo_id.jpg",
  "thumbnailUrl": "https://storage.example.com/thumbnails/photo_id.jpg",
  "title": "Sunset at the beach",
  "description": "Beautiful sunset photo",
  "userId": "user_id",
  "username": "photomaster",
  "tags": ["sunset", "beach", "ocean"],
  "uploadedAt": "2024-01-01T12:00:00Z",
  "views": 150,
  "score": 42
}
```

### DELETE /api/target/{id}
Verwijder foto (alleen eigen foto's of admin).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Photo deleted successfully"
}
```

### PUT /api/target/{id}
Werk foto metadata bij.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "tags": ["new", "tags"]
}
```

**Response:**
```json
{
  "success": true,
  "photo": { /* updated photo data */ }
}
```

### GET /api/target/user/{userId}
Haal alle foto's van een gebruiker op.

**Query Parameters:**
```
page=1
limit=20
```

**Response:**
```json
{
  "photos": [ /* array of photo objects */ ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Database Schema

### photos
- id (primary key, UUID)
- user_id (foreign key)
- title (string)
- description (text)
- url (string, unique)
- thumbnail_url (string)
- storage_key (string, unique)
- file_size (integer, bytes)
- width (integer, pixels)
- height (integer, pixels)
- format (enum: 'jpg', 'png', 'webp')
- status (enum: 'processing', 'active', 'flagged', 'deleted')
- views (integer, default: 0)
- uploaded_at (timestamp)
- deleted_at (timestamp, nullable)

### photo_tags
- photo_id (foreign key)
- tag (string, indexed)
- source (enum: 'user', 'imagga', 'google_vision')
- confidence (float, 0-1)

### photo_analysis
- photo_id (primary key, foreign key)
- imagga_tags (jsonb)
- imagga_colors (jsonb)
- google_labels (jsonb)
- google_safe_search (jsonb)
- analyzed_at (timestamp)

### photo_exif
- photo_id (primary key, foreign key)
- camera_make (string)
- camera_model (string)
- iso (integer)
- aperture (string)
- shutter_speed (string)
- focal_length (string)
- gps_latitude (float)
- gps_longitude (float)
- taken_at (timestamp)

## Omgevingsvariabelen

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/photoprestiges

# Service Configuration
PORT=3003
NODE_ENV=development

# Cloud Storage (AWS S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=eu-west-1
AWS_S3_BUCKET=photoprestiges-photos
CDN_URL=https://cdn.photoprestiges.com

# Image Analysis
IMAGGA_API_KEY=your_imagga_key
IMAGGA_API_SECRET=your_imagga_secret
GOOGLE_VISION_API_KEY=your_google_key

# Upload Limits
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FORMATS=jpg,jpeg,png,webp
MAX_WIDTH=4000
MAX_HEIGHT=4000

# External Services
AUTH_SERVICE_URL=http://localhost:3001
```

## Image Processing

### Upload Flow
1. Validate file (type, size, dimensions)
2. Generate unique filename (UUID)
3. Upload original to cloud storage
4. Generate thumbnail (300x300)
5. Upload thumbnail to cloud storage
6. Extract EXIF data
7. Call image analysis APIs (parallel)
8. Store metadata and analysis results
9. Return photo object with URLs

### Supported Formats
- JPEG/JPG
- PNG
- WebP

### Size Limits
- Maximum file size: 10MB
- Maximum dimensions: 4000x4000 pixels
- Minimum dimensions: 200x200 pixels

## Image Analysis APIs

### Imagga Integration
```javascript
// Tag detection
const imaggaTags = await imagga.getTags(imageUrl);

// Color analysis
const colors = await imagga.getColors(imageUrl);

// Categorization
const categories = await imagga.getCategories(imageUrl);
```

### Google Cloud Vision Integration
```javascript
// Label detection
const labels = await vision.labelDetection(imageUrl);

// SafeSearch detection
const safeSearch = await vision.safeSearchDetection(imageUrl);

// Object detection
const objects = await vision.objectLocalization(imageUrl);
```

## Security & Content Moderation

1. **File Validation:**
   - Check file type and MIME type
   - Verify file signature (magic bytes)
   - Scan for malware (optional)

2. **Content Moderation:**
   - Google Vision SafeSearch API
   - Auto-flag inappropriate content
   - Admin review queue
   - User reporting system

3. **Access Control:**
   - Users can only delete their own photos
   - Admins can delete any photo
   - Public read access to photos

## Afhankelijkheden

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "multer": "^1.4.5-lts.1",
    "aws-sdk": "^2.1400.0",
    "sharp": "^0.32.0",
    "exifr": "^7.1.3",
    "axios": "^1.4.0",
    "pg": "^8.11.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.0"
  }
}
```

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests (with mocked APIs)
npm run test:integration

# Upload tests
npm run test:upload
```

## Performance Optimisaties

- Asynchrone upload processing
- Parallel API calls (Imagga + Google Vision)
- CDN voor image delivery
- Thumbnail caching
- Database indexing op user_id, tags, upload_at

## Deployment

Service draait op poort 3003 en is toegankelijk via API Gateway.
