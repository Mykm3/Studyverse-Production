# StudyVerse API Review & Refactoring Guide

## Table of Contents
1. [Understanding REST APIs](#understanding-rest-apis)
2. [StudyVerse API Structure](#studyverse-api-structure)
3. [Data Flow Architecture](#data-flow-architecture)
4. [Areas for Improvement](#areas-for-improvement)
5. [Refactoring Examples](#refactoring-examples)
6. [Best Practices Implementation](#best-practices-implementation)

---

## Understanding REST APIs

### What is a REST API?

**REST (Representational State Transfer)** is an architectural style for designing web services. A REST API follows these principles:

1. **Stateless**: Each request contains all information needed to process it
2. **Resource-Based**: URLs represent resources (nouns), not actions
3. **HTTP Methods**: Use standard HTTP verbs (GET, POST, PUT, DELETE, PATCH)
4. **Standard Status Codes**: Use appropriate HTTP status codes (200, 201, 400, 404, 500)
5. **JSON Format**: Data exchange in JSON format

### REST Endpoint Structure

```
METHOD /api/resource/:id?query=params
```

Examples:
- `GET /api/notes` - Retrieve all notes
- `GET /api/notes/:id` - Retrieve a specific note
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update entire note
- `PATCH /api/notes/:id` - Partial update
- `DELETE /api/notes/:id` - Delete note

---

## StudyVerse API Structure

### Current API Endpoints Summary

#### Authentication (`/api/auth`)
```
POST   /api/auth/register          - Register new user
POST   /api/auth/login             - Login with email/password
GET    /api/auth/google            - Initiate Google OAuth
GET    /api/auth/google/callback   - Google OAuth callback
POST   /api/auth/mobile/google     - Mobile Google auth
POST   /api/auth/mobile/development - Dev login
GET    /api/auth/profile           - Get user profile
GET    /api/auth/me                - Get current user
POST   /api/auth/forgot-password   - Request password reset
POST   /api/auth/reset-password/:token - Reset password
```

#### Study Sessions (`/api/study-sessions`)
```
GET    /api/study-sessions         - Get all sessions for user
GET    /api/study-sessions/:id     - Get specific session
POST   /api/study-sessions         - Create new session
PUT    /api/study-sessions/:id     - Update session
DELETE /api/study-sessions/:id     - Delete session
DELETE /api/study-sessions/subject/:subject - Delete all sessions for subject
```

#### Notes (`/api/notes`)
```
POST   /api/notes/upload           - Upload document
GET    /api/notes                  - Get all notes
GET    /api/notes/subjects         - Get unique subjects
GET    /api/notes/view              - Get note by title
GET    /api/notes/view/:id         - Get note by ID
GET    /api/notes/view-pdf/:id     - View PDF (with token in query)
GET    /api/notes/download/:id     - Download document
GET    /api/notes/direct-view/:id  - Direct view endpoint
GET    /api/notes/by-subject/:subject - Get notes by subject
DELETE /api/notes/:id              - Delete note
DELETE /api/notes/subject/:subject  - Delete all notes for subject
DELETE /api/notes/clear-all        - Clear all notes
```

#### AI Services (`/api/groq`)
```
POST   /api/groq/summary           - Generate summary from text
POST   /api/groq/quiz              - Generate quiz from text
POST   /api/groq/chat              - AI chat assistant
POST   /api/groq/studyplan         - Generate study schedule
```

#### Other Endpoints
```
GET    /api/gemini-studyplan       - Gemini study plan (alternative)
GET    /api/session-data           - Session data endpoints
GET    /api/shared-plans           - Shared study plans
GET    /api/diagnostics            - Server diagnostics
```

### REST Compliance Analysis

✅ **Follows REST:**
- Uses standard HTTP methods (GET, POST, PUT, DELETE)
- Resource-based URLs (`/notes`, `/sessions`)
- JSON request/response format
- Appropriate HTTP status codes

⚠️ **Partial Compliance:**
- Some endpoints use verbs in URLs (`/upload`, `/view`, `/download`)
- Mixed authentication approaches (headers vs query params)
- Some endpoints return different structures

❌ **Non-REST Patterns:**
- `/api/notes/view-pdf/:id?token=xyz` - Token in query string instead of header
- `/api/notes/upload` - Verb in URL, should be `POST /api/notes`
- `/api/groq/studyplan` - Action-based, should be resource-based

---

## Data Flow Architecture

### Complete Request Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  - User interacts with UI                                       │
│  - Makes HTTP requests to backend                               │
│  - Handles JWT token in localStorage/state                      │
└────────────────────┬────────────────────────────────────────────┘
                      │
                      │ HTTPS Request
                      │ Headers: { Authorization: "Bearer <JWT>" }
                      │ Body: JSON data
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXPRESS SERVER (server.js)                   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Middleware Stack (in order):                            │ │
│  │ 1. CORS middleware (dynamic origins)                     │ │
│  │ 2. express.json() - Parse JSON bodies                    │ │
│  │ 3. Debug logging middleware                              │ │
│  │ 4. Route handlers                                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────┬────────────────────────────────────────────┘
                      │
                      │ Route matches: /api/groq/studyplan
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              ROUTE HANDLER (routes/groq.js)                     │
│                                                                 │
│  1. auth middleware verifies JWT token                         │
│     └─> Extracts user info: { _id, email, displayName }        │
│                                                                 │
│  2. Request validation                                         │
│     └─> Check required fields (subjects, weeks, etc.)         │
│                                                                 │
│  3. Business logic                                             │
│     └─> Calculate session capacity                             │
│     └─> Generate AI prompt                                     │
└────────────────────┬────────────────────────────────────────────┘
                      │
                      │ External API Call
                      │ POST https://api.groq.com/openai/v1/chat/completions
                      │ Headers: { Authorization: "Bearer <GROQ_API_KEY>" }
                      │ Body: { model, messages, temperature }
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                  GROQ AI SERVICE (External)                    │
│  - Processes prompt with Llama-3.3-70B model                  │
│  - Generates study schedule JSON                               │
│  - Returns: { choices: [{ message: { content: "..." } }] }     │
└────────────────────┬────────────────────────────────────────────┘
                      │
                      │ Response: JSON schedule
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              ROUTE HANDLER (routes/groq.js)                    │
│                                                                 │
│  4. Response processing                                        │
│     └─> Parse AI response                                      │
│     └─> Validate JSON structure                                │
│     └─> Validate subjects, dates, constraints                  │
│                                                                 │
│  5. Database operations                                        │
│     └─> Find or create StudyPlan                               │
│     └─> Update sessions array                                  │
└────────────────────┬────────────────────────────────────────────┘
                      │
                      │ MongoDB Operations
                      │ StudyPlan.findOne({ userId })
                      │ StudyPlan.save()
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MONGODB DATABASE                          │
│                                                                 │
│  Collections:                                                  │
│  - users                                                       │
│  - studyplans                                                  │
│  - notes                                                       │
│                                                                 │
│  StudyPlan Document:                                           │
│  {                                                              │
│    userId: ObjectId,                                           │
│    sessions: [                                                 │
│      { subject, startTime, endTime, status, progress }         │
│    ]                                                            │
│  }                                                              │
└────────────────────┬────────────────────────────────────────────┘
                      │
                      │ Success Response
                      │ { success: true, plan: {...} }
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  - Receives response                                           │
│  - Updates UI state                                            │
│  - Displays study schedule to user                             │
└─────────────────────────────────────────────────────────────────┘
```

### Specific Flow Examples

#### 1. File Upload Flow
```
Frontend (Upload Form)
  │
  ├─> POST /api/notes/upload
  │   Headers: { Authorization: "Bearer <JWT>", Content-Type: "multipart/form-data" }
  │   Body: FormData { file, subject, title }
  │
  ├─> Middleware: auth → verifies JWT
  │
  ├─> Middleware: upload (multer) → processes file buffer
  │
  ├─> Upload to Supabase Storage
  │   └─> supabase.storage.from('studyverse-uploads').upload(filePath, buffer)
  │
  ├─> Get public URL
  │   └─> supabase.storage.from('studyverse-uploads').getPublicUrl(filePath)
  │
  ├─> Save to MongoDB
  │   └─> Note.create({ userId, subject, title, fileUrl, publicUrl })
  │
  └─> Response: { noteId, publicUrl, filePath }
```

#### 2. AI Summary Generation Flow
```
Frontend (PDF Viewer)
  │
  ├─> Extract text from PDF (pdf-parse or client-side)
  │
  ├─> POST /api/groq/summary
  │   Headers: { Authorization: "Bearer <JWT>" }
  │   Body: { text: "extracted PDF text..." }
  │
  ├─> Middleware: auth → verifies JWT
  │
  ├─> Truncate text (8000 words max)
  │
  ├─> Call Groq API
  │   └─> POST https://api.groq.com/openai/v1/chat/completions
  │       Body: { model: "llama-3.3-70b-versatile", messages: [...] }
  │
  ├─> Receive AI summary
  │
  └─> Return summary to frontend
```

#### 3. Session Completion Flow
```
Mobile App
  │
  ├─> PUT /api/study-sessions/:sessionId
  │   Headers: { Authorization: "Bearer <JWT>" }
  │   Body: { progress: 100 }
  │
  ├─> Middleware: auth → verifies JWT
  │
  ├─> Find StudyPlan
  │   └─> StudyPlan.findOne({ userId })
  │
  ├─> Update session
  │   └─> session.progress = 100
  │   └─> session.status = 'completed'
  │
  ├─> Save to MongoDB
  │   └─> studyPlan.save()
  │
  └─> Response: { ...session, status: 'completed', progress: 100 }
```

---

## Areas for Improvement

### 1. Request Validation

**Current Issues:**
- Manual validation scattered across route handlers
- Inconsistent error messages
- No schema validation
- Missing input sanitization

**Example from groq.js:**
```javascript
// Current (basic validation)
if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
  return res.status(400).json({ error: 'At least one subject is required' });
}
```

**Improvements Needed:**
- Use validation library (Joi, express-validator, or Zod)
- Centralized validation schemas
- Consistent error response format
- Input sanitization

### 2. Error Handling

**Current Issues:**
- Inconsistent error response formats
- Generic error messages
- Missing error logging/monitoring
- Some errors not caught properly

**Current Pattern:**
```javascript
try {
  // logic
} catch (err) {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
}
```

**Improvements Needed:**
- Centralized error handler middleware
- Custom error classes
- Consistent error response structure
- Error logging service (e.g., Sentry)

### 3. Async/Await Handling

**Current Status:** ✅ Good - Most routes use async/await correctly

**Minor Issues:**
- Some routes don't handle promise rejections explicitly
- Missing timeout handling for external API calls

**Example Improvement:**
```javascript
// Add timeout wrapper for Groq API calls
const callWithTimeout = async (promise, timeoutMs) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    )
  ]);
};
```

### 4. Modular Routing

**Current Status:** ✅ Good - Routes are separated by feature

**Issues:**
- Large route files (groq.js is 720+ lines)
- Business logic mixed with route handlers
- No service layer pattern

**Improvement Needed:**
- Extract business logic to service classes
- Separate concerns: routes → controllers → services → models

### 5. Middleware Organization

**Current Issues:**
- Debug logging middleware in server.js (should be conditional)
- CORS configuration could be cleaner
- Missing rate limiting
- Missing request logging/monitoring

**Improvements Needed:**
- Separate middleware files
- Environment-based middleware (dev vs prod)
- Add rate limiting middleware
- Request/response logging middleware

### 6. Authentication & Security

**Current Issues:**
- Token in query string for some endpoints (`?token=xyz`)
- No refresh token mechanism (currently mocked)
- No token blacklisting for logout
- JWT secret should be rotated

**Improvements Needed:**
- Always use Authorization header
- Implement proper refresh token flow
- Add token blacklist (Redis or MongoDB)
- Implement token rotation

### 7. Database Operations

**Current Issues:**
- No transaction support for multi-step operations
- Missing database indexes on frequently queried fields
- No connection pooling configuration (using defaults)
- Missing query optimization

**Improvements Needed:**
- Add indexes: `userId` in StudyPlan, `userId` + `subject` in Note
- Use transactions for atomic operations
- Configure connection pooling explicitly
- Add query performance monitoring

### 8. External API Integration

**Current Issues:**
- No retry logic for Groq API calls
- No rate limiting consideration
- No caching for expensive operations
- Hard-coded model names

**Improvements Needed:**
- Implement retry with exponential backoff
- Add rate limiting middleware
- Cache AI responses (Redis or in-memory)
- Move AI configuration to environment variables

### 9. Response Standardization

**Current Issues:**
- Inconsistent response formats
- Sometimes `{ data: [...] }`, sometimes just `[...]`
- Mixed success/error response structures

**Improvements Needed:**
- Standardize response format:
  ```javascript
  {
    success: boolean,
    data: any,
    message?: string,
    error?: string,
    meta?: { pagination, timestamp, etc. }
  }
  ```

### 10. Code Organization

**Current Structure:**
```
routes/
  ├─ groq.js (720 lines) - Too large
  ├─ notes.js (1043 lines) - Too large
  ├─ auth.js (689 lines) - Large but manageable
  └─ studySessions.js (578 lines) - Large
```

**Improvements Needed:**
- Extract services layer
- Extract utilities
- Break large files into smaller modules

---

## Refactoring Examples

### Example 1: Request Validation with express-validator

**Before:**
```javascript
router.post('/studyplan', auth, async (req, res) => {
  const { subjects, weeks, preference } = req.body;
  
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'At least one subject is required' });
  }
  
  if (!weeks || weeks < 1 || weeks > 4) {
    return res.status(400).json({ error: 'Weeks must be between 1 and 4' });
  }
  // ... more manual validation
});
```

**After:**
```javascript
// validators/studyPlanValidator.js
const { body, validationResult } = require('express-validator');

