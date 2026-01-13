# StudyVerse Data Flow Diagrams

## Complete Request-Response Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  User Action → Component State → API Call → State Update → UI Render      │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ HTTPS Request
                         │ ┌─────────────────────────────────────────┐
                         │ │ Headers:                                 │
                         │ │   Authorization: Bearer <JWT_TOKEN>     │
                         │ │   Content-Type: application/json         │
                         │ │ Body: { subjects: [...], weeks: 2 }    │
                         │ └─────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXPRESS SERVER (server.js)                           │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    MIDDLEWARE PIPELINE (Order)                      │  │
│  │                                                                       │  │
│  │  1. CORS Middleware                                                   │  │
│  │     └─> Check origin → Set Access-Control-Allow-Origin              │  │
│  │                                                                       │  │
│  │  2. express.json()                                                    │  │
│  │     └─> Parse JSON body → Attach to req.body                         │  │
│  │                                                                       │  │
│  │  3. Request Logger (Development)                                      │  │
│  │     └─> Log: method, url, headers, body                             │  │
│  │                                                                       │  │
│  │  4. Route Matching                                                    │  │
│  │     └─> Match URL pattern to route handler                           │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Route: POST /api/groq/studyplan
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/groq.js)                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AUTHENTICATION MIDDLEWARE                          │  │
│  │                                                                         │  │
│  │  1. Extract token from Authorization header                           │  │
│  │     Header: "Bearer eyJhbGciOiJIUzI1NiIs..."                          │  │
│  │                                                                         │  │
│  │  2. Verify JWT token (jwt.verify)                                       │  │
│  │     └─> Decode: { id: "userId", email: "...", displayName: "..." }    │  │
│  │                                                                         │  │
│  │  3. Attach user to request                                             │  │
│  │     req.user = { _id: "userId", email: "...", displayName: "..." }    │  │
│  │                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      REQUEST VALIDATION                                │  │
│  │                                                                         │  │
│  │  Check:                                                                 │  │
│  │  ✓ subjects: Array, length > 0, max 6                                 │  │
│  │  ✓ weeks: Number, 1-4                                                  │  │
│  │  ✓ preference: 'morning'|'afternoon'|'evening'|'night'|'flexible'     │  │
│  │  ✓ sessionLength: Number (optional)                                    │  │
│  │                                                                         │  │
│  │  If invalid → Return 400 with error message                           │  │
│  │                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      BUSINESS LOGIC                                   │  │
│  │                                                                         │  │
│  │  1. Calculate session capacity                                         │  │
│  │     └─> Based on preference, sessionLength, breakLength              │  │
│  │                                                                         │  │
│  │  2. Validate total sessions vs available slots                        │  │
│  │     └─> Return error if exceeds capacity                              │  │
│  │                                                                         │  │
│  │  3. Generate AI prompt                                                 │  │
│  │     └─> Build detailed prompt with all constraints                    │  │
│  │                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ External API Call
                         │ POST https://api.groq.com/openai/v1/chat/completions
                         │ ┌─────────────────────────────────────────┐
                         │ │ Headers:                                │
                         │ │   Authorization: Bearer <GROQ_API_KEY>  │
                         │ │ Body: {                                │
                         │ │   model: "llama-3.3-70b-versatile",    │
                         │ │   messages: [...],                     │
                         │ │   temperature: 0.1,                    │
                         │ │   max_tokens: 4000                     │
                         │ │ }                                       │
                         │ └─────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GROQ AI SERVICE (External)                             │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AI PROCESSING                                       │  │
