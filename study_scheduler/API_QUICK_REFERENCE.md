# StudyVerse API Quick Reference

## Base URL
```
Development: http://localhost:5000
Production: https://your-production-url.com
```

## Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## Authentication Endpoints (`/api/auth`)

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "John Doe"
}

Response: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "userId",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: {
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "userId",
    "email": "user@example.com",
    "displayName": "John Doe"
  }
}
```

### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <token>

Response: {
  "_id": "userId",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoUrl": "...",
  "preferences": { ... }
}
```

### Forgot Password
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}

Response: {
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### Reset Password
```http
POST /api/auth/reset-password/:token
Content-Type: application/json

{
  "newPassword": "newPassword123"
}

Response: {
  "message": "Password reset successful. You can now log in with your new password."
}
```

---

## Study Sessions Endpoints (`/api/study-sessions`)

### Get All Sessions
```http
GET /api/study-sessions
Authorization: Bearer <token>

Response: [
  {
    "_id": "sessionId",
    "subject": "Mathematics",
    "startTime": "2025-01-27T09:00:00.000Z",
    "endTime": "2025-01-27T10:00:00.000Z",
    "description": "Study Chapter 1",
    "status": "scheduled",
    "progress": 0,
    "isAIGenerated": true,
    "documents": [...]
  },
  ...
]
```

### Get Single Session
```http
GET /api/study-sessions/:sessionId
Authorization: Bearer <token>

Response: {
  "_id": "sessionId",
  "subject": "Mathematics",
  "startTime": "...",
  "endTime": "...",
  "status": "scheduled",
  "progress": 0,
  "documents": [...]
}
```

### Create Session
```http
POST /api/study-sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "Mathematics",
  "startTime": "2025-01-27T09:00:00.000Z",
  "endTime": "2025-01-27T10:00:00.000Z",
  "description": "Study Chapter 1",
  "documentId": "noteId", // optional
  "isAIGenerated": false // optional
}

Response: {
  "_id": "sessionId",
  "subject": "Mathematics",
  "startTime": "...",
  "endTime": "...",
  "status": "scheduled",
  "progress": 0
}
```

### Update Session
```http
PUT /api/study-sessions/:sessionId
Authorization: Bearer <token>
Content-Type: application/json

{
  "progress": 100, // Update progress
  "status": "completed" // Update status
  // Or update other fields: subject, startTime, endTime, description
}

Response: {
  "_id": "sessionId",
  "subject": "Mathematics",
  "progress": 100,
  "status": "completed",
  ...
}
```

### Delete Session
```http
DELETE /api/study-sessions/:sessionId
Authorization: Bearer <token>

Response: {
  "message": "Session deleted successfully"
}
```

### Delete All Sessions for Subject
```http
DELETE /api/study-sessions/subject/:subject
Authorization: Bearer <token>

Response: {
  "message": "Successfully deleted 5 sessions for subject \"Mathematics\"",
  "deletedCount": 5
}
```

---

## Notes Endpoints (`/api/notes`)

### Upload Document
```http
POST /api/notes/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

FormData:
  file: <File>
  subject: "Mathematics"
  title: "Chapter 1 Notes"

Response: {
  "message": "Upload successful",
  "publicUrl": "https://xxx.supabase.co/storage/...",
  "filePath": "1234567890-uuid_filename.pdf",
  "noteId": "noteId"
}
```

### Get All Notes
```http
GET /api/notes
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": [
    {
      "_id": "noteId",
      "subject": "Mathematics",
      "title": "Chapter 1 Notes",
      "fileName": "chapter1.pdf",
      "fileUrl": "https://...",
      "publicUrl": "https://...",
      "uploadDate": "2025-01-27T10:00:00.000Z"
    },
    ...
  ]
}
```

### Get Unique Subjects
```http
GET /api/notes/subjects
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": [
    {
      "id": "mathematics",
      "name": "Mathematics",
      "documentsCount": 5
    },
    ...
  ]
}
```

### Get Note by ID
```http
GET /api/notes/:id
Authorization: Bearer <token>

Response: {
  "_id": "noteId",
  "subject": "Mathematics",
  "title": "Chapter 1 Notes",
  "fileUrl": "https://...",
  "publicUrl": "https://...",
  ...
}
```

### Get Notes by Subject
```http
GET /api/notes/by-subject/:subject
Authorization: Bearer <token>

Response: {
  "success": true,
  "data": [
    {
      "_id": "noteId",
      "subject": "Mathematics",
      "title": "Chapter 1 Notes",
      ...
    },
    ...
  ]
}
```

### View PDF (with token in query)
```http
GET /api/notes/view-pdf/:id?token=<JWT_TOKEN>

Response: Redirect to Supabase public URL
```

### Download Document
```http
GET /api/notes/download/:id?token=<JWT_TOKEN>&download=true

Response: File download with Content-Disposition: attachment
```

### Delete Note
```http
DELETE /api/notes/:id
Authorization: Bearer <token>

Response: {
  "message": "Note deleted successfully"
}
```

### Delete All Notes for Subject
```http
DELETE /api/notes/subject/:subject
Authorization: Bearer <token>

Response: {
  "message": "Successfully deleted 5 notes for subject \"Mathematics\"",
  "deletedCount": 5
}
```

---

## AI Endpoints (`/api/groq`)

### Generate Summary
```http
POST /api/groq/summary
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Full PDF text content (max 8000 words)..."
}

Response: {
  "choices": [{
    "message": {
      "content": "Summary of the academic content..."
    }
  }]
}
```

### Generate Quiz
```http
POST /api/groq/quiz
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "PDF text content (max 6000 words)..."
}

Response: {
  "choices": [{
    "message": {
      "content": "[{\"question\":\"...\",\"options\":[...],\"answer\":\"...\"}, ...]"
    }
  }]
}
```

### AI Chat
```http
POST /api/groq/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    { "role": "system", "content": "You are a helpful study assistant." },
    { "role": "user", "content": "What is photosynthesis?" }
  ]
}

Response: {
  "choices": [{
    "message": {
      "content": "Chat response from AI..."
    }
  }]
}
```

### Generate Study Plan
```http
POST /api/groq/studyplan
Authorization: Bearer <token>
Content-Type: application/json

{
  "subjects": ["Mathematics", "Physics", "Chemistry"],
  "subjectSessions": {
    "Mathematics": 3,
    "Physics": 2,
    "Chemistry": 2
  },
  "weeks": 2,
  "preference": "evening",
  "sessionLength": 60,
  "breakLength": 15,
  "preferredDays": ["Monday", "Wednesday", "Friday"],
  "optionalNotes": "Focus on exam preparation"
}

Response: {
  "success": true,
  "plan": {
    "weeks": [
      {
        "weekNumber": 1,
        "sessions": [
          {
            "subject": "Mathematics",
            "startTime": "2025-01-27T17:00:00.000Z",
            "endTime": "2025-01-27T18:00:00.000Z",
            "learningStyle": "balanced"
          },
          ...
        ]
      },
      ...
    ]
  },
  "message": "Study plan generated successfully"
}
```

**Study Plan Constraints:**
- `subjects`: Array of 1-6 subjects
- `weeks`: Number between 1-4
- `preference`: "morning" | "afternoon" | "evening" | "night" | "flexible"
- `sessionLength`: Minutes (typically 30-120)
- `breakLength`: Minutes (typically 5-30)
- `preferredDays`: Array of day names (e.g., ["Monday", "Wednesday"])

---

## Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid token |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server errors |
| 503 | Service Unavailable | Database connection issues |

---

## Common Error Responses

### Validation Error
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "subjects",
      "message": "Must provide 1-6 subjects"
    }
  ]
}
```

### Authentication Error
```json
{
  "message": "No token provided"
}
// or
{
  "message": "Invalid token"
}
```

### Not Found Error
```json
{
  "error": "Note not found"
}
```

### Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Error details..."
}
```

