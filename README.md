# CarMarket - Used Car Marketplace Platform

A modern full-stack marketplace for buying and selling used cars in Vietnam with AI-powered valuations and real-time communication.

## Quick Start

```bash
# Install dependencies
npm install

# Start databases (PostgreSQL + Redis)
npm run db:up

# Setup environment files
cp packages/server/.env.example packages/server/.env
cp packages/client/.env.example packages/client/.env

# Run migrations & seed data
npm run migration:run
npm run seed:rbac

# Start development servers
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- API Docs: http://localhost:3000/api/docs

## Tech Stack

**Frontend:** React 19 + TypeScript + Tailwind CSS v4 + Vite
**Backend:** NestJS + TypeScript + PostgreSQL + Redis + Socket.IO
**ML Service:** Python FastAPI + scikit-learn

## Documentation

Comprehensive documentation is available in the `/docs` directory:

| Document | Description |
|----------|-------------|
| [Project Overview & PDR](./docs/project-overview-pdr.md) | Product vision, features, requirements |
| [Codebase Summary](./docs/codebase-summary.md) | Architecture overview, modules, APIs |
| [Code Standards](./docs/code-standards.md) | TypeScript, React, NestJS conventions |
| [System Architecture](./docs/system-architecture.md) | Security, scalability, deployment |

## Key Features

- **Authentication:** Email/password, Google OAuth, Facebook OAuth
- **Car Listings:** Create, edit, search with advanced filters
- **Real-time Chat:** Socket.IO messaging between buyers/sellers
- **AI Valuation:** ML-based price predictions (Ridge Regression, XGBoost)
- **AI Assistant:** RAG-based chatbot (ChromaDB + OpenAI)
- **Payment Integration:** MoMo, VNPay, PayOS
- **Admin Dashboard:** User management, listing moderation, analytics
- **Notifications:** Email + Push (Firebase)
- **RBAC:** Role-based access control with granular permissions

## Available Commands

```bash
# Development
npm run dev              # Start both client & server
npm run client           # Start frontend only
npm run server           # Start backend only

# Database
npm run db:up            # Start PostgreSQL & Redis
npm run db:down          # Stop databases
npm run migration:run    # Run database migrations

# Testing
npm run test             # Run all tests
npm run test:coverage    # Run tests with coverage

# Building
npm run build            # Build for production
```

## Project Structure

```
CarMarket/
├── packages/
│   ├── client/          # React frontend
│   └── server/          # NestJS backend
├── car-valuation-service/  # Python ML service
├── docs/                # Documentation
├── init-scripts/        # Database initialization
└── docker-compose.yml   # Database services
```

## Environment Variables

**Server (.env):**
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=carmarket_user
DATABASE_PASSWORD=carmarket_password
DATABASE_NAME=carmarket
JWT_SECRET=your-secret-key
PORT=3000

# OAuth (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx@gmail.com
SMTP_PASSWORD=xxx
```

**Client (.env):**
```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/facebook` - Facebook OAuth

### Listings
- `GET /api/listings` - Get all listings (paginated)
- `GET /api/listings/:id` - Get listing details
- `POST /api/listings` - Create listing (auth required)
- `PATCH /api/listings/:id` - Update listing
- `DELETE /api/listings/:id` - Delete listing

### Search
- `GET /api/search` - Advanced search with filters

### Chat (WebSocket)
- Namespace: `/chat`
- Events: `sendMessage`, `receiveMessage`, `markAsRead`

See [API Documentation](http://localhost:3000/api/docs) for complete endpoint reference.

## Development Workflow

1. **Branch Naming:** `feature/feature-name`, `fix/bug-name`
2. **Commit Format:** `feat(scope): description`, `fix(scope): description`
3. **Code Review:** Required for all PRs
4. **Testing:** Unit tests (80%+ coverage), integration tests

Refer to [Code Standards](./docs/code-standards.md) for detailed conventions.

## Deployment

**Frontend (Vercel):**
```bash
vercel --prod
```

**Backend (Railway/Heroku):**
```bash
git push heroku main
```

See [Deployment Guide](./docs/system-architecture.md#deployment-architecture) for details.

## Support & Contributing

- Report issues via GitHub Issues
- Follow [Code Standards](./docs/code-standards.md) for contributions
- See [Project Overview](./docs/project-overview-pdr.md) for roadmap

## License

MIT

---

**Last Updated:** 2025-12-27 | **Version:** 1.0.0