│  │                                                                         │  │
│  │  1. Receive prompt                                                     │  │
│  │     └─> Process with Llama-3.3-70B model                              │  │
│  │                                                                         │  │
│  │  2. Generate study schedule                                            │  │
│  │     └─> JSON format: { weeks: [{ weekNumber, sessions: [...] }] }     │  │
│  │                                                                         │  │
│  │  3. Return response                                                     │  │
│  │     Response: {                                                        │  │
│  │       choices: [{                                                      │  │
│  │         message: {                                                     │  │
│  │           content: "{\"weeks\":[{\"weekNumber\":1,...}]}"              │  │
│  │         }                                                              │  │
│  │       }]                                                               │  │
│  │     }                                                                   │  │
│  │                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Response: JSON schedule
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/groq.js)                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    RESPONSE PROCESSING                                │  │
│  │                                                                         │  │
│  │  1. Extract AI response content                                      │  │
│  │     └─> message = response.choices[0].message.content                 │  │
│  │                                                                         │  │
│  │  2. Clean and parse JSON                                               │  │
│  │     └─> Remove markdown code blocks                                    │  │
│  │     └─> JSON.parse(cleanedMessage)                                    │  │
│  │                                                                         │  │
│  │  3. Validate AI response                                               │  │
│  │     ✓ Correct number of weeks                                          │  │
│  │     ✓ Valid subject names (match user input)                          │  │
│  │     ✓ No sessions in the past                                          │  │
│  │     ✓ Sessions on correct days (preferredDays)                         │  │
│  │     ✓ Even distribution (no clustering)                                 │  │
│  │                                                                         │  │
│  │  4. If validation fails → Return 500 with details                     │  │
│  │                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    DATABASE OPERATIONS                                │  │
│  │                                                                         │  │
│  │  1. Find or create StudyPlan                                          │  │
│  │     StudyPlan.findOne({ userId: req.user._id })                       │  │
│  │                                                                         │  │
│  │  2. Update sessions array                                              │  │
│  │     studyPlan.sessions.push(...newSessions)                            │  │
│  │                                                                         │  │
│  │  3. Update subjects list                                               │  │
│  │     studyPlan.subjects = [...new Set(subjects)]                       │  │
│  │                                                                         │  │
│  │  4. Save to MongoDB                                                    │  │
│  │     studyPlan.save()                                                   │  │
│  │                                                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Success Response
                         │ { success: true, plan: {...}, message: "..." }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  Receive Response → Update State → Re-render UI → Display Schedule        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## File Upload Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  User selects PDF → FileReader → FormData → POST /api/notes/upload        │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ POST /api/notes/upload
                         │ ┌─────────────────────────────────────────┐
                         │ │ Content-Type: multipart/form-data        │
                         │ │ Body: FormData {                          │
                         │ │   file: <File object>,                   │
                         │ │   subject: "Mathematics",                 │
                         │ │   title: "Chapter 1"                     │
                         │ │ }                                         │
                         │ └─────────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MIDDLEWARE: upload (multer)                              │
│  Process multipart/form-data → Extract file buffer → Attach to req.file     │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ req.file = { buffer, originalname, mimetype, ... }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/notes.js)                       │
│                                                                              │
│  1. Generate unique file path                                                │
│     └─> `${Date.now()}-${uuidv4()}_${file.originalname}`                   │
│                                                                              │
│  2. Upload to Supabase Storage                                              │
│     └─> supabase.storage.from('studyverse-uploads').upload(filePath, buffer)│
│                                                                              │
│  3. Get public URL                                                          │
│     └─> supabase.storage.from('studyverse-uploads').getPublicUrl(filePath)  │
│                                                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Supabase Storage API
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUPABASE STORAGE                                     │
│  Store file → Return file path → Generate public URL                        │
│  publicUrl: https://xxx.supabase.co/storage/v1/object/public/...           │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Return: { publicUrl }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/notes.js)                       │
│                                                                              │
│  4. Create Note document                                                    │
│     Note.create({                                                            │
│       userId: req.user._id,                                                 │
│       subject: "Mathematics",                                               │
│       title: "Chapter 1",                                                   │
│       fileName: "chapter1.pdf",                                             │
│       fileUrl: publicUrl,                                                    │
│       publicUrl: publicUrl                                                   │
│     })                                                                       │
│                                                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ MongoDB Insert
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONGODB                                            │
│  Insert document into 'notes' collection                                    │
│  { _id: ObjectId, userId, subject, title, fileUrl, publicUrl, ... }       │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Response: { noteId, publicUrl, filePath }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  Receive response → Update notes list → Show upload success                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## AI Summary Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  User clicks "Summarize" → Extract PDF text → POST /api/groq/summary       │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ POST /api/groq/summary
                         │ Body: { text: "Full PDF text content..." }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/groq.js)                        │