const validateStudyPlan = [
  body('subjects')
    .isArray({ min: 1, max: 6 })
    .withMessage('Must provide 1-6 subjects')
    .custom((subjects) => {
      if (!subjects.every(s => typeof s === 'string' && s.length > 0)) {
        throw new Error('All subjects must be non-empty strings');
      }
      return true;
    }),
  body('weeks')
    .isInt({ min: 1, max: 4 })
    .withMessage('Weeks must be between 1 and 4'),
  body('preference')
    .isIn(['morning', 'afternoon', 'evening', 'night', 'flexible'])
    .withMessage('Invalid time preference'),
  body('sessionLength')
    .optional()
    .isInt({ min: 30, max: 120 })
    .withMessage('Session length must be 30-120 minutes'),
  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

module.exports = { validateStudyPlan };

// routes/groq.js (refactored)
router.post('/studyplan', auth, validateStudyPlan, async (req, res) => {
  // Validation already passed, proceed with logic
  const { subjects, weeks, preference } = req.body;
  // ...
});
```

### Example 2: Service Layer Pattern

**Before:**
```javascript
// routes/groq.js - All logic in route handler
router.post('/studyplan', auth, async (req, res) => {
  try {
    // 500+ lines of business logic here
    const { subjects, weeks } = req.body;
    // ... validation
    // ... prompt generation
    // ... API call
    // ... response processing
    // ... database operations
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**After:**
```javascript
// services/groqService.js
const axios = require('axios');
const StudyPlan = require('../models/StudyPlan');

class GroqService {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    this.model = 'llama-3.3-70b-versatile';
  }

  async generateStudyPlan(params) {
    const { subjects, weeks, preference, sessionLength, userId } = params;
    
    // Generate prompt
    const prompt = this.buildStudyPlanPrompt(params);
    
    // Call Groq API
    const response = await this.callGroqAPI(prompt);
    
    // Parse and validate response
    const plan = this.parseAndValidatePlan(response, subjects, weeks);
    
    // Save to database
    await this.saveStudyPlan(userId, plan);
    
    return plan;
  }

  buildStudyPlanPrompt(params) {
    // Extract prompt building logic
    // ...
  }

  async callGroqAPI(prompt) {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: '...' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 4000
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 60000 // 60 second timeout
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Groq API error: ${error.message}`);
    }
  }

  parseAndValidatePlan(response, expectedSubjects, expectedWeeks) {
    // Extract parsing and validation logic
    // ...
  }

  async saveStudyPlan(userId, plan) {
    // Extract database logic
    let studyPlan = await StudyPlan.findOne({ userId });
    if (!studyPlan) {
      studyPlan = new StudyPlan({ userId, sessions: [] });
    }
    studyPlan.sessions.push(...plan.sessions);
    await studyPlan.save();
  }
}

