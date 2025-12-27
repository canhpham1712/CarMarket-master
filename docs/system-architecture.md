# System Architecture Documentation

**Last Updated:** 2025-12-27
**Version:** 1.0.0

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [System Components](#system-components)
4. [Data Architecture](#data-architecture)
5. [Security Architecture](#security-architecture)
6. [Communication Patterns](#communication-patterns)
7. [Scalability Architecture](#scalability-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Monitoring & Observability](#monitoring--observability)
10. [Disaster Recovery](#disaster-recovery)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Browser    │  │  Mobile Web  │  │   PWA App    │         │
│  │  (React 19)  │  │  (React 19)  │  │  (React 19)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓ HTTPS/WSS
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │             NestJS Backend (Port 3000)                   │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │ Controllers│→ │  Services  │→ │Repositories│        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │   Guards   │  │Interceptors│  │  Gateways  │        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │        Python ML Service (FastAPI, Port 8000)           │  │
│  │  - Car price prediction (Ridge Regression, RF, XGBoost) │  │
│  │  - Model training & evaluation pipeline                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         Data Layer                               │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │   PostgreSQL 15      │  │      Redis 7          │           │
│  │   - Relational data  │  │   - Session storage  │           │
│  │   - pgvector ext.    │  │   - Query caching    │           │
│  │   - TypeORM ORM      │  │   - Pub/Sub          │           │
│  └──────────────────────┘  └──────────────────────┘           │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │   ChromaDB          │  │   File Storage       │           │
│  │   - Vector embeddings│  │   - Images           │           │
│  │   - RAG for AI      │  │   - Documents        │           │
│  └──────────────────────┘  └──────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Google  │ │Facebook  │ │  OpenAI  │ │Firebase  │          │
│  │  OAuth   │ │  OAuth   │ │   API    │ │   FCM    │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │   MoMo   │ │  VNPay   │ │  PayOS   │                        │
│  │ Payment  │ │ Payment  │ │ Payment  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Patterns

1. **Monorepo Structure**: Single repository with multiple packages
2. **Layered Architecture**: Controllers → Services → Repositories
3. **Event-Driven**: WebSocket events for real-time features
4. **Microservices-Ready**: ML service as separate service
5. **CQRS Pattern**: Separate read/write operations for complex queries
6. **Repository Pattern**: Abstraction over data access

---

## Technology Stack

### Frontend Stack

```
Core Framework:
  ├─ React 19.1.1           # UI library
  ├─ TypeScript 5.8.3       # Type safety
  ├─ Vite 7.1.2             # Build tool
  └─ React Router 7.8.2     # Client-side routing

State Management:
  ├─ Zustand 5.0.8          # Global state
  ├─ React Context          # Component state
  └─ React Hook Form        # Form state

UI & Styling:
  ├─ Tailwind CSS 4.1.12    # Utility-first CSS
  ├─ Radix UI               # Accessible components
  ├─ Lucide React           # Icons
  └─ GSAP 3.13.0            # Animations

HTTP & Real-time:
  ├─ Axios 1.11.0           # HTTP client
  ├─ Socket.IO Client 4.8.1 # WebSocket client
  └─ Leaflet                # Maps

Validation:
  ├─ Zod 4.1.5              # Schema validation
  └─ React Hook Form        # Form validation
```

### Backend Stack

```
Core Framework:
  ├─ NestJS 11.0.1          # Node.js framework
  ├─ TypeScript 5.7.3       # Type safety
  ├─ Express 11.1.6         # HTTP server
  └─ Socket.IO 4.8.1        # WebSocket server

Database & ORM:
  ├─ PostgreSQL 15          # Primary database
  ├─ TypeORM 0.3.26         # ORM
  ├─ pgvector               # Vector operations
  └─ ioredis 5.8.2          # Redis client

Authentication:
  ├─ Passport 0.7.0         # Auth middleware
  ├─ JWT 11.0.0             # Token-based auth
  ├─ bcrypt 6.0.0           # Password hashing
  └─ OAuth 2.0              # Google, Facebook

AI & ML:
  ├─ OpenAI 6.5.0           # GPT API
  ├─ ChromaDB               # Vector database
  └─ @xenova/transformers   # Local embeddings

Communication:
  ├─ Nodemailer 6.9.16      # Email sending
  ├─ Firebase Admin 13.5.0  # Push notifications
  └─ Socket.IO              # Real-time events
```

### ML Service Stack

```
Core Framework:
  ├─ FastAPI                # Python web framework
  ├─ Python 3.11+           # Runtime
  └─ Uvicorn               # ASGI server

ML Libraries:
  ├─ scikit-learn          # ML algorithms
  ├─ pandas                # Data manipulation
  ├─ numpy                 # Numerical computing
  ├─ joblib                # Model serialization

Data Collection:
  ├─ BeautifulSoup4        # Web scraping
  ├─ requests              # HTTP client
  └─ selenium              # Browser automation
```

---

## System Components

### 1. Frontend Application (React)

**Architecture:**

```
┌─────────────────────────────────────────┐
│              Browser                     │
│  ┌─────────────────────────────────┐   │
│  │      React Application           │   │
│  │  ┌─────────────┐  ┌────────────┐ │   │
│  │  │    Pages    │  │ Components│ │   │
│  │  └─────────────┘  └────────────┘ │   │
│  │  ┌─────────────┐  ┌────────────┐ │   │
│  │  │  Contexts   │  │   Hooks   │ │   │
│  │  └─────────────┘  └────────────┘ │   │
│  │  ┌─────────────┐  ┌────────────┐ │   │
│  │  │   Stores    │  │  Services  │ │   │
│  │  │  (Zustand)  │  │  (Axios)   │ │   │
│  │  └─────────────┘  └────────────┘ │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Socket.IO Client (3 namespaces)│  │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Key Responsibilities:**
- User interface rendering
- Client-side routing
- Form validation
- Real-time updates (WebSocket)
- State management
- API communication

**Route Structure:**
```
/                           (Home)
/login                      (Authentication)
/register
/search                     (Listings)
/listings/:id              (Listing details)
/sell                       (Create listing)
/favorites                  (User favorites)
/chat                       (Real-time messaging)
/valuation                  (Car valuation)
/profile                    (User profile)
/admin                      (Admin dashboard)
```

### 2. Backend API (NestJS)

**Module Architecture:**

```
app.module.ts (Root Module)
├─ ConfigModule (Configuration)
├─ TypeOrmModule (Database)
├─ RedisModule (Caching)
├─ AuthModule (Authentication)
├─ UsersModule (User management)
├─ ListingsModule (Car listings)
├─ SearchModule (Search functionality)
├─ ChatModule (Real-time chat)
├─ CommentsModule (Comments)
├─ RatingsModule (Ratings & reviews)
├─ FavoritesModule (Favorites)
├─ NotificationsModule (Notifications)
├─ PaymentsModule (Payment processing)
├─ PromotionsModule (Listing promotions)
├─ AdminModule (Admin dashboard)
├─ RBACModule (Role-based access)
├─ AnalyticsModule (Analytics tracking)
├─ MonitoringModule (Health checks)
├─ AssistantModule (AI chatbot)
├─ RecommendationsModule (ML recommendations)
├─ GeocodingModule (Location services)
├─ SellerVerificationModule (Seller verification)
├─ ValuationModule (Car valuation integration)
├─ SettingsModule (User settings)
└─ LogsModule (System logging)
```

**Request Flow:**

```
Client Request
    ↓
Middleware (CORS, Logger)
    ↓
Guard (JWT, Permission)
    ↓
Interceptor (Logging, Transform, Cache)
    ↓
Pipe (Validation)
    ↓
Controller (Route handler)
    ↓
Service (Business logic)
    ↓
Repository (Data access)
    ↓
Database (PostgreSQL/Redis)
    ↓
Response
    ↓
Interceptor (Transform)
    ↓
Client Response
```

### 3. ML Service (FastAPI)

**Service Architecture:**

```
FastAPI Application
├─ /health (Health check)
├─ /predict (Price prediction)
│   ├─ Input validation
│   ├─ Feature preprocessing
│   ├─ Model inference
│   └─ Response formatting
├─ Models (31MB)
│   ├─ car_price_predictor.pkl
│   ├─ label_encoders.pkl
│   ├─ feature_columns.pkl
│   └─ model_metrics.pkl
└─ Scripts
    ├─ train_model.py
    ├─ retrain_model.py
    ├─ scrape_bonbanh.py
    ├─ scrape_oto.py
    └─ ...
```

**ML Pipeline:**

```
Data Collection
    ↓ (Web scraping)
Data Storage
    ↓ (CSV/Database)
Data Preprocessing
    ↓ (Feature engineering, encoding)
Model Training
    ↓ (Ridge Regression, RF, XGBoost)
Model Evaluation
    ↓ (R², MAE, RMSE)
Model Serialization
    ↓ (Pickle files)
API Deployment
    ↓ (FastAPI endpoint)
Prediction Service
```

### 4. WebSocket Gateway

**Gateway Architecture:**

```
Socket.IO Server
├─ /chat (Namespace)
│   ├─ sendMessage
│   ├─ receiveMessage
│   ├─ markAsRead
│   └─ typingIndicator
├─ /comments (Namespace)
│   ├─ addComment
│   ├─ updateComment
│   └─ deleteComment
└─ /notifications (Namespace)
    ├─ notification
    ├─ markAsRead
    └─ pushNotification
```

**Event Flow:**

```
Client Event
    ↓
Gateway (Authentication)
    ↓
Service (Business Logic)
    ↓
Repository (Persistence)
    ↓
Database
    ↓
Broadcast to Room
    ↓
All Connected Clients
```

---

## Data Architecture

### Database Schema (PostgreSQL)

```
┌─────────────────────────────────────────────────────────────┐
│                    Core Data Tables                         │
│                                                             │
│  users ──────────────────────────────────────┐             │
│    ├─ id (UUID, PK)                          │             │
│    ├─ email (VARCHAR, UNIQUE)                │             │
│    ├─ password_hash (VARCHAR)                │             │
│    └─ created_at (TIMESTAMP)                 │             │
│                                              │             │
│  listings ───────────────────────────────┐   │             │
│    ├─ id (UUID, PK)                       │   │             │
│    ├─ user_id (UUID, FK → users.id)      │   │             │
│    ├─ title (VARCHAR)                     │   │             │
│    ├─ price (DECIMAL)                     │   │             │
│    ├─ status (ENUM)                       │   │             │
│    └─ created_at (TIMESTAMP)              │   │             │
│                                            │   │             │
│  cars ──────────────────────────────────┐ │   │             │
│    ├─ id (UUID, PK)                      │ │   │             │
│    ├─ listing_id (UUID, FK → listings)  │ │   │             │
│    ├─ make_id (UUID, FK → makes)        │ │   │             │
│    ├─ model_id (UUID, FK → models)      │ │   │             │
│    ├─ year (INTEGER)                     │ │   │             │
│    └─ mileage (INTEGER)                  │ │   │             │
│                                            │   │             │
│  conversations ──────────────────────────┐ │   │             │
│    ├─ id (UUID, PK)                      │ │   │             │
│    ├─ buyer_id (UUID, FK → users.id)   │ │   │             │
│    ├─ seller_id (UUID, FK → users.id)  │ │   │             │
│    └─ listing_id (UUID, FK → listings) │ │   │             │
│                                            │   │             │
│  messages ───────────────────────────────┐ │   │             │
│    ├─ id (UUID, PK)                       │ │   │             │
│    ├─ conversation_id (UUID, FK)         │ │   │             │
│    ├─ sender_id (UUID, FK → users.id)   │ │   │             │
│    ├─ content (TEXT)                     │ │   │             │
│    └─ created_at (TIMESTAMP)             │ │   │             │
│                                              │   │             │
│  roles ────────────────────────────────────┐ │   │             │
│    ├─ id (UUID, PK)                        │ │   │             │
│    └─ name (VARCHAR, UNIQUE)               │ │   │             │
│                                              │   │             │
│  permissions ─────────────────────────────┐ │   │             │
│    ├─ id (UUID, PK)                       │ │   │             │
│    └─ name (VARCHAR, UNIQUE)              │ │   │             │
│                                            │ │   │             │
│  user_roles ─────────────────────────────┐ │ │   │             │
│    ├─ user_id (UUID, FK → users.id)     │ │ │   │             │
│    └─ role_id (UUID, FK → roles.id)     │ │ │   │             │
│                                            │ │   │             │
│  role_permissions ─────────────────────┐ │ │ │   │             │
│    ├─ role_id (UUID, FK → roles.id)   │ │ │ │   │             │
│    └─ permission_id (UUID, FK → permissions) │ │   │             │
└────────────────────────────────────────┴─┴─┴─────────────────────┘
```

### Caching Strategy (Redis)

```
Cache Keys Structure:

user:session:{userId}          → User session data (TTL: 7d)
user:permissions:{userId}      → User permissions (TTL: 1h)

listings:all:{page}            → All listings (TTL: 5m)
listings:search:{query}        → Search results (TTL: 5m)
listing:{id}                   → Single listing (TTL: 10m)

metadata:makes                 → Car makes (TTL: 1h)
metadata:models:{makeId}       → Car models (TTL: 1h)

geocoding:{address}            → Geocoding cache (TTL: 30d)

analytics:daily:{date}         → Daily analytics (TTL: 7d)
```

**Cache Invalidation:**
- Time-based expiration (TTL)
- Event-based invalidation (create/update/delete)
- Pattern-based invalidation (cache:*)

### Vector Database (ChromaDB)

```
ChromaDB Collections:

faq_embeddings:
  ├─ id: string
  ├─ question: string
  ├─ answer: string
  ├─ embedding: float[384]  (Sentence transformers)
  └─ metadata: {category, keywords}

Usage:
  1. User query → Generate embedding
  2. Semantic search in ChromaDB
  3. Retrieve top-K relevant FAQs
  4. Send context to OpenAI GPT
  5. Generate natural response
```

---

## Security Architecture

### Authentication Flow

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ 1. POST /auth/login
       ↓
┌─────────────────────────────────────┐
│  NestJS Auth Module                 │
│  ┌──────────────────────────────┐  │
│  │ LocalStrategy                │  │
│  │ - Validate email/password    │  │
│  │ - Compare hash with bcrypt   │  │
│  └──────┬───────────────────────┘  │
│         │ Valid user               │
│         ↓                          │
│  ┌──────────────────────────────┐  │
│  │ JwtService                   │  │
│  │ - Generate access token      │  │
│  │ - Generate refresh token     │  │
│  │ - Store in Redis             │  │
│  └──────┬───────────────────────┘  │
└─────────┼───────────────────────────┘
          │
          ↓ 2. Return JWT
┌──────────────┐
│   Client     │ Store token in localStorage
└──────┬───────┘
       │ 3. API Request with Authorization header
       ↓
┌─────────────────────────────────────┐
│  JwtAuthGuard                       │
│  ┌──────────────────────────────┐  │
│  │ Verify JWT signature         │  │
│  │ - Extract user payload       │  │
│  │ - Check token expiration     │  │
│  │ - Load from Redis if needed  │  │
│  └──────┬───────────────────────┘  │
│         │ Valid token              │
│         ↓                          │
│  Attach user to request            │
│  Proceed to controller             │
└─────────────────────────────────────┘
```

### OAuth Integration

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │ 1. GET /auth/google
       ↓
┌─────────────────────────────────────┐
│  NestJS                            │
│  ┌──────────────────────────────┐  │
│  │ GoogleAuthGuard              │  │
│  │ - Redirect to Google OAuth   │  │
│  └──────┬───────────────────────┘  │
└─────────┼───────────────────────────┘
          │
          ↓ 2. User authenticates at Google
┌─────────────────────────────────────┐
│  Google OAuth Server                │
│  ┌──────────────────────────────┐  │
│  │ User consent screen          │  │
│  └──────┬───────────────────────┘  │
└─────────┼───────────────────────────┘
          │
          ↓ 3. Redirect with authorization code
┌─────────────────────────────────────┐
│  NestJS                            │
│  ┌──────────────────────────────┐  │
│  │ GoogleStrategy               │  │
│  │ - Exchange code for token    │  │
│  │ - Get user profile           │  │
│  │ - Find or create user        │  │
│  │ - Generate JWT               │  │
│  └──────┬───────────────────────┘  │
└─────────┼───────────────────────────┘
          │
          ↓ 4. Redirect to frontend with token
┌──────────────┐
│   Client     │ Store token
└──────────────┘
```

### RBAC Implementation

```
User Entity
    ↓ (many-to-many)
Role Entity
    ↓ (many-to-many)
Permission Entity

Permission Format:
  resource.action (e.g., "listings.create")

Built-in Roles:
  - USER: [listings.view, favorites.manage]
  - SELLER: [listings.create, listings.update, listings.delete]
  - ADMIN: [listings.*, users.*, settings.*]

Permission Check Flow:
  1. User makes request
  2. JwtAuthGuard validates token
  3. User's roles loaded from DB
  4. Role's permissions loaded from DB
  5. PermissionGuard checks required permission
  6. Grant or deny access
```

### Data Security

```
Encryption at Rest:
  - Passwords: bcrypt (salt rounds: 10)
  - Sensitive fields: Consider encryption (future)
  - Database: PostgreSQL encryption (cloud provider)

Encryption in Transit:
  - HTTPS/TLS 1.3 for all API calls
  - WSS for WebSocket connections

Input Validation:
  - class-validator for DTOs
  - SQL injection prevention (TypeORM parameterized queries)
  - XSS prevention (React auto-escaping)
  - CSRF protection (SameSite cookies)

File Upload Security:
  - File type validation (whitelist)
  - File size limits (max 5MB per image)
  - Virus scanning (future)
  - Cloudinary upload transformation
```

---

## Communication Patterns

### REST API Communication

```
Request Format:
GET /api/listings?page=1&limit=20
Headers: {
  Authorization: Bearer {jwt_token},
  Content-Type: application/json
}

Response Format (Success):
HTTP 200 OK
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

Response Format (Error):
HTTP 400 Bad Request
{
  "success": false,
  "error": "ValidationError",
  "message": "Title is required",
  "details": [...]
}
```

### WebSocket Communication

```
Connection:
const socket = io('http://localhost:3000/chat', {
  auth: { token: jwt_token }
})

Event Flow:
Client ──[sendMessage]──→ Server
       ←─[newMessage]──── Server

Client ──[markAsRead]───→ Server
       ←─[messageRead]─── Server

Namespaces:
  /chat: Messaging between users
  /comments: Listing comments
  /notifications: Push notifications
```

### Event-Driven Architecture

```
Domain Events:
  - ListingCreated
  - ListingUpdated
  - ListingDeleted
  - UserRegistered
  - PaymentCompleted

Event Handlers:
  - Send notification on ListingCreated
  - Update cache on ListingUpdated
  - Log analytics on UserRegistered
  - Activate promotion on PaymentCompleted
```

---

## Scalability Architecture

### Horizontal Scaling

```
┌─────────────────────────────────────────────────┐
│            Load Balancer (Nginx)                │
└───────────┬─────────────────┬───────────────────┘
            │                 │
            ↓                 ↓
    ┌───────────┐       ┌───────────┐
    │  Server 1 │       │  Server 2 │
    │  NestJS   │       │  NestJS   │
    └───────────┘       └───────────┘
            │                 │
            └────────┬────────┘
                     ↓
            ┌─────────────────┐
            │  PostgreSQL     │
            │  (Primary)      │
            └───────┬─────────┘
                    │
                    ↓ Replication
            ┌─────────────────┐
            │  PostgreSQL     │
            │  (Read Replica) │
            └─────────────────┘
```

### Caching Layers

```
L1 Cache: Browser Cache
         ├─ Static assets (1d)
         └─ API responses (1m)

L2 Cache: Redis (Application)
         ├─ User sessions (7d)
         ├─ Query results (5m)
         └─ Metadata (1h)

L3 Cache: CDN (CloudFlare)
         ├─ Images (30d)
         ├─ CSS/JS (30d)
         └─ HTML pages (1h)
```

### Database Optimization

```
Indexing Strategy:
  - Primary keys (UUID)
  - Foreign keys (user_id, listing_id)
  - Composite indexes (status, created_at)
  - Full-text search (title, description)

Query Optimization:
  - Select only needed columns
  - Use pagination (limit/offset)
  - Avoid N+1 queries (TypeORM relations)
  - Use connection pooling

Read/Write Splitting:
  - Write operations → Primary DB
  - Read operations → Read replicas
  - Eventual consistency acceptable for reads
```

---

## Deployment Architecture

### Development Environment

```
Local Machine:
  ├─ React Dev Server (Vite) → localhost:5173
  ├─ NestJS Dev Server → localhost:3000
  ├─ PostgreSQL (Docker) → localhost:5433
  ├─ Redis (Docker) → localhost:6379
  └─ ML Service (FastAPI) → localhost:8000
```

### Production Environment

```
┌─────────────────────────────────────────────────┐
│               Cloudflare CDN                    │
│  (Static assets, DDoS protection, SSL)          │
└──────────────────────┬──────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────┐
│              Vercel (Frontend)                   │
│  ├─ React Build                                 │
│  ├─ Server-Side Rendering (future)              │
│  └─ Edge Functions                              │
└──────────────────────┬──────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────┐
│           Railway/Heroku (Backend)              │
│  ├─ NestJS Application                          │
│  ├─ PostgreSQL Database (Managed)               │
│  └─ Redis (Managed)                             │
└──────────────────────┬──────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────┐
│         Railway/Render (ML Service)             │
│  ├─ FastAPI Application                         │
│  └─ ML Models (loaded in memory)                │
└─────────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
GitHub Repository
    ↓ push
GitHub Actions
    ├─ Run tests (Jest, Vitest)
    ├─ Run linters (ESLint, Prettier)
    ├─ Type checking (TypeScript)
    ├─ Build (npm run build)
    └─ Deploy
        ├─ Frontend → Vercel
        ├─ Backend → Railway
        └─ ML Service → Railway
```

---

## Monitoring & Observability

### Logging Strategy

```
Log Levels:
  - ERROR: Application errors, exceptions
  - WARN: Deprecated API usage, potential issues
  - INFO: General information, user actions
  - DEBUG: Detailed debugging information
  - VERBOSE: Fine-grained tracing

Log Format:
  {
    "timestamp": "2025-12-27T10:00:00Z",
    "level": "INFO",
    "context": "ListingsService",
    "message": "Listing created successfully",
    "userId": "123",
    "listingId": "456",
    "ip": "192.168.1.1"
  }

Log Storage:
  - Application logs → PostgreSQL (system_logs table)
  - Access logs → Cloudflare analytics
  - Error logs → Sentry (future)
```

### Performance Monitoring

```
Metrics Tracked:
  - API response time (p50, p95, p99)
  - Database query time
  - WebSocket connection count
  - Cache hit ratio
  - Error rate
  - Active users

Monitoring Tools:
  - NestJS内置: Logger, LoggingInterceptor
  - Database: pg_stat_statements
  - Redis: INFO command
  - Frontend: Web Vitals (future)
```

### Health Checks

```
Endpoints:
  GET /health              # Application health
  GET /health/database     # Database connection
  GET /health/redis        # Redis connection
  GET /health/external     # External API status

Health Check Response:
  {
    "status": "ok",
    "timestamp": "2025-12-27T10:00:00Z",
    "services": {
      "database": "up",
      "redis": "up",
      "ml_service": "up"
    },
    "uptime": 1234567
  }
```

---

## Disaster Recovery

### Backup Strategy

```
Database Backups:
  - Daily automated backups at 2 AM UTC
  - Retention policy: 30 days
  - Off-site storage: Cloud provider S3
  - Point-in-time recovery enabled

Redis Backups:
  - RDB snapshots every 6 hours
  - AOF enabled for durability
  - Replication to secondary instance

File Storage:
  - Cloudinary (images) - redundant storage
  - S3/GCS (documents) - versioning enabled
```

### Recovery Procedures

```
1. Database Recovery:
   - Identify last good backup
   - Restore to staging environment
   - Verify data integrity
   - Switch traffic to recovered instance

2. Application Recovery:
   - Deploy latest stable version
   - Run database migrations
   - Clear all caches
   - Monitor health checks

3. Rollback Plan:
   - Keep previous deployment version
   - Database migration rollback scripts
   - DNS failover configuration
```

---

**Document Owners:** CarMarket Development Team
**Last Review:** 2025-12-27
**Next Review:** 2026-01-27