│                                                                              │
│  1. Truncate text (max 8000 words)                                          │
│     └─> Prevent token limit issues                                          │
│                                                                              │
│  2. Build prompt                                                            │
│     messages: [                                                              │
│       { role: 'system', content: 'You summarize academic slides...' },      │
│       { role: 'user', content: `Summarize this:\n${truncatedText}` }        │
│     ]                                                                        │
│                                                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ POST https://api.groq.com/openai/v1/chat/completions
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GROQ AI SERVICE                                     │
│  Process with Llama-3.3-70B → Generate summary → Return text               │
│  Response: { choices: [{ message: { content: "Summary text..." } }] }       │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Return: Summary text
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
│  Display summary in UI → User can read/download                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Session Completion Flow (Mobile)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP                                        │
│  User marks session complete → PUT /api/study-sessions/:id                 │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ PUT /api/study-sessions/:sessionId
                         │ Body: { progress: 100 }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/studySessions.js)                │
│                                                                              │
│  1. Find user's StudyPlan                                                    │
│     └─> StudyPlan.findOne({ userId: req.user._id })                       │
│                                                                              │
│  2. Find session in sessions array                                          │
│     └─> session = studyPlan.sessions.find(s => s._id === sessionId)       │
│                                                                              │
│  3. Update session                                                          │
│     └─> session.progress = 100                                              │
│     └─> session.status = 'completed'                                        │
│                                                                              │
│  4. Save to MongoDB                                                         │
│     └─> studyPlan.save()                                                    │
│                                                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ MongoDB Update
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONGODB                                            │
│  Update StudyPlan document → sessions array updated                         │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Response: { ...session, progress: 100, status: 'completed' }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MOBILE APP                                        │
│  Update UI → Show completion status → Update progress tracking             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                       │
│  User enters email/password → POST /api/auth/login                         │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ POST /api/auth/login
                         │ Body: { email: "...", password: "..." }
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/auth.js)                         │
│                                                                              │
│  1. Find user by email                                                      │
│     └─> User.findOne({ email })                                             │
│                                                                              │
│  2. Verify password                                                         │
│     └─> user.comparePassword(password)                                    │
│     └─> Uses bcrypt.compare()                                               │
│                                                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ MongoDB Query
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MONGODB                                            │
│  Find user document → Return user with hashed password                     │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Password verified
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE HANDLER (routes/auth.js)                         │
│                                                                              │
│  3. Generate JWT token                                                       │
│     └─> jwt.sign({ id: user._id, email, displayName }, JWT_SECRET, {       │
│         expiresIn: '24h'                                                    │
│       })                                                                     │
│                                                                              │
│  4. Return token and user info                                              │
│     Response: {                                                             │
│       token: "eyJhbGciOiJIUzI1NiIs...",                                     │
│       user: { id, email, displayName }                                      │
│     }                                                                        │
│                                                                              │
└───────────────────────┬─────────────────────────────────────────────────────┘
                         │
                         │ Response with JWT
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND                                       │
│  Store token in localStorage → Use in Authorization header for future reqs │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Summary

### Request Types

1. **Simple GET Request** (e.g., get all notes)
   ```
   Frontend → Server → MongoDB → Server → Frontend
   ```

2. **POST with External API** (e.g., generate study plan)
   ```
   Frontend → Server → Groq API → Server → MongoDB → Server → Frontend
   ```

3. **File Upload** (e.g., upload PDF)
   ```
   Frontend → Server → Supabase Storage → Server → MongoDB → Server → Frontend
   ```

4. **Complex Flow** (e.g., AI summary from uploaded PDF)
   ```
   Frontend → Server → Supabase (get file) → 
   Frontend (extract text) → Server → Groq API → Server → Frontend
   ```

### Key Points

- **Authentication**: JWT token verified on every protected route
- **Validation**: Request data validated before processing
- **External APIs**: Groq AI and Supabase called asynchronously
- **Database**: MongoDB used for persistence (users, plans, notes)
- **Error Handling**: Errors caught and returned with appropriate status codes
- **Response Format**: JSON responses (mostly consistent, could be improved)