module.exports = new GroqService();

// routes/groq.js (simplified)
const groqService = require('../services/groqService');

router.post('/studyplan', auth, validateStudyPlan, async (req, res) => {
  try {
    const plan = await groqService.generateStudyPlan({
      ...req.body,
      userId: req.user._id
    });
    
    res.json({
      success: true,
      data: plan,
      message: 'Study plan generated successfully'
    });
  } catch (error) {
    // Error handling middleware will catch this
    next(error);
  }
});
```

### Example 3: Centralized Error Handling

**Before:**
```javascript
// Scattered error handling
try {
  // logic
} catch (error) {
  console.error('Error:', error);
  res.status(500).json({ error: error.message });
}
```

**After:**
```javascript
// errors/ApiError.js
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class ValidationError extends ApiError {
  constructor(message) {
    super(400, message);
  }
}

class NotFoundError extends ApiError {
  constructor(resource) {
    super(404, `${resource} not found`);
  }
}

class ExternalApiError extends ApiError {
  constructor(service, message) {
    super(502, `${service} error: ${message}`);
  }
}

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  ExternalApiError
};

// middleware/errorHandler.js
const { ApiError } = require('../errors/ApiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Convert non-API errors to ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Log error
  console.error(`[${error.statusCode}] ${error.message}`, {
    stack: error.stack,
    url: req.url,
    method: req.method,
    userId: req.user?._id
  });

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};

