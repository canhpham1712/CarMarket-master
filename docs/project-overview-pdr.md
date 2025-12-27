# Project Overview & Product Development Requirements (PDR)

**Last Updated:** 2025-12-27
**Version:** 1.0.0
**Status:** Active Development

## Table of Contents

1. [Project Overview](#project-overview)
2. [Product Vision](#product-vision)
3. [Target Market](#target-market)
4. [Core Features](#core-features)
5. [Product Development Requirements](#product-development-requirements)
6. [Technical Constraints](#technical-constraints)
7. [Success Metrics](#success-metrics)
8. [Future Roadmap](#future-roadmap)

---

## Project Overview

**CarMarket** is a modern full-stack marketplace platform for buying and selling used cars in Vietnam. The platform provides a comprehensive solution connecting car buyers and sellers with advanced features like AI-powered valuations, real-time chat, and intelligent recommendations.

### Key Value Propositions

- **Trust & Transparency:** Seller verification system and user ratings
- **Intelligent Matching:** AI-powered car recommendations and price predictions
- **Real-time Engagement:** Instant messaging and live notifications
- **User Experience:** Modern, responsive UI with advanced search capabilities
- **Data-Driven:** ML-based car valuation using market data from multiple sources

### Tech Stack Summary

```
Frontend:  React 19 + TypeScript + Tailwind CSS v4 + Vite
Backend:   NestJS + TypeScript + PostgreSQL + Redis + Socket.IO
ML Service: Python FastAPI + scikit-learn
Database:  PostgreSQL 15 (with pgvector) + Redis 7
Auth:      JWT + OAuth (Google, Facebook)
```

---

## Product Vision

To become Vietnam's leading trusted marketplace for used cars, providing buyers with confidence and sellers with powerful tools to reach their audience.

### Mission Statement

Building a transparent, intelligent, and user-friendly platform that transforms how Vietnamese people buy and sell used cars.

---

## Target Market

### Primary Users

1. **Car Buyers (Individuals)**
   - Age: 25-45 years old
   - Looking for reliable used cars
   - Need price guidance and vehicle history
   - Value trust and verification

2. **Car Sellers (Individuals & Dealers)**
   - Individual owners selling personal vehicles
   - Professional car dealerships
   - Need exposure to potential buyers
   - Want tools to manage listings efficiently

3. **Administrators**
   - Platform moderators
   - Customer support team
   - Analytics and operations team

### Market Context

- Vietnam's growing used car market
- Increasing demand for transparency in pricing
- Need for trusted platforms over social media marketplaces
- Mobile-first user behavior

---

## Core Features

### 1. Authentication & Authorization

**Status:** ✅ Implemented

- Multi-channel authentication (Email/Password, Google OAuth, Facebook OAuth)
- Role-Based Access Control (RBAC) with granular permissions
- JWT token management with refresh tokens
- Password reset and email verification

**Key Requirements:**
- Secure password hashing (bcrypt)
- OAuth 2.0 integration
- Session management via Redis
- Email verification workflows

### 2. Car Listings Management

**Status:** ✅ Implemented

- Create, edit, delete car listings
- Multi-image upload with cloud storage
- Rich car metadata (make, model, year, mileage, condition, etc.)
- Listing status workflow (draft, pending, approved, rejected, sold)
- Admin approval system

**Key Requirements:**
- Support for 10+ images per listing
- Image validation and compression
- Detailed car specifications
- Location-based listings
- Seller contact information management

### 3. Advanced Search & Filtering

**Status:** ✅ Implemented

- Multi-criteria search (make, model, price range, year, mileage)
- Advanced filters (fuel type, body type, transmission, condition)
- Location-based search with radius
- Sorting options (price, date, mileage)
- Saved search preferences

**Key Requirements:**
- Sub-second search response times
- Faceted search navigation
- Search result caching (Redis)
- Pagination and infinite scroll options

### 4. Favorites System

**Status:** ✅ Implemented

- Save listings to favorites
- Organize favorites into collections
- Quick access from dashboard
- Price drop notifications on favorited items

### 5. Real-time Chat System

**Status:** ✅ Implemented

- Buyer-seller messaging via Socket.IO
- Conversation management
- Read/unread status tracking
- Push notifications for new messages
- File/image sharing in chats

**Key Requirements:**
- WebSocket connection management
- Message persistence in PostgreSQL
- Real-time notifications
- Chat history archiving

### 6. Comments & Reviews

**Status:** ✅ Implemented

- Public comments on listings
- Seller ratings and reviews
- Report inappropriate content
- Moderation tools for admins

### 7. Notifications System

**Status:** ✅ Implemented

- Email notifications (transactional alerts)
- In-app push notifications
- Notification preferences management
- Notification history
- Multi-channel delivery (email + push)

**Key Requirements:**
- Email service integration (Nodemailer)
- Firebase Cloud Messaging (FCM) for push
- Notification queue processing
- User-specific preferences

### 8. AI-Powered Car Valuation

**Status:** ✅ Implemented

- ML-based price prediction (Ridge Regression, RandomForest, XGBoost)
- Market data from BonBanh, Oto.com.vn, ChoTot
- Price range estimation with confidence levels
- Integration with chatbot for natural language queries

**Key Requirements:**
- Model training pipeline
- Feature engineering (brand, model, year, mileage, version)
- Model performance metrics tracking
- Regular retraining with new data

### 9. AI Assistant (Chatbot)

**Status:** ✅ Implemented

- RAG-based Q&A system using ChromaDB + OpenAI
- FAQ database with embeddings
- Natural language query understanding
- Context-aware responses

**Key Requirements:**
- Vector database for semantic search
- OpenAI API integration
- Context window management
- Response accuracy metrics

### 10. Recommendations Engine

**Status:** ✅ Implemented

- Personalized car recommendations
- Collaborative filtering
- Content-based filtering
- "Similar cars" suggestions

### 11. Geolocation Services

**Status:** ✅ Implemented

- Address geocoding
- Location-based search
- Distance calculation
- Map integration (Leaflet)

### 12. Seller Verification

**Status:** ✅ Implemented

- Identity verification workflow
- Document upload
- Admin approval process
- Verified seller badges

### 13. Payment Integration

**Status:** ✅ Implemented

- Multiple payment gateways (MoMo, VNPay, PayOS)
- Premium listing promotions
- Payment callbacks handling
- Transaction history

### 14. Admin Dashboard

**Status:** ✅ Implemented

- Platform statistics and analytics
- User management
- Listing moderation
- Metadata management
- System logs viewer
- Performance monitoring

### 15. Analytics & Monitoring

**Status:** ✅ Implemented

- User behavior tracking
- Listing analytics
- Search analytics
- Performance metrics
- Custom event tracking

---

## Product Development Requirements

### Functional Requirements

#### FR-1: User Management

- **FR-1.1:** Users must be able to register with email/password
- **FR-1.2:** Users must be able to login via Google OAuth
- **FR-1.3:** Users must be able to login via Facebook OAuth
- **FR-1.4:** Users must be able to reset passwords via email
- **FR-1.5:** Users must be able to update profile information
- **FR-1.6:** Users must be able to upload profile avatars
- **FR-1.7:** Admin users must be able to manage other users
- **FR-1.8:** System must enforce role-based permissions

#### FR-2: Car Listings

- **FR-2.1:** Users must be able to create car listings with detailed information
- **FR-2.2:** Users must be able to upload up to 10 images per listing
- **FR-2.3:** Users must be able to edit their own listings
- **FR-2.4:** Users must be able to delete their own listings
- **FR-2.5:** Listings must include: make, model, year, mileage, price, location, description
- **FR-2.6:** Listings must support optional fields: color, version, VIN, condition
- **FR-2.7:** Admins must be able to approve/reject listings
- **FR-2.8:** System must track listing status (draft, pending, approved, rejected, sold)
- **FR-2.9:** System must notify sellers of status changes

#### FR-3: Search & Discovery

- **FR-3.1:** Users must be able to search listings by keyword
- **FR-3.2:** Users must be able to filter by make, model, price range, year
- **FR-3.3:** Users must be able to filter by fuel type, body type, transmission
- **FR-3.4:** Users must be able to sort results by price, date, mileage
- **FR-3.5:** Search must return results within 1 second
- **FR-3.6:** Users must be able to save listings to favorites
- **FR-3.7:** Users must be able to view similar cars

#### FR-4: Communication

- **FR-4.1:** Buyers must be able to start conversations with sellers
- **FR-4.2:** Messages must be delivered in real-time
- **FR-4.3:** Users must be able to send text messages
- **FR-4.4:** Users must be able to send images in messages
- **FR-4.5:** Users must receive push notifications for new messages
- **FR-4.6:** Users must be able to mark conversations as read
- **FR-4.7:** Users must be able to view chat history

#### FR-5: Valuation

- **FR-5.1:** Users must be able to get estimated car prices
- **FR-5.2:** Valuation must accept: brand, model, year, mileage
- **FR-5.3:** Valuation must return: estimated price, min/max range, confidence
- **FR-5.4:** Valuation must be based on current market data
- **FR-5.5:** System must support natural language valuation queries via chatbot

#### FR-6: Payments

- **FR-6.1:** Users must be able to pay for premium listings
- **FR-6.2:** System must support MoMo payment gateway
- **FR-6.3:** System must support VNPay payment gateway
- **FR-6.4:** System must support PayOS payment gateway
- **FR-6.5:** System must handle payment callbacks securely
- **FR-6.6:** Users must receive payment confirmations

### Non-Functional Requirements

#### NFR-1: Performance

- **NFR-1.1:** API response time must be < 200ms for 95% of requests
- **NFR-1.2:** Page load time must be < 2 seconds
- **NFR-1.3:** Search queries must complete within 1 second
- **NFR-1.4:** System must support 10,000 concurrent users
- **NFR-1.5:** WebSocket latency must be < 100ms

#### NFR-2: Scalability

- **NFR-2.1:** System must support horizontal scaling
- **NFR-2.2:** Database must support read replicas
- **NFR-2.3:** Static assets must be served via CDN
- **NFR-2.4:** System must handle 100,000+ listings
- **NFR-2.5:** System must handle 1M+ page views per month

#### NFR-3: Security

- **NFR-3.1:** All passwords must be hashed using bcrypt
- **NFR-3.2:** All API endpoints must be protected against SQL injection
- **NFR-3.3:** All API endpoints must implement rate limiting
- **NFR-3.4:** JWT tokens must expire after 7 days
- **NFR-3.5:** Sensitive data must be encrypted at rest
- **NFR-3.6:** System must implement CORS policies
- **NFR-3.7:** System must sanitize all user inputs
- **NFR-3.8:** File uploads must be validated for type and size

#### NFR-4: Availability

- **NFR-4.1:** System uptime must be 99.5% or higher
- **NFR-4.2:** Database must have daily backups
- **NFR-4.3:** System must implement graceful degradation
- **NFR-4.4:** Critical services must have health checks

#### NFR-5: Usability

- **NFR-5.1:** UI must be responsive on mobile, tablet, and desktop
- **NFR-5.2:** UI must support Vietnamese language
- **NFR-5.3:** Forms must provide real-time validation
- **NFR-5.4:** Error messages must be clear and actionable
- **NFR-5.5:** Loading states must be indicated

#### NFR-6: Maintainability

- **NFR-6.1:** Code must follow TypeScript best practices
- **NFR-6.2:** All modules must have unit tests (target: 80% coverage)
- **NFR-6.3:** API must have OpenAPI/Swagger documentation
- **NFR-6.4:** Code must be formatted with Prettier/ESLint
- **NFR-6.5:** Git commits must follow conventional commits

---

## Technical Constraints

### Infrastructure

- **Database:** PostgreSQL 15 with pgvector extension
- **Cache:** Redis 7 for session management and caching
- **Hosting:** Support deployment to Vercel (frontend) and Railway/Heroku (backend)
- **File Storage:** Cloud-based storage for images (Cloudinary, AWS S3, or similar)

### Technology Limitations

- **Frontend:** Must use React 19, TypeScript, Tailwind CSS v4
- **Backend:** Must use NestJS framework
- **ML Service:** Must use Python FastAPI
- **Authentication:** Must use JWT with Passport.js
- **Real-time:** Must use Socket.IO

### Compliance & Legal

- **GDPR/Privacy:** User data protection and right to deletion
- **Terms of Service:** Clear user agreements
- **Content Moderation:** Tools for managing inappropriate content

---

## Success Metrics

### User Acquisition

- **MAU (Monthly Active Users):** Target 5,000+ by month 6
- **Registration Rate:** Target 15% conversion from visitor to registered user
- **User Retention:** Target 40% return rate within 30 days

### Engagement

- **Listings Created:** Target 1,000+ listings per month
- **Search Queries:** Target 10,000+ searches per month
- **Chat Messages:** Target 5,000+ messages per month
- **Avg Session Duration:** Target 5+ minutes

### Business

- **Premium Listings:** Target 10% of paid listings
- **Seller Verification:** Target 20% of active sellers verified
- **User Satisfaction:** Target 4.0/5.0 average rating

### Technical

- **API Response Time:** Maintain < 200ms p95
- **Error Rate:** Maintain < 0.5% error rate
- **Uptime:** Maintain 99.5%+ availability

---

## Future Roadmap

### Phase 2: Enhanced Features (Q2 2025)

- [ ] Vehicle history reports (VIN integration)
- [ ] Advanced analytics for sellers
- [ ] Price trend charts
- [ ] Comparison tool
- [ ] Mobile apps (iOS/Android)
- [ ] Video listings support
- [ ] Virtual tours (360° photos)

### Phase 3: Marketplace Expansion (Q3 2025)

- [ ] Dealer accounts with premium features
- [ ] Auction system
- [ ] Financing calculator
- [ ] Insurance integration
- [ ] Test drive scheduling
- [ ] Escrow payment protection

### Phase 4: AI & Automation (Q4 2025)

- [ ] Automated price recommendations
- [ ] Image recognition for car damage detection
- [ ] Fraud detection system
- [ ] Chatbot improvements with fine-tuned models
- [ ] Predictive analytics for market trends

### Phase 5: Ecosystem (2026)

- [ ] Car servicing integration
- [ ] Spare parts marketplace
- [ ] Car rental integration
- [ ] Community features (forums, groups)
- [ ] API for third-party integrations

---

## Appendix

### Glossary

- **Listing:** A car advertisement created by a seller
- **Make:** Car manufacturer (e.g., Toyota, Honda)
- **Model:** Specific car model (e.g., Camry, Civic)
- **Version:** Trim level or variant (e.g., 2.0E, 2.5G)
- **RBAC:** Role-Based Access Control
- **RAG:** Retrieval-Augmented Generation (AI technique)
- **ML:** Machine Learning

### References

- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeORM Documentation](https://typeorm.io/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

---

**Document Owners:** CarMarket Development Team
**Review Cycle:** Monthly
**Next Review:** 2025-01-27
