import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { CarValuationMetadata } from '../entities/car-valuation-metadata.entity';

// Load environment variables
config();

async function seedValuationMetadata() {
  console.log('🚀 Starting valuation metadata seed...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    entities: [CarValuationMetadata],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Find metadata.json file
    const metadataPath = path.join(
      __dirname,
      '../../../car-valuation-service/metadata.json',
    );

    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Metadata file not found at: ${metadataPath}`);
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log('✅ Loaded metadata.json');

    const repository = dataSource.getRepository(CarValuationMetadata);

    // Clear existing data
    await repository.clear();
    console.log('🗑️  Cleared existing data');

    const records: CarValuationMetadata[] = [];

    // Process metadata
    for (const make of metadata.makes) {
      const models = metadata.make_models[make] || [];

      for (const model of models) {
        const years = metadata.model_years[make]?.[model] || [];

        for (const year of years) {
          const versions = metadata.year_versions[make]?.[model]?.[year] || [];
          const colors = metadata.version_colors[make]?.[model]?.[year] || {};

          if (versions.length === 0) {
            // No versions, just add make/model/year
            const colorsForYear = colors[''] || [];
            if (colorsForYear.length > 0) {
              for (const color of colorsForYear) {
                records.push(
                  repository.create({
                    make,
                    model,
                    year,
                    version: null,
                    color,
                  }),
                );
              }
            } else {
              records.push(
                repository.create({
                  make,
                  model,
                  year,
                  version: null,
                  color: null,
                }),
              );
            }
          } else {
            // Has versions
            for (const version of versions) {
              const versionColors = colors[version] || [];
              if (versionColors.length > 0) {
                for (const color of versionColors) {
                  records.push(
                    repository.create({
                      make,
                      model,
                      year,
                      version,
                      color,
                    }),
                  );
                }
              } else {
                records.push(
                  repository.create({
                    make,
                    model,
                    year,
                    version,
                    color: null,
                  }),
                );
              }
            }
          }
        }
      }
    }

    // Insert in batches
    const batchSize = 1000;
    const totalBatches = Math.ceil(records.length / batchSize);
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await repository.save(batch);
      const batchNum = Math.floor(i / batchSize) + 1;
      console.log(`✅ Inserted batch ${batchNum}/${totalBatches} (${batch.length} records)`);
    }

    console.log(`\n🎉 Total records inserted: ${records.length}`);
    console.log('✅ Valuation metadata seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run the seed
seedValuationMetadata();

