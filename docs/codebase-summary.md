# Codebase Summary

**Last Updated:** 2025-12-27
**Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [Repository Structure](#repository-structure)
3. [Server Codebase (NestJS)](#server-codebase-nestjs)
4. [Client Codebase (React)](#client-codebase-react)
5. [Car Valuation Service (Python)](#car-valuation-service-python)
6. [Infrastructure & Configuration](#infrastructure--configuration)
7. [Key Patterns & Architecture](#key-patterns--architecture)
8. [API Endpoints Summary](#api-endpoints-summary)
9. [Database Schema](#database-schema)
10. [Development Workflow](#development-workflow)

---

## Overview

CarMarket is a monorepo-structured marketplace application with three main packages:

```
CarMarket/
├── packages/
│   ├── client/         # React 19 + TypeScript frontend
│   └── server/         # NestJS backend
├── car-valuation-service/  # Python FastAPI ML service
├── init-scripts/       # Database initialization
└── docs/              # Documentation
```

**Key Metrics:**
- **Server:** 24 NestJS modules, 38 TypeORM entities, ~160 REST endpoints
- **Client:** 168 TS files (~33K LOC), 28 page routes, 48+ components
- **ML Service:** 2 API endpoints, 4 ML models (31MB total)
- **Total Tech Stack:** React 19, NestJS 11, PostgreSQL 15, Redis 7, Socket.IO 4

---

## Repository Structure

### Root Level

```
CarMarket-master/
├── packages/
│   ├── client/           # Frontend application
│   └── server/           # Backend API
├── car-valuation-service/ # ML prediction service
├── init-scripts/         # SQL init scripts
├── docs/                 # Project documentation
├── plans/                # Development plans
├── .claude/              # Claude Code configuration
├── docker-compose.yml    # Database & Redis services
├── package.json          # Root package.json (workspaces)
├── README.md             # Project README
├── TESTING_GUIDE.md      # Testing instructions
├── vercel.json           # Vercel deployment config
└── ecosystem.config.js   # PM2 process management
```

---

## Server Codebase (NestJS)

### Directory Structure

```
packages/server/src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── app.controller.ts          # Root controller
├── app.service.ts             # Root service
├── common/                    # Shared utilities
│   ├── decorators/           # Custom decorators
│   ├── filters/              # Exception filters
│   ├── guards/               # Auth guards (8 guards)
│   ├── interceptors/         # Logging & audit interceptors (4)
│   ├── interfaces/           # TypeScript interfaces
│   └── pipes/                # Custom pipes
├── config/                    # Configuration files
│   ├── data-source.ts        # TypeORM data source
│   └── ...                   # Other configs
├── entities/                  # TypeORM entities (38)
│   ├── user.entity.ts
│   ├── listing.entity.ts
│   ├── car.entity.ts
│   ├── chat.entity.ts
│   ├── notification.entity.ts
│   └── ...                   # 33 more entities
├── modules/                   # Feature modules (24)
│   ├── admin/
│   ├── analytics/
│   ├── assistant/
│   ├── auth/
│   ├── chat/
│   ├── comments/
│   ├── favorites/
│   ├── geocoding/
│   ├── listings/
│   ├── logs/
│   ├── metadata/
│   ├── monitoring/
│   ├── notifications/
│   ├── payment/
│   ├── promotions/
│   ├── ratings/
│   ├── rbac/
│   ├── recommendations/
│   ├── redis/
│   ├── search/
│   ├── seller-verification/
│   ├── settings/
│   ├── users/
│   └── valuation/
├── migrations/                # Database migrations (10)
├── scripts/                   # Utility scripts
│   ├── import-car-data.ts
│   ├── regenerate-faq-embeddings.ts
│   ├── run-rbac-seed.ts
│   └── ...                   # More scripts
└── utils/                     # Helper functions
```

### Module Breakdown

#### 1. **admin** - Administration Dashboard
- Controllers: AdminController
- Services: AdminService
- Features: Dashboard stats, listing moderation, user management
- Guards: AdminGuard, PermissionGuard

#### 2. **analytics** - Analytics & Tracking
- Controllers: AnalyticsController
- Services: AnalyticsService
- Features: Event tracking, user behavior analytics
- Events: Page views, searches, clicks

#### 3. **assistant** - AI Chatbot (RAG)
- Controllers: AssistantController
- Services: AssistantService (ChromaDB + OpenAI integration)
- Features: FAQ Q&A, context-aware responses
- Tech: ChromaDB vector DB, OpenAI API

#### 4. **auth** - Authentication System
- Controllers: AuthController
- Services: AuthService
- Strategies: Local, JWT, Google OAuth, Facebook OAuth
- Features: Register, login, forgot password, OAuth callbacks
- Guards: JwtAuthGuard, LocalAuthGuard

#### 5. **chat** - Real-time Messaging
- Controllers: ChatController
- Services: ChatService
- Gateways: ChatGateway (Socket.IO)
- Features: Conversations, messages, read receipts
- Namespaces: /chat

#### 6. **comments** - Listing Comments
- Controllers: CommentsController
- Services: CommentsService
- Features: Create, read, update, delete comments
- Moderation: Report inappropriate content

#### 7. **favorites** - Wishlist System
- Controllers: FavoritesController
- Services: FavoritesService
- Features: Add/remove favorites, check status

#### 8. **geocoding** - Location Services
- Controllers: GeocodingController
- Services: GeocodingService
- Features: Address geocoding, distance calculation
- Integration: External geocoding APIs

#### 9. **listings** - Car Listings
- Controllers: ListingsController
- Services: ListingsService
- Features: CRUD operations, image upload, status management
- Status: Draft, Pending, Approved, Rejected, Sold

#### 10. **logs** - System Logging
- Controllers: LogsController
- Services: LogsService
- Features: Request/response logging, error tracking
- Interceptors: LoggingInterceptor

#### 11. **metadata** - Car Metadata
- Controllers: MetadataController
- Services: MetadataService
- Features: Makes, models, fuel types, body types
- Seed: Script to populate initial data

#### 12. **monitoring** - Health & Performance
- Controllers: MonitoringController
- Services: MonitoringService
- Features: Health checks, performance metrics

#### 13. **notifications** - Notification System
- Controllers: NotificationsController
- Services: NotificationsService
- Gateways: NotificationsGateway
- Features: Email (Nodemailer), Push (Firebase), In-app
- Channels: Email, FCM, WebSocket

#### 14. **payment** - Payment Integration
- Controllers: PaymentController
- Services: PaymentService
- Gateways: MoMo, VNPay, PayOS
- Features: Premium listings, transaction handling

#### 15. **promotions** - Listing Promotions
- Controllers: PromotionsController
- Services: PromotionsService
- Features: Featured listings, bump up, highlight

#### 16. **ratings** - User Ratings
- Controllers: RatingsController
- Services: RatingsService
- Features: Rate users, average ratings, review history

#### 17. **rbac** - Role-Based Access Control
- Controllers: RbacController
- Services: RbacService
- Entities: Role, Permission
- Features: Role assignment, permission checking
- Guards: PermissionGuard, RolesGuard

#### 18. **recommendations** - Recommendation Engine
- Controllers: RecommendationsController
- Services: RecommendationsService
- Features: Collaborative filtering, similar cars
- Algorithms: Content-based, user-based

#### 19. **redis** - Cache Management
- Services: RedisService
- Features: Caching, session storage, pub/sub
- Client: ioredis

#### 20. **search** - Advanced Search
- Controllers: SearchController
- Services: SearchService
- Features: Multi-criteria search, filtering, sorting
- Optimization: Query builder, pagination

#### 21. **seller-verification** - Seller Verification
- Controllers: SellerVerificationController
- Services: SellerVerificationService
- Features: Document upload, verification workflow
- Status: Pending, Approved, Rejected

#### 22. **settings** - User Settings
- Controllers: SettingsController
- Services: SettingsService
- Features: User preferences, notification settings

#### 23. **users** - User Management
- Controllers: UsersController
- Services: UsersService
- Features: Profile management, avatar upload, password change
- Entities: User, UserProfile

#### 24. **valuation** - Car Valuation
- Controllers: ValuationController
- Services: ValuationService
- Integration: Python ML service via HTTP
- Features: Price prediction, market data

### Entity Summary (38 Total)

**Core Entities:**
- User, UserProfile
- Listing, Car, CarImage
- Conversation, Message

**Metadata Entities:**
- Make, Model, FuelType, BodyType, TransmissionType, DriveType
- CarFeature, CarColor

**Engagement:**
- Favorite, Comment, Rating
- Notification, NotificationPreference

**RBAC:**
- Role, Permission, UserRole, RolePermission

**Commerce:**
- Promotion, Payment, PaymentTransaction
- SellerVerification

**Analytics:**
- AnalyticsEvent, SearchHistory, ListingView
- AuditLog, SystemLog

**Other:**
- Address, GeocodingCache
- Settings, AssistantContext

### Guards (8 Total)

1. **JwtAuthGuard** - JWT token validation
2. **LocalAuthGuard** - Local strategy authentication
3. **GoogleAuthGuard** - Google OAuth
4. **FacebookAuthGuard** - Facebook OAuth
5. **RolesGuard** - Role-based access
6. **PermissionsGuard** - Permission-based access
7. **AdminGuard** - Admin-only access
8. **ThrottlerGuard** - Rate limiting

### Interceptors (4 Total)

1. **LoggingInterceptor** - Request/response logging
2. **TransformInterceptor** - Response transformation
3. **TimeoutInterceptor** - Request timeout handling
4. **CacheInterceptor** - Response caching

---

## Client Codebase (React)

### Directory Structure

```
packages/client/src/
├── main.tsx                   # Application entry
├── App.tsx                    # Root component with routes
├── index.css                  # Global styles
├── App.css                    # App-specific styles
├── assets/                    # Static assets
├── components/                # React components (48+)
│   ├── ui/                   # Base UI components (12)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── Select.tsx
│   │   └── ...              # More UI components
│   ├── layout/               # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   └── Sidebar.tsx
│   ├── car/                  # Car-related components
│   │   ├── CarCard.tsx
│   │   ├── CarDetails.tsx
│   │   ├── CarForm.tsx
│   │   └── ...
│   ├── auth/                 # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── ...
│   └── ...                   # More feature components
├── pages/                     # Page components (28 routes)
│   ├── HomePage.tsx
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── SearchPage.tsx
│   ├── CarDetailsPage.tsx
│   ├── SellCarPage.tsx
│   ├── FavoritesPage.tsx
│   ├── ProfilePage.tsx
│   ├── ChatPage.tsx
│   ├── CarValuationPage.tsx
│   ├── dashboards/           # Dashboard pages (4)
│   │   ├── UserDashboard.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── EnhancedAdminDashboard.tsx
│   │   └── SellerDashboard.tsx
│   └── ...                   # More pages
├── services/                  # API services (26)
│   ├── api.ts                # Axios instance setup
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── listing.service.ts
│   ├── chat.service.ts
│   ├── notification.service.ts
│   ├── valuation.service.ts
│   └── ...                   # More services
├── contexts/                  # React contexts (3)
│   ├── SocketContext.tsx     # Socket.IO context
│   ├── NotificationContext.tsx
│   └── AssistantContext.tsx  # Chatbot context
├── store/                     # State management
│   └── auth.ts               # Zustand auth store
├── hooks/                     # Custom React hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   ├── useNotification.ts
│   └── ...
├── lib/                       # Library configurations
│   └── utils.ts              # Utility functions
├── types/                     # TypeScript types
│   ├── auth.types.ts
│   ├── listing.types.ts
│   ├── chat.types.ts
│   └── ...                   # More types
├── utils/                     # Utility functions
│   ├── format.ts
│   ├── validation.ts
│   └── ...                   # More utilities
├── config/                    # Configuration files
├── constants/                 # Constants
└── test/                      # Test files
```

### Page Routes (28 Total)

**Public Routes:**
- / - Home page
- /login - Login page
- /register - Registration page
- /search - Search listings
- /listings/:id - Car details
- /valuation - Car valuation tool
- /privacy - Privacy policy

**Protected Routes (User):**
- /profile - User profile
- /profile/:id - View other profiles
- /sell - Create listing
- /listings/edit/:id - Edit listing
- /favorites - Favorites list
- /chat - Chat interface
- /conversations - Conversations list
- /settings - User settings
- /notifications - Notifications
- /become-seller - Seller verification

**Protected Routes (Admin):**
- /admin - Admin dashboard
- /admin/enhanced - Enhanced admin dashboard
- /admin/logs - Log management

**Payment Routes:**
- /payment/:listingId - Payment page
- /payment/momo/callback - MoMo callback
- /payment/vnpay/callback - VNPay callback
- /payment/payos/callback - PayOS callback

**OAuth Routes:**
- /auth/callback/google - Google OAuth callback
- /auth/callback/facebook - Facebook OAuth callback

### Component Breakdown (48+ Components)

**Base UI Components (12):**
- Button, Input, Select, Textarea
- Modal, Dialog, Dropdown
- Tabs, Badge, Avatar
- Card, Loader, Toast

**Feature Components (36+):**
- CarCard, CarGrid, CarDetails
- SearchBar, SearchFilters
- LoginForm, RegisterForm
- ChatWindow, ConversationList
- NotificationItem, NotificationPanel
- RatingStars, CommentSection
- ListingForm, ImageUploader
- UserCard, UserProfile
- AdminStats, ListingModeration
- ValuationForm, ValuationResult

### API Services (26 Total)

```typescript
// Core Services
auth.service.ts          // Authentication
user.service.ts          // User management
listing.service.ts       // Car listings
search.service.ts        // Search functionality

// Engagement Services
favorite.service.ts      // Favorites
chat.service.ts          // Real-time chat
comment.service.ts       // Comments
rating.service.ts        // Ratings & reviews
notification.service.ts  // Notifications

// Metadata Services
metadata.service.ts      // Car metadata
geocoding.service.ts     // Location services

// Commercial Services
payment.service.ts       // Payments
promotion.service.ts     // Promotions
seller-verification.service.ts  // Seller verification

// Analytics Services
analytics.service.ts     // Analytics tracking
recommendation.service.ts // Recommendations

// AI Services
assistant.service.ts     // AI chatbot
valuation.service.ts     // Car valuation

// Admin Services
admin.service.ts         // Admin operations
rbac.service.ts          // RBAC management

// Settings Services
settings.service.ts      // User settings

// Other Services
image.service.ts         // Image handling
upload.service.ts        // File uploads
```

### State Management

**Zustand Store (auth.ts):**
```typescript
interface AuthState {
  user: User | null
  token: string | null
  permissions: string[]
  isAuthenticated: boolean

  // Actions
  login: (credentials) => Promise<void>
  register: (data) => Promise<void>
  logout: () => void
  updateUser: (user) => void
  setPermissions: (permissions) => void
}
```

**React Contexts:**
1. **SocketContext** - Socket.IO connection management
2. **NotificationContext** - Notification state and handlers
3. **AssistantContext** - Chatbot state and messages

### Routing Architecture

```typescript
// Route Protection Hierarchy
<App>
  <BrowserRouter>
    {/* Public Routes */}
    <Route element={<PublicRoute />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      ...
    </Route>

    {/* Protected Routes */}
    <Route element={<ProtectedRoute />}>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/sell" element={<SellCarPage />} />
      ...
    </Route>

    {/* Admin Routes */}
    <Route element={<AdminRoute />}>
      <Route path="/admin" element={<AdminDashboard />} />
      ...
    </Route>

    {/* Permission-based Routes */}
    <Route element={<PermissionRoute permission="listings.approve" />}>
      <Route path="/admin/moderation" element={<ModerationPage />} />
    </Route>
  </BrowserRouter>
</App>
```

### Key Patterns

**1. Permission Gates:**
```typescript
<PermissionGate permission="listings.create">
  <Button>Create Listing</Button>
</PermissionGate>
```

**2. Service Layer:**
```typescript
// Static service classes
export const ListingService = {
  async create(data: CreateListingDto) {
    return await api.post('/listings', data)
  },
  async update(id: string, data: UpdateListingDto) {
    return await api.patch(`/listings/${id}`, data)
  }
}
```

**3. Socket.IO Integration:**
```typescript
// 3 Namespaces
const chatSocket = io('/chat')
const commentSocket = io('/comments')
const notificationSocket = io('/notifications')
```

**4. Form Handling:**
```typescript
// React Hook Form + Zod
const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodValidation(listingSchema)
})
```

---

## Car Valuation Service (Python)

### Directory Structure

```
car-valuation-service/
├── app/
│   ├── main.py              # FastAPI application
│   ├── __init__.py
│   └── models/              # ML models (31MB)
│       ├── car_price_predictor.pkl      # Main model
│       ├── label_encoders.pkl           # Encoders
│       ├── feature_columns.pkl          # Features
│       └── model_metrics.pkl            # Metrics
├── scripts/
│   ├── train_model.py      # Model training
│   ├── retrain_model.py    # Multi-model comparison
│   ├── scrape_bonbanh.py   # Web scraper 1
│   ├── scrape_oto.py       # Web scraper 2
│   ├── scrape_toyota_bonbanh.py
│   └── scrape_toyota_chotot.py
├── data/                    # Scraped data storage
├── requirements.txt         # Python dependencies
├── Dockerfile               # Docker configuration
└── README.md                # Service documentation
```

### API Endpoints

```python
# 1. Health Check
GET /health
Response: { "status": "ok", "service": "car-valuation-service" }

# 2. Price Prediction
POST /predict
Request: {
  "brand": "Toyota",
  "model": "Camry",
  "year": 2020,
  "mileage": 50000,
  "version": "2.5G",  # Optional
  "color": "White"    # Optional
}
Response: {
  "estimated_price": 850,  # million VND
  "price_range": {
    "min": 800,
    "max": 900
  },
  "confidence": 0.85,
  "currency": "VND",
  "unit": "million"
}
```

### ML Models

**Algorithms Tested:**
- Ridge Regression
- Random Forest
- Gradient Boosting
- XGBoost

**Features:**
- Brand (categorical, encoded)
- Model (categorical, encoded)
- Year (numeric)
- Mileage (numeric)
- Version (categorical, optional)
- Color (categorical, optional)

**Model Performance:**
- R² Score: ~0.85
- MAE: ~50 million VND
- Training data: 10,000+ listings

**Data Sources:**
- BonBanh.com
- Oto.com.vn
- ChoTot.com

---

## Infrastructure & Configuration

### Docker Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: pgvector/pgvector:pg15
    ports: 5433:5432
    environment:
      POSTGRES_DB: carmarket
      POSTGRES_USER: carmarket_user
      POSTGRES_PASSWORD: carmarket_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d

  redis:
    image: redis:7-alpine
    ports: 6379:6379
    volumes:
      - redis_data:/data
```

### Environment Variables

**Server (.env):**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=carmarket_user
DATABASE_PASSWORD=carmarket_password
DATABASE_NAME=carmarket
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
PORT=3000

# OAuth
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx@gmail.com
SMTP_PASSWORD=xxx

# Firebase
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx

# OpenAI
OPENAI_API_KEY=xxx

# Valuation Service
VALUATION_SERVICE_URL=http://localhost:8000

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

---

## Key Patterns & Architecture

### 1. Monorepo Architecture

```
root/
├── packages/
│   ├── client/  (Vite + React)
│   └── server/  (NestJS)
├── package.json (workspaces)
└── docker-compose.yml
```

**Benefits:**
- Shared TypeScript types
- Unified development workflow
- Simplified dependency management
- Code sharing capabilities

### 2. Modular Architecture (Server)

**NestJS Module Pattern:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [Controller],
  providers: [Service, Guard],
  exports: [Service]
})
export class FeatureModule {}
```

**Dependency Injection:**
- Constructor injection
- Service layer separation
- Interceptor chains
- Guard composition

### 3. Layered Architecture

```
┌─────────────────────┐
│   Controllers       │  (Route handling)
├─────────────────────┤
│   Services          │  (Business logic)
├─────────────────────┤
│   Repositories      │  (Data access - TypeORM)
├─────────────────────┤
│   Database          │  (PostgreSQL)
└─────────────────────┘
```

### 4. Real-time Architecture

```
Client (Socket.IO Client)
    ↓
Gateway (Socket.IO Gateway)
    ↓
Service (Business Logic)
    ↓
Repository (Data Persistence)
    ↓
WebSocket Events (to all clients)
```

**Namespaces:**
- `/chat` - Messaging
- `/comments` - Listing comments
- `/notifications` - Push notifications

### 5. Authentication Flow

```
┌─────────────┐
│   Login     │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│ LocalStrategy   │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│ Validate User   │
└──────┬──────────┘
       │
       ↓
┌─────────────────┐
│  JWT Service    │ → Generate Token
└─────────────────┘
       │
       ↓
┌─────────────────┐
│  Response + JWT │
└─────────────────┘
```

**Token Structure:**
```typescript
{
  sub: user.id,
  email: user.email,
  roles: ['user', 'seller'],
  permissions: ['listings.create', 'listings.update'],
  iat: timestamp,
  exp: timestamp + 7d
}
```

### 6. RBAC Implementation

```
User
  ↓ (many-to-many)
Role
  ↓ (many-to-many)
Permission
```

**Permission Checking:**
```typescript
@UseGuards(PermissionGuard)
@RequirePermissions('listings.create')
async createListing() { }
```

### 7. Caching Strategy

```
Request → Redis Cache → Hit? → Return
                    ↓ Miss
                 Database → Cache → Return
```

**Cached Data:**
- Car metadata (makes, models)
- Search results (5min TTL)
- User sessions
- API rate limiting

### 8. WebSocket Event Flow

```
Client Event → Gateway → Service → Repository
                                    ↓
                             Database Operation
                                    ↓
                             Server Event → All Clients
```

**Example - Chat:**
```typescript
// Client sends
socket.emit('sendMessage', { conversationId, content })

// Gateway processes
@SubscribeMessage('sendMessage')
async handleMessage(client, data) {
  // Save to DB
  await this.messagesService.create(data)

  // Broadcast to room
  this.server.to(conversationId).emit('newMessage', message)
}
```

---

## API Endpoints Summary

### Authentication (6 endpoints)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/google
GET    /api/auth/facebook
GET    /api/auth/callback/google
GET    /api/auth/callback/facebook
POST   /api/auth/refresh-token
```

### Users (8 endpoints)

```
GET    /api/users/profile
PUT    /api/users/profile
POST   /api/users/upload-avatar
POST   /api/users/change-password
GET    /api/users/:id
PUT    /api/users/:id
DELETE /api/users/:id
GET    /api/users/:id/listings
```

### Listings (10 endpoints)

```
GET    /api/listings
GET    /api/listings/:id
POST   /api/listings
PATCH  /api/listings/:id
DELETE /api/listings/:id
POST   /api/listings/upload-images
GET    /api/listings/:id/images
DELETE /api/listings/:id/images/:imageId
GET    /api/listings/user/:userId
PATCH  /api/listings/:id/status
```

### Search (4 endpoints)

```
GET    /api/search
GET    /api/search/suggestions
GET    /api/search/similar/:listingId
POST   /api/search/save
```

### Favorites (4 endpoints)

```
POST   /api/favorites/:listingId
DELETE /api/favorites/:listingId
GET    /api/favorites
GET    /api/favorites/check/:listingId
```

### Chat (8 endpoints + WebSocket)

```
POST   /api/chat/start/:listingId
GET    /api/chat
GET    /api/chat/:conversationId
POST   /api/chat/:conversationId/messages
POST   /api/chat/:conversationId/read
DELETE /api/chat/:conversationId
GET    /api/chat/:conversationId/messages

WebSocket Events:
- sendMessage
- receiveMessage
- markAsRead
- typingIndicator
```

### Comments (5 endpoints)

```
GET    /api/comments/listing/:listingId
POST   /api/comments
PATCH  /api/comments/:id
DELETE /api/comments/:id
POST   /api/comments/:id/report
```

### Ratings (4 endpoints)

```
POST   /api/ratings
GET    /api/ratings/user/:userId
GET    /api/ratings/listing/:listingId
PUT    /api/ratings/:id
```

### Notifications (6 endpoints + WebSocket)

```
GET    /api/notifications
POST   /api/notifications/mark-all-read
PATCH  /api/notifications/:id/read
DELETE /api/notifications/:id
GET    /api/notifications/preferences
PUT    /api/notifications/preferences

WebSocket Events:
- notification
- markAsRead
```

### Metadata (8 endpoints)

```
GET    /api/metadata/all
GET    /api/metadata/makes
GET    /api/metadata/makes/:id/models
GET    /api/metadata/fuel-types
GET    /api/metadata/body-types
GET    /api/metadata/transmissions
GET    /api/metadata/features
POST   /api/metadata/seed (Admin)
```

### Payment (7 endpoints)

```
POST   /api/payment/create/:listingId
GET    /api/payment/status/:transactionId
POST   /api/payment/momo/callback
POST   /api/payment/vnpay/callback
POST   /api/payment/payos/callback
GET    /api/payment/history
GET    /api/payment/packages
```

### Valuation (2 endpoints)

```
POST   /api/valuation/predict
GET    /api/valuation/history
```

### Admin (15 endpoints)

```
GET    /api/admin/dashboard/stats
GET    /api/admin/dashboard/charts
GET    /api/admin/users
GET    /api/admin/listings/pending
PATCH  /api/admin/listings/:id/approve
PATCH  /api/admin/listings/:id/reject
GET    /api/admin/logs
GET    /api/admin/analytics
GET    /api/admin/settings
PUT    /api/admin/settings
```

### RBAC (6 endpoints)

```
GET    /api/rbac/roles
POST   /api/rbac/roles
GET    /api/rbac/permissions
POST   /api/rbac/permissions
POST   /api/rbac/assign-role
POST   /api/rbac/check-permission
```

**Total REST Endpoints:** ~160
**WebSocket Events:** 15+ (across 3 namespaces)

---

## Database Schema

### Core Tables

```sql
-- Users & Authentication
users                  -- User accounts
user_profiles          -- Extended profile data
roles                  -- System roles
permissions            -- System permissions
user_roles            -- User-role mapping
role_permissions      -- Role-permission mapping

-- Listings
listings              -- Car listings
cars                  -- Car details
car_images            -- Listing images
listing_views         -- View tracking

-- Metadata
makes                 -- Car manufacturers
models                -- Car models
fuel_types            -- Fuel type enum
body_types            -- Body type enum
transmission_types    -- Transmission enum
drive_types           -- Drive type enum
car_features          -- Available features
car_colors            -- Available colors

-- Engagement
favorites             -- User favorites
comments              -- Listing comments
ratings               -- User ratings
conversations         -- Chat conversations
messages              -- Chat messages

-- Notifications
notifications         -- Notification records
notification_preferences -- User notification settings

-- Commerce
promotions            -- Listing promotions
payments              -- Payment transactions
seller_verifications  -- Seller verification requests

-- Analytics
analytics_events      -- Event tracking
search_history        -- Search history
audit_logs           -- Audit trail
system_logs          -- System logs

-- Settings & Other
settings              -- App settings
addresses            -- Location data
geocoding_cache      -- Cached geocoding results
assistant_contexts   -- Chatbot context
```

### Key Relationships

```
User (1) ──────── (N) Listings
User (1) ──────── (N) Favorites
User (1) ──────── (N) Conversations
User (1) ──────── (N) Ratings

Listing (1) ──── (N) CarImages
Listing (1) ──── (1) Car
Listing (1) ──── (N) Comments
Listing (1) ──── (N) Favorites
Listing (1) ──── (N) ListingViews

Conversation (1) ─ (N) Messages
User (1) ──────── (N) Conversations (as buyer/seller)

Car (N) ───────── (1) Make
Car (N) ───────── (1) Model
```

---

## Development Workflow

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start databases
npm run db:up

# 3. Setup environment files
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env

# 4. Run migrations
npm run migration

# 5. Seed initial data
npm run seed:rbac
curl -X POST http://localhost:3000/api/metadata/seed

# 6. Start development
npm run dev  # Both client and server
```

### Testing

```bash
# Server tests
cd packages/server
npm run test           # Unit tests
npm run test:e2e      # End-to-end tests
npm run test:cov      # Coverage report

# Client tests
cd packages/client
npm run test          # Vitest tests
npm run test:coverage # Coverage report
```

### Building for Production

```bash
# Build both packages
npm run build

# Output:
# - packages/client/dist/
# - packages/server/dist/
```

### Deployment

```bash
# Deploy to Vercel (Frontend)
vercel --prod

# Deploy to Railway/Heroku (Backend)
git push heroku main

# Or use PM2
pm2 start ecosystem.config.js
```

---

## Code Statistics

### Server (NestJS)
- **Modules:** 24
- **Controllers:** 40+
- **Services:** 40+
- **Entities:** 38
- **Guards:** 8
- **Interceptors:** 4
- **Pipes:** 6
- **DTOs:** 100+
- **REST Endpoints:** ~160
- **WebSocket Events:** 15+
- **Migrations:** 10

### Client (React)
- **TypeScript Files:** 168
- **Lines of Code:** ~33,000
- **Components:** 48+
- **Pages:** 28
- **Services:** 26
- **Contexts:** 3
- **Stores:** 1 (Zustand)
- **Custom Hooks:** 15+
- **Type Definitions:** 40+

### ML Service (Python)
- **API Endpoints:** 2
- **ML Models:** 4
- **Model Size:** 31MB
- **Scraping Scripts:** 4
- **Training Scripts:** 2

---

## Dependencies Summary

### Server Key Dependencies
```json
{
  "@nestjs/core": "^11.0.1",
  "@nestjs/typeorm": "^11.0.0",
  "@nestjs/jwt": "^11.0.0",
  "@nestjs/passport": "^11.0.5",
  "@nestjs/platform-socket.io": "^11.1.6",
  "@nestjs/config": "^4.0.2",
  "typeorm": "^0.3.26",
  "passport": "^0.7.0",
  "socket.io": "^4.8.1",
  "ioredis": "^5.8.2",
  "openai": "^6.5.0",
  "nodemailer": "^6.9.16",
  "firebase-admin": "^13.5.0"
}
```

### Client Key Dependencies
```json
{
  "react": "^19.1.1",
  "react-router-dom": "^7.8.2",
  "axios": "^1.11.0",
  "socket.io-client": "^4.8.1",
  "zustand": "^5.0.8",
  "react-hook-form": "^7.62.0",
  "zod": "^4.1.5",
  "tailwindcss": "^4.1.12",
  "@dnd-kit/core": "^6.3.1",
  "recharts": "^3.5.0"
}
```

---

**Document Owners:** CarMarket Development Team
**Last Review:** 2025-12-27
**Next Review:** 2026-01-27
