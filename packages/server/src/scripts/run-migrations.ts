import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

config();

async function runMigrations() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    // Đường dẫn tương đối đến entities và migrations
    entities: [path.join(__dirname, '../entities/*.entity{.ts,.js}')],
    migrations: [path.join(__dirname, '../migrations/*{.ts,.js}')],
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established for Migrations');

    console.log('Running migrations...');
    const migrations = await dataSource.runMigrations();
    console.log(`✅ Migrations completed. Executed ${migrations.length} migrations.`);
    
  } catch (error) {
    console.error('❌ Error during migrations:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runMigrations();