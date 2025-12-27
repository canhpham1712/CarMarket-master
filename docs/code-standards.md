# Code Standards & Conventions

**Last Updated:** 2025-12-27
**Version:** 1.0.0

## Table of Contents

1. [Overview](#overview)
2. [TypeScript Standards](#typescript-standards)
3. [NestJS Backend Standards](#nestjs-backend-standards)
4. [React Frontend Standards](#react-frontend-standards)
5. [Python ML Service Standards](#python-ml-service-standards)
6. [Database Standards](#database-standards)
7. [API Design Standards](#api-design-standards)
8. [Testing Standards](#testing-standards)
9. [Git Workflow](#git-workflow)
10. [Documentation Standards](#documentation-standards)

---

## Overview

This document defines the coding standards and conventions for the CarMarket project. All developers MUST follow these standards to ensure code consistency, maintainability, and quality.

### Core Principles

1. **YAGNI** (You Aren't Gonna Need It) - Implement only what's needed
2. **KISS** (Keep It Simple, Stupid) - Write simple, readable code
3. **DRY** (Don't Repeat Yourself) - Avoid code duplication
4. **SOLID** - Follow SOLID principles for class design
5. **Clean Code** - Write self-documenting code with meaningful names

### Tooling

```json
{
  "linter": "ESLint",
  "formatter": "Prettier",
  "typeChecker": "TypeScript",
  "styleLinter": "stylelint",
  "testRunner": "Jest (Backend), Vitest (Frontend)"
}
```

---

## TypeScript Standards

### Naming Conventions

```typescript
// ✅ GOOD: Clear, descriptive names
interface UserProfile { }
class UserService { }
const MAX_RETRY_COUNT = 3;
function getUserById() { }

// ❌ BAD: Abbreviations, unclear names
interface UsrProf { }
class UsrSvc { }
const max_r = 3;
function get() { }
```

**Rules:**
- **Interfaces:** PascalCase (e.g., `UserProfile`, `CreateListingDto`)
- **Classes:** PascalCase (e.g., `UserService`, `AuthService`)
- **Functions/Methods:** camelCase (e.g., `getUserById`, `createListing`)
- **Variables:** camelCase (e.g., `userName`, `listingId`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `MAX_RETRY_COUNT`, `API_BASE_URL`)
- **Private Properties:** camelCase with underscore prefix (e.g., `_cache`)
- **Enums:** PascalCase (e.g., `UserRole`, `ListingStatus`)
- **Types:** PascalCase with 'Type' suffix if needed (e.g., `UserType`, `ListingType`)

### File Naming

```
// Components: PascalCase with .tsx extension
UserProfile.tsx
CarCard.tsx

// Services/Utils: camelCase with .ts extension
userService.ts
formatDate.ts

// Types: camelCase with .types.ts extension
user.types.ts
listing.types.ts

// Hooks: camelCase with 'use' prefix and .ts extension
useAuth.ts
useListing.ts

// Config: camelCase with .config.ts extension
database.config.ts
redis.config.ts
```

### Type Definitions

```typescript
// ✅ GOOD: Explicit types, interfaces for public APIs
interface User {
  id: string;
  email: string;
  profile: UserProfile;
  createdAt: Date;
}

type UserRole = 'user' | 'seller' | 'admin';

interface CreateUserDto {
  email: string;
  password: string;
  role: UserRole;
}

// ✅ GOOD: Use generics for reusable types
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// ❌ BAD: Using 'any' loosely
function processData(data: any) { }
```

### Import Organization

```typescript
// ✅ GOOD: Organized imports
// 1. External dependencies
import { Injectable, Logger } from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';

// 2. Internal modules
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';

// 3. Types
import type { CreateUserDto } from '../dto/create-user.dto';

// 4. Relative imports
import { formatDate } from '../../utils/date.utils';

// ❌ BAD: Unorganized imports
import { UserService } from '../services/user.service';
import { Injectable } from '@nestjs/common';
import { User } from '../entities/user.entity';
```

### Code Style

```typescript
// ✅ GOOD: Async/await, error handling
async function getUser(id: string): Promise<User> {
  try {
    const user = await this.userRepository.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  } catch (error) {
    this.logger.error(`Failed to get user: ${error.message}`);
    throw error;
  }
}

// ❌ BAD: Callback hell, no error handling
function getUser(id: string, callback: Function) {
  this.userRepository.findOne(id, (err, user) => {
    if (err) callback(err);
    callback(null, user);
  });
}
```

---

## NestJS Backend Standards

### Module Structure

Every feature module MUST follow this structure:

```
feature-name/
├── feature-name.module.ts
├── feature-name.controller.ts
├── feature-name.service.ts
├── dto/
│   ├── create-feature.dto.ts
│   ├── update-feature.dto.ts
│   └── query-feature.dto.ts
├── entities/
│   └── feature.entity.ts
└── guards/
    └── feature.guard.ts
```

### Controller Standards

```typescript
// ✅ GOOD: Clean controller with Swagger documentation
@Controller('listings')
@ApiTags('listings')
@UseGuards(JwtAuthGuard)
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new listing' })
  @ApiResponse({ status: 201, description: 'Listing created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @RequirePermissions('listings.create')
  async create(@Body() createListingDto: CreateListingDto, @Request() req) {
    return this.listingsService.create(createListingDto, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get listing by ID' })
  @ApiResponse({ status: 200, description: 'Listing found' })
  @ApiResponse({ status: 404, description: 'Listing not found' })
  async findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id);
  }
}
```

**Rules:**
- Controllers MUST be thin - only handle HTTP concerns
- Business logic MUST be in services
- Use decorators for routing, validation, and documentation
- Implement proper error handling with HTTP exceptions
- Use guards and interceptors for cross-cutting concerns

### Service Standards

```typescript
// ✅ GOOD: Service with single responsibility
@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepository: Repository<Listing>,
    private readonly cacheService: CacheService,
  ) {}

  async create(createListingDto: CreateListingDto, userId: string): Promise<Listing> {
    try {
      const listing = this.listingRepository.create({
        ...createListingDto,
        userId,
        status: ListingStatus.PENDING,
      });

      const saved = await this.listingRepository.save(listing);

      // Invalidate cache
      await this.cacheService.invalidatePattern('listings:*');

      this.logger.log(`Listing created: ${saved.id}`);
      return saved;
    } catch (error) {
      this.logger.error(`Failed to create listing: ${error.message}`);
      throw new BadRequestException('Failed to create listing');
    }
  }

  async findAll(query: QueryListingsDto): Promise<PaginatedResponse<Listing>> {
    const cacheKey = `listings:${JSON.stringify(query)}`;

    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const [listings, total] = await this.listingRepository.findAndCount({
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      order: { [query.sortBy]: query.sortOrder },
    });

    const result = {
      data: listings,
      pagination: { page: query.page, limit: query.limit, total },
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(result), 300);

    return result;
  }
}
```

**Rules:**
- Services MUST contain business logic
- Use dependency injection for repositories and other services
- Implement proper error handling and logging
- Use caching for frequently accessed data
- Keep methods focused and testable

### DTO Standards

```typescript
// ✅ GOOD: Validated DTO with clear documentation
import { IsString, IsEmail, MinLength, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  USER = 'user',
  SELLER = 'seller',
  ADMIN = 'admin',
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, default: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: 'John Doe', description: 'User full name' })
  @IsOptional()
  @IsString()
  fullName?: string;
}
```

**Rules:**
- Use class-validator decorators for validation
- Use Swagger decorators for API documentation
- Make optional fields explicit with @IsOptional()
- Use enums for fixed sets of values
- Group related DTOs in dto/ directory

### Entity Standards

```typescript
// ✅ GOOD: Well-structured entity with relations
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({
    type: 'enum',
    enum: ListingStatus,
    default: ListingStatus.PENDING,
  })
  status: ListingStatus;

  @ManyToOne(() => User, user => user.listings)
  user: User;

  @OneToMany(() => CarImage, image => image.listing, { cascade: true })
  images: CarImage[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
```

**Rules:**
- Use UUID for primary keys
- Define explicit column types
- Use proper column lengths for strings
- Implement soft deletes where appropriate
- Use relations for foreign keys
- Add timestamps for all entities

### Guard Standards

```typescript
// ✅ GOOD: Permission guard
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>('permissions', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.permissions) {
      throw new ForbiddenException('No permissions found');
    }

    const hasPermission = requiredPermissions.every(permission =>
      user.permissions.includes(permission)
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}

// Usage
@RequirePermissions('listings.create')
@UseGuards(PermissionGuard)
async create() { }
```

### Exception Handling

```typescript
// ✅ GOOD: Custom exception filter
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: exceptionResponse['message'] || exception.message,
    });
  }
}

// ✅ GOOD: Service-level error handling
async findById(id: string): Promise<Listing> {
  const listing = await this.listingRepository.findOne(id);
  if (!listing) {
    throw new NotFoundException(`Listing with ID ${id} not found`);
  }
  return listing;
}
```

---

## React Frontend Standards

### Component Structure

```typescript
// ✅ GOOD: Well-organized component
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { listingService } from '@/services/listing.service';
import { useAuth } from '@/hooks/useAuth';
import type { CreateListingDto } from '@/types/listing.types';

const listingSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  price: z.number().min(0, 'Price must be positive'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
});

type ListingFormData = z.infer<typeof listingSchema>;

export function CreateListingForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ListingFormData>({
    resolver: zodResolver(listingSchema),
  });

  const onSubmit = async (data: ListingFormData) => {
    try {
      setIsLoading(true);
      await listingService.create(data);
      navigate('/listings');
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Title"
        error={errors.title?.message}
        {...register('title')}
      />
      <Input
        type="number"
        label="Price"
        error={errors.price?.message}
        {...register('price', { valueAsNumber: true })}
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Listing'}
      </Button>
    </form>
  );
}
```

**Rules:**
- Use functional components with hooks
- Implement proper error handling
- Use TypeScript for all components
- Separate presentation from business logic
- Use custom hooks for reusable logic
- Implement loading states
- Handle edge cases (empty states, errors)

### Component Naming

```
// ✅ GOOD: PascalCase for components
UserProfile.tsx
CarCard.tsx
SearchFilters.tsx

// ❌ BAD: Inconsistent naming
userProfile.tsx
carcard.tsx
search-filters.tsx
```

### Props Pattern

```typescript
// ✅ GOOD: Explicit props with TypeScript
interface CarCardProps {
  car: Car;
  onFavorite?: (carId: string) => void;
  showPrice?: boolean;
  className?: string;
}

export function CarCard({ car, onFavorite, showPrice = true, className }: CarCardProps) {
  return (
    <div className={`car-card ${className}`}>
      {/* ... */}
    </div>
  );
}

// ✅ GOOD: Destructure props in function signature
export function UserProfile({ user, onUpdate, onDelete }: UserProfileProps) {
  // ...
}
```

### State Management

```typescript
// ✅ GOOD: Use appropriate state for the scope
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

export function UserProfile() {
  // Local state for component-specific data
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Global state for cross-component data
  const { user, updateUser } = useAuthStore();

  // Derive state from props/state
  const isVerified = user?.isVerified ?? false;

  // ...
}
```

**Rules:**
- Use local state (useState) for component-specific data
- Use Zustand store for global state
- Use React Context for theme, language, socket
- Derive state when possible instead of duplicating

### Custom Hooks

```typescript
// ✅ GOOD: Reusable custom hook
import { useState, useEffect } from 'react';
import { listingService } from '@/services/listing.service';
import type { Listing } from '@/types/listing.types';

export function useListing(id: string) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchListing() {
      try {
        setIsLoading(true);
        const data = await listingService.getById(id);
        setListing(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchListing();
  }, [id]);

  return { listing, isLoading, error };
}
```

**Rules:**
- Prefix hooks with 'use'
- Extract reusable logic into hooks
- Handle loading and error states
- Clean up side effects in useEffect

### Service Layer

```typescript
// ✅ GOOD: Static service class
import api from '@/lib/api';
import type { CreateListingDto, Listing, PaginatedResponse } from '@/types/listing.types';

export const listingService = {
  async create(data: CreateListingDto): Promise<Listing> {
    const response = await api.post<Listing>('/listings', data);
    return response.data;
  },

  async getAll(params?: QueryParams): Promise<PaginatedResponse<Listing>> {
    const response = await api.get<PaginatedResponse<Listing>>('/listings', { params });
    return response.data;
  },

  async getById(id: string): Promise<Listing> {
    const response = await api.get<Listing>(`/listings/${id}`);
    return response.data;
  },

  async update(id: string, data: Partial<CreateListingDto>): Promise<Listing> {
    const response = await api.patch<Listing>(`/listings/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/listings/${id}`);
  },
};
```

**Rules:**
- Create service files in `/services` directory
- Use static methods for API calls
- Handle errors at service or component level
- Return typed responses
- Use Axios instance with interceptors

### Route Protection

```typescript
// ✅ GOOD: Protected route component
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, permissions } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !permissions.includes(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

// Usage
<Route
  path="/listings/create"
  element={
    <ProtectedRoute requiredPermission="listings.create">
      <CreateListingPage />
    </ProtectedRoute>
  }
/>
```

### Styling Conventions

```typescript
// ✅ GOOD: Tailwind CSS with responsive design
export function CarCard({ car }: CarCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4">
      <img
        src={car.image}
        alt={car.title}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <h3 className="text-lg font-semibold text-gray-900">{car.title}</h3>
      <p className="text-sm text-gray-600">{car.description}</p>
      <p className="text-xl font-bold text-blue-600 mt-2">
        {formatPrice(car.price)}
      </p>
    </div>
  );
}

// ✅ GOOD: Conditional styling
<div className={cn(
  "base-class",
  isActive && "active-class",
  isLoading && "opacity-50 cursor-not-allowed",
  className
)}>
```

**Rules:**
- Use Tailwind utility classes
- Use cn() for conditional classes
- Use responsive prefixes (sm:, md:, lg:)
- Use semantic color names (text-blue-600 not text-#0066FF)
- Extract repeated styles to components

---

## Python ML Service Standards

### Code Style

```python
# ✅ GOOD: Follow PEP 8
from typing import List, Optional
from fastapi import HTTPException, status
from pydantic import BaseModel, Field


class CarFeatures(BaseModel):
    """Car features for price prediction."""
    brand: str = Field(..., description="Car brand (e.g., Toyota)")
    model: str = Field(..., description="Car model (e.g., Camry)")
    year: int = Field(..., ge=1900, le=2025, description="Manufacturing year")
    mileage: int = Field(..., ge=0, description="Mileage in km")
    version: Optional[str] = Field(None, description="Car version/trim")
    color: Optional[str] = Field(None, description="Car color")


class PredictionService:
    """Service for car price prediction."""

    def __init__(self, model_path: str):
        self.model = self._load_model(model_path)

    def predict(self, features: CarFeatures) -> dict:
        """
        Predict car price based on features.

        Args:
            features: Car features

        Returns:
            Dictionary with predicted price and metadata
        """
        try:
            # Preprocess features
            processed_features = self._preprocess(features)

            # Make prediction
            price = self.model.predict([processed_features])[0]

            # Calculate price range
            price_range = self._calculate_price_range(price)

            return {
                "estimated_price": price,
                "price_range": price_range,
                "confidence": 0.85,
                "currency": "VND",
                "unit": "million"
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Prediction failed: {str(e)}"
            )
```

**Rules:**
- Follow PEP 8 style guide
- Use type hints for all functions
- Use docstrings for all classes and functions
- Use Pydantic for data validation
- Handle errors gracefully

### API Standards

```python
# ✅ GOOD: FastAPI with OpenAPI documentation
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Car Valuation API",
    description="Machine learning service for car price prediction",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "car-valuation-service",
        "version": "1.0.0"
    }


@app.post("/predict", tags=["prediction"])
async def predict_price(features: CarFeatures):
    """
    Predict car price based on features.

    - **brand**: Car manufacturer (e.g., Toyota, Honda)
    - **model**: Car model (e.g., Camry, Civic)
    - **year**: Manufacturing year (1900-2025)
    - **mileage**: Mileage in kilometers
    - **version**: Optional version/trim level
    - **color**: Optional color

    Returns estimated price in million VND with confidence interval.
    """
    service = PredictionService()
    return service.predict(features)
```

---

## Database Standards

### Naming Conventions

```sql
-- ✅ GOOD: snake_case for tables and columns
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  full_name VARCHAR(255),
  phone_number VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ✅ GOOD: Descriptive index names
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_listings_status_created ON listings(status, created_at DESC);

-- ❌ BAD: Inconsistent naming
CREATE TABLE UserProfiles (
  ID UUID PRIMARY KEY,
  UserID UUID,
  FullName VARCHAR(255)
);
```

### Migration Standards

```typescript
// ✅ GOOD: Clear migration with up/down methods
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateListingsTable1699999999999 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'listings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'price',
            type: 'decimal',
            precision: 12,
            scale: 2,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['draft', 'pending', 'approved', 'rejected', 'sold'],
            default: "'pending'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('listings');
  }
}
```

**Rules:**
- Create both up() and down() methods
- Use descriptive migration names
- Include indexes and foreign keys
- Set sensible column defaults
- Use appropriate data types

---

## API Design Standards

### REST Conventions

```
GET    /api/listings           # List all listings (paginated)
GET    /api/listings/:id       # Get single listing
POST   /api/listings           # Create listing
PATCH  /api/listings/:id       # Update listing
DELETE /api/listings/:id       # Delete listing
```

**Rules:**
- Use nouns for resources (not verbs)
- Use plural for resource names
- Use kebab-case for URLs
- Implement proper HTTP status codes
- Use PATCH for partial updates

### Response Format

```typescript
// ✅ GOOD: Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// Success response
{
  "success": true,
  "data": { "id": "123", "title": "My Listing" },
  "message": "Listing created successfully"
}

// Error response
{
  "success": false,
  "error": "Validation failed",
  "message": "Title is required"
}
```

### HTTP Status Codes

```
200 OK              - Successful GET, PATCH
201 Created         - Successful POST
204 No Content      - Successful DELETE
400 Bad Request     - Validation errors
401 Unauthorized    - Not authenticated
403 Forbidden       - Not authorized
404 Not Found       - Resource not found
409 Conflict        - Duplicate resource
422 Unprocessable   - Business logic error
500 Internal Error  - Server error
```

---

## Testing Standards

### Unit Tests

```typescript
// ✅ GOOD: Clear unit test with AAA pattern
describe('UserService', () => {
  let service: UserService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useClass: Repository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: userId, email: 'test@test.com' };
      jest.spyOn(repository, 'findOne').mockResolvedValue(expectedUser as User);

      // Act
      const result = await service.findById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(repository.findOne).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundException when not found', async () => {
      // Arrange
      const userId = '123';
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      // Act & Assert
      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
    });
  });
});
```

**Rules:**
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Mock external dependencies
- Test both success and failure cases
- Aim for 80%+ code coverage

### Integration Tests

```typescript
// ✅ GOOD: Integration test with test database
describe('ListingsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/listings (POST)', () => {
    it('should create listing when authenticated', () => {
      return request(app.getHttpServer())
        .post('/listings')
        .set('Authorization', 'Bearer valid-token')
        .send({
          title: 'Test Listing',
          price: 100000000,
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data.title).toBe('Test Listing');
        });
    });
  });
});
```

---

## Git Workflow

### Commit Messages

```
# ✅ GOOD: Conventional commits
feat(listings): add image upload functionality
fix(auth): resolve token expiration issue
docs(readme): update installation instructions
refactor(chat): extract socket logic to service
test(listings): add integration tests for CRUD operations

# ❌ BAD: Vague commits
update files
fix bug
add stuff
```

**Format:**
```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

### Branch Naming

```
feature/listing-image-upload
fix/auth-token-expiry
hotfix/security-patch
refactor/chat-service
docs/api-documentation
```

---

## Documentation Standards

### Code Comments

```typescript
// ✅ GOOD: Self-documenting code with minimal comments

// ❌ BAD: Excessive comments for obvious code
// Get user from database
const user = await database.getUser(userId);

// ✅ GOOD: Comments for WHY, not WHAT
// We cache for 5 minutes because car data doesn't change frequently
const cacheTTL = 300;
```

**Rules:**
- Write self-documenting code
- Comment WHY, not WHAT
- Use JSDoc for public APIs
- Keep comments up-to-date

### JSDoc Standards

```typescript
/**
 * Creates a new car listing with automatic status workflow
 *
 * @param createListingDto - Listing data including title, price, and car details
 * @param userId - ID of the user creating the listing
 * @returns Created listing with generated ID and timestamps
 * @throws BadRequestException if validation fails
 * @throws ForbiddenException if user lacks 'listings.create' permission
 *
 * @example
 * ```typescript
 * const listing = await listingsService.create({
 *   title: 'Toyota Camry 2020',
 *   price: 850000000,
 *   mileage: 50000
 * }, 'user-id-123');
 * ```
 */
async create(createListingDto: CreateListingDto, userId: string): Promise<Listing> {
  // ...
}
```

---

## Code Review Checklist

Before submitting PR, verify:

- [ ] Code follows TypeScript/React/NestJS standards
- [ ] All tests pass (unit + integration)
- [ ] Code coverage is ≥ 80%
- [ ] No console.log statements left in code
- [ ] Proper error handling implemented
- [ ] API responses are consistent
- [ ] Database queries are optimized
- [ ] Security vulnerabilities addressed
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow conventions

---

**Document Owners:** CarMarket Development Team
**Last Review:** 2025-12-27
**Next Review:** 2026-01-27