module.exports = errorHandler;

// server.js
const errorHandler = require('./middleware/errorHandler');
// ... other middleware
app.use(errorHandler); // Must be last

// Usage in routes
const { ValidationError, NotFoundError } = require('../errors/ApiError');

router.get('/notes/:id', auth, async (req, res, next) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) {
      throw new NotFoundError('Note');
    }
    res.json({ success: true, data: note });
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

### Example 4: Standardized Response Format

**Before:**
```javascript
// Inconsistent responses
res.json(notes); // Sometimes just array
res.json({ data: notes }); // Sometimes wrapped
res.status(201).json({ noteId, publicUrl }); // Different structure
```

**After:**
```javascript
// utils/response.js
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  });
};

const errorResponse = (res, message, statusCode = 400, errors = null) => {
  const response = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (errors) {
    response.errors = errors;
  }
  
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limit)
    },
    message,
    timestamp: new Date().toISOString()
  });
};

module.exports = { successResponse, errorResponse, paginatedResponse };

// Usage in routes
const { successResponse, errorResponse } = require('../utils/response');

router.get('/notes', auth, async (req, res, next) => {
  try {
    const notes = await Note.find({ userId: req.user._id });
    return successResponse(res, notes, 'Notes retrieved successfully');
  } catch (error) {
    next(error);
  }
});
```

