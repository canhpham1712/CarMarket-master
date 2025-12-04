# CarMarket Database Setup

This directory contains all the SQL scripts needed to set up the CarMarket database from scratch.

## Database Structure

The CarMarket application uses PostgreSQL and includes the following main tables:

### Core Tables
- **users** - User accounts and profiles
- **car_makes** - Car manufacturers (Toyota, Honda, BMW, etc.)
- **car_models** - Car models for each manufacturer
- **car_metadata** - Dropdown options (fuel types, colors, features, etc.)
- **car_details** - Detailed car specifications
- **car_images** - Car photos and images
- **listing_details** - Car listings for sale
- **transactions** - Purchase transactions
- **chat_conversations** - Chat conversations between buyers and sellers
- **chat_messages** - Individual chat messages
- **favorites** - User's favorite listings
- **listing_pending_changes** - Pending changes awaiting approval
- **activity_logs** - System activity and audit logs

## Setup Instructions

### Option 1: Quick Setup (Recommended)
Run the complete setup script that executes all steps in order:

```bash
# Connect to PostgreSQL as superuser
psql -U postgres -f 00-setup-database.sql
```

### Option 2: Manual Setup
If you prefer to run each step individually:

```bash
# Step 1: Create database and user
psql -U postgres -f 01-init.sql

# Step 2: Create all tables
psql -U postgres -d carmarket -f 02-create-tables.sql

# Step 3: Insert seed data
psql -U postgres -d carmarket -f 03-seed-data.sql
```

### Option 3: Docker Setup
If you're using Docker, the database will be automatically initialized when you run:

```bash
docker-compose up -d
```

## Database Credentials

- **Database Name**: carmarket
- **Username**: carmarket_user
- **Password**: carmarket_password
- **Host**: localhost (or your Docker container)
- **Port**: 5432

## Sample Data

The seed data includes:

### Car Makes (15 manufacturers)
- Toyota, Honda, Ford, Chevrolet, BMW, Mercedes-Benz, Audi, Nissan, Hyundai, Kia, Mazda, Subaru, Volkswagen, Lexus, Infiniti

### Car Models (25+ models)
- Popular models for each manufacturer including sedans, SUVs, trucks, and hatchbacks

### Metadata Options
- **Fuel Types**: Petrol, Diesel, Electric, Hybrid, LPG, CNG
- **Transmissions**: Manual, Automatic, CVT, Semi-Automatic
- **Body Types**: Sedan, Hatchback, SUV, Coupe, Convertible, Wagon, Pickup, Van, Minivan
- **Conditions**: Excellent, Very Good, Good, Fair, Poor
- **Price Types**: Fixed, Negotiable, Auction
- **Features**: 25+ car features (AC, GPS, Bluetooth, Leather seats, etc.)
- **Colors**: 15+ color options

### Sample Users
- **Admin User**: admin@carmarket.com (password: password123)
- **Regular Users**: john.doe@example.com, jane.smith@example.com, bob.wilson@example.com

### Sample Listings
- 4 sample car listings with complete details and images

## Database Features

### Indexes
Comprehensive indexing for optimal query performance:
- User lookups by email, role, active status
- Car searches by make, model, year, fuel type, etc.
- Listing searches by price, location, status, features
- Chat and message lookups
- Activity log queries

### Triggers
Automatic timestamp updates for all tables with `updatedAt` columns.

### Constraints
- Foreign key relationships with proper cascade rules
- Check constraints for enum values
- Unique constraints where appropriate
- Not null constraints for required fields

### Data Types
- UUID primary keys for all tables
- JSONB for flexible metadata storage
- Proper decimal precision for prices and coordinates
- Array support for features and body styles

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure you're running as a PostgreSQL superuser
2. **Database Already Exists**: Drop the existing database first: `DROP DATABASE carmarket;`
3. **User Already Exists**: Drop the existing user first: `DROP USER carmarket_user;`
4. **Extension Missing**: Ensure uuid-ossp extension is available in your PostgreSQL installation

### Verification

After setup, verify the installation:

```sql
-- Connect to the database
\c carmarket

-- Check tables
\dt

-- Check sample data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM car_makes;
SELECT COUNT(*) FROM car_metadata;
SELECT COUNT(*) FROM listing_details;
```

## Maintenance

### Backup
```bash
pg_dump -U carmarket_user carmarket > carmarket_backup.sql
```

### Restore
```bash
psql -U carmarket_user carmarket < carmarket_backup.sql
```

### Reset Database
```bash
# Drop and recreate
DROP DATABASE carmarket;
DROP USER carmarket_user;
psql -U postgres -f 00-setup-database.sql
```

### Read Logs of Data Seeding
``` bash
docker logs -f carmarket-postgres
```

## Next Steps

After setting up the database:

1. Update your application's database configuration
2. Run the NestJS application: `npm run start:dev`
3. Run the React frontend: `npm run dev`
4. Access the application at http://localhost:3000

For more information, see the main project README.md file.



