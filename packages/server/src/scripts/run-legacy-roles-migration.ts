import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { migrateLegacyRolesToRBAC } from './migrate-legacy-roles';

// Load environment variables
config();

async function runMigration() {
  const host = process.env.DATABASE_HOST || 'localhost';
  const port = parseInt(process.env.DATABASE_PORT || '5432');
  const username = process.env.DATABASE_USERNAME;
  const password = process.env.DATABASE_PASSWORD;
  const database = process.env.DATABASE_NAME;

  if (!username || !password || !database) {
    console.error('❌ Missing database configuration. Please set DATABASE_USERNAME, DATABASE_PASSWORD, and DATABASE_NAME');
    process.exit(1);
  }

  const dataSource = new DataSource({
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: ['src/entities/*.entity.ts'],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    await migrateLegacyRolesToRBAC(dataSource);

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigration();