### Example 5: Modular Route Organization

**Before:**
```javascript
// routes/notes.js (1043 lines - everything in one file)
router.post('/upload', ...);
router.get('/', ...);
router.get('/subjects', ...);
router.get('/view', ...);
router.get('/view/:id', ...);
router.get('/view-pdf/:id', ...);
router.get('/download/:id', ...);
router.get('/direct-view/:id', ...);
// ... many more endpoints
```

**After:**
```javascript
// routes/notes/index.js
const express = require('express');
const router = express.Router();
const uploadRoutes = require('./upload');
const viewRoutes = require('./view');
const documentRoutes = require('./documents');

router.use('/upload', uploadRoutes);
router.use('/view', viewRoutes);
router.use('/', documentRoutes);

module.exports = router;

// routes/notes/upload.js
const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../../middleware/upload');
const noteService = require('../../services/noteService');
const { successResponse } = require('../../utils/response');

router.post('/', uploadMiddleware, async (req, res, next) => {
  try {
    const result = await noteService.uploadDocument({
      file: req.file,
      userId: req.user._id,
      subject: req.body.subject,
      title: req.body.title
    });
    return successResponse(res, result, 'Document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// routes/notes/view.js
const express = require('express');
const router = express.Router();
const noteService = require('../../services/noteService');

router.get('/pdf/:id', async (req, res, next) => {
  // PDF viewing logic
});

router.get('/:id', async (req, res, next) => {
  // Document viewing logic
});

module.exports = router;
```

