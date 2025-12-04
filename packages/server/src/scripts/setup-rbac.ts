import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { RbacSeed } from './rbac-seed';

// Load environment variables
config();

async function setupRbac() {
  console.log('🚀 Setting up RBAC system...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    entities: ['src/entities/*.entity.ts'],
    // synchronize: true, // This will create tables automatically
    synchronize: false,
    logging: true,
  });

  try {
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connection established');

    console.log('🌱 Seeding RBAC data...');
    const seed = new RbacSeed(dataSource);
    await seed.seed();

    console.log('🎉 RBAC setup completed successfully!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Start your application: npm run start:dev');
    console.log('2. Test the RBAC endpoints: GET /rbac/permissions');
    console.log('3. Check audit logs: GET /rbac/audit-logs');
    console.log('');
    console.log('🔐 Default roles created:');
    console.log('- super_admin (all permissions)');
    console.log('- admin (user/listing management)');
    console.log('- moderator (content moderation)');
    console.log('- seller (listing management)');
    console.log('- buyer (basic permissions)');
    console.log('');
    console.log('👥 Existing users have been migrated:');
    console.log('- Admin users → admin role');
    console.log('- Regular users → buyer role');

  } catch (error) {
    console.error('❌ Error during RBAC setup:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run the setup
setupRbac();