---

## Request/Response Examples

### Complete Flow: Create Study Plan

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123'
  })
});
const { token } = await loginResponse.json();

// 2. Generate Study Plan
const planResponse = await fetch('http://localhost:5000/api/groq/studyplan', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subjects: ['Mathematics', 'Physics'],
    subjectSessions: { Mathematics: 3, Physics: 2 },
    weeks: 2,
    preference: 'evening',
    sessionLength: 60,
    breakLength: 15,
    preferredDays: ['Monday', 'Wednesday', 'Friday']
  })
});
const plan = await planResponse.json();

// 3. Get Sessions
const sessionsResponse = await fetch('http://localhost:5000/api/study-sessions', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const sessions = await sessionsResponse.json();
```

### File Upload Example

```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('subject', 'Mathematics');
formData.append('title', 'Chapter 1 Notes');

const response = await fetch('http://localhost:5000/api/notes/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type, browser sets it with boundary
  },
  body: formData
});
const result = await response.json();
```

---

## Notes

1. **JWT Token**: Valid for 24 hours by default
2. **File Upload**: Supports PDF, DOC, PPT, images, etc. (handled by multer)
3. **Rate Limiting**: Not currently implemented (should be added)
4. **CORS**: Configured for specific origins (development + mobile)
5. **Pagination**: Not implemented for list endpoints (should be added)
6. **Response Format**: Currently inconsistent (refactoring recommended)

---

## Testing with cURL

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

### Get Sessions
```bash
curl http://localhost:5000/api/study-sessions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Generate Study Plan
```bash
curl -X POST http://localhost:5000/api/groq/studyplan \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "subjects": ["Mathematics"],
    "subjectSessions": {"Mathematics": 3},
    "weeks": 1,
    "preference": "evening",
    "sessionLength": 60
  }'
```