### Example 6: Database Service Layer

**Before:**
```javascript
// Direct database access in routes
router.get('/notes', auth, async (req, res) => {
  const notes = await Note.find({ userId: req.user._id });
  res.json(notes);
});
```

**After:**
```javascript
// services/noteService.js
const Note = require('../models/Note');
const { NotFoundError } = require('../errors/ApiError');

class NoteService {
  async getNotesByUser(userId, filters = {}) {
    const query = { userId, ...filters };
    return Note.find(query).sort({ createdAt: -1 });
  }

  async getNoteById(noteId, userId) {
    const note = await Note.findOne({ _id: noteId, userId });
    if (!note) {
      throw new NotFoundError('Note');
    }
    return note;
  }

  async getUniqueSubjects(userId) {
    const notes = await this.getNotesByUser(userId);
    const subjects = [...new Set(notes.map(note => note.subject))];
    return subjects.map(subject => ({
      id: subject.toLowerCase().replace(/\s+/g, '-'),
      name: subject,
      documentsCount: notes.filter(n => n.subject === subject).length
    }));
  }

  async deleteNote(noteId, userId) {
    const note = await this.getNoteById(noteId, userId);
    // Handle file deletion from Supabase
    if (note.fileUrl?.includes('supabase')) {
      await this.deleteFileFromSupabase(note.fileUrl);
    }
    await Note.findByIdAndDelete(noteId);
    return { message: 'Note deleted successfully' };
  }

  async deleteFileFromSupabase(fileUrl) {
    // Extract file deletion logic
  }
}

module.exports = new NoteService();

// routes/notes.js (using service)
const noteService = require('../services/noteService');

router.get('/', auth, async (req, res, next) => {
  try {
    const notes = await noteService.getNotesByUser(req.user._id);
    return successResponse(res, notes);
  } catch (error) {
    next(error);
  }
});
```

### Example 7: Configuration Management

**Before:**
```javascript
// Hard-coded values scattered across files
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
```

**After:**
```javascript
// config/groq.js
module.exports = {
  apiKey: process.env.GROQ_API_KEY,
  apiUrl: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions',
  model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  timeout: parseInt(process.env.GROQ_TIMEOUT) || 60000,
  maxTokens: parseInt(process.env.GROQ_MAX_TOKENS) || 4000,
  temperature: parseFloat(process.env.GROQ_TEMPERATURE) || 0.1,
  retryAttempts: parseInt(process.env.GROQ_RETRY_ATTEMPTS) || 3
};

// services/groqService.js
const groqConfig = require('../config/groq');

class GroqService {
  constructor() {
    this.apiKey = groqConfig.apiKey;
    this.apiUrl = groqConfig.apiUrl;
    this.model = groqConfig.model;
    // ...
  }
}
```

### Example 8: Request Logging Middleware

**Before:**
```javascript
// Debug middleware in server.js logs everything (too verbose)
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  });
  next();
});
```

**After:**
```javascript
// middleware/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?._id,
      ip: req.ip
    });
  });
  
  next();
};

module.exports = { logger, requestLogger };

// server.js
const { requestLogger } = require('./middleware/logger');
app.use(requestLogger);
```

---

## Best Practices Implementation

### Recommended Project Structure

```
study-planner-server/
├── config/
│   ├── database.js        # MongoDB connection config
│   ├── groq.js            # Groq API config
│   ├── supabase.js        # Supabase config
│   └── passport.js        # Auth config
│
├── middleware/
│   ├── auth.js            # JWT authentication
│   ├── upload.js          # File upload (multer)
│   ├── validator.js       # Request validation
│   ├── errorHandler.js    # Centralized error handling
│   ├── logger.js          # Request logging
│   └── rateLimiter.js     # Rate limiting
│
├── routes/
│   ├── index.js           # Route aggregator
│   ├── auth.js            # Authentication routes
│   ├── notes/
│   │   ├── index.js       # Notes router
│   │   ├── upload.js      # Upload endpoints
│   │   ├── view.js        # View endpoints
│   │   └── documents.js   # CRUD endpoints
│   ├── sessions/
│   │   ├── index.js
│   │   └── sessions.js
│   └── ai/
│       ├── index.js
│       ├── groq.js
│       └── gemini.js
│
├── services/
│   ├── groqService.js     # Groq AI integration
│   ├── noteService.js    # Note business logic
│   ├── sessionService.js # Session business logic
│   ├── authService.js    # Authentication logic
│   └── storageService.js # Supabase storage logic
│
├── models/
│   ├── User.js
│   ├── StudyPlan.js
│   └── Note.js
│
├── utils/
│   ├── response.js        # Response formatters
│   ├── validation.js      # Validation helpers
│   └── errors.js          # Error utilities
│
├── errors/
│   ├── ApiError.js        # Custom error classes
│   └── errorTypes.js
│
├── validators/
│   ├── authValidator.js
│   ├── noteValidator.js
│   └── sessionValidator.js
│
└── server.js              # Entry point
```

### Environment Variables Checklist

```env
# Server
NODE_ENV=development
PORT=5000
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb+srv://...

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Groq AI
GROQ_API_KEY=...
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_TIMEOUT=60000
GROQ_MAX_TOKENS=4000

# Supabase
SUPABASE_URL=...
SUPABASE_KEY=...
SUPABASE_BUCKET=studyverse-uploads

# Logging
LOG_LEVEL=info
```

---

## Summary

### What You Did Well ✅

1. **RESTful Structure**: Good use of HTTP methods and resource-based URLs
2. **Separation of Routes**: Routes organized by feature
3. **JWT Authentication**: Proper token-based auth implementation
4. **MongoDB Integration**: Clean model definitions with Mongoose
5. **External API Integration**: Good Groq AI service integration

### Priority Improvements 🎯

1. **High Priority:**
   - Add request validation (express-validator or Joi)
   - Implement centralized error handling
   - Standardize response formats
   - Extract business logic to services layer

2. **Medium Priority:**
   - Add rate limiting
   - Improve security (always use Authorization header)
   - Add database indexes
   - Implement retry logic for external APIs

3. **Low Priority:**
   - Add request logging (Winston)
   - Implement caching
   - Add API documentation (Swagger)
   - Write unit tests

### Next Steps

1. Start with request validation for one route (e.g., `/api/groq/studyplan`)
2. Extract one service (e.g., `groqService.js`) to demonstrate pattern
3. Implement centralized error handling
4. Gradually refactor other routes following the same patterns
5. Add tests as you refactor

This refactoring should be done incrementally, route by route, to avoid breaking changes.



