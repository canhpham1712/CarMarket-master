import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

async function runInitSql() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USERNAME!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    // Không cần entities hay synchronize cho việc chạy script raw
    synchronize: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    // Đường dẫn đến folder init-scripts (từ packages/server/src/scripts ra ngoài root)
    const scriptsDir = path.join(__dirname, '../../../../init-scripts');
    
    if (!fs.existsSync(scriptsDir)) {
      console.error(`❌ Init scripts directory not found at: ${scriptsDir}`);
      return;
    }

    // Lấy danh sách file .sql và sắp xếp theo tên
    const files = fs.readdirSync(scriptsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📂 Found ${files.length} SQL scripts to run.`);

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();

    for (const file of files) {
      console.log(`▶️ Running script: ${file}`);
      const filePath = path.join(scriptsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        // Chạy từng file sql
        await queryRunner.query(sql);
        console.log(`✅ Successfully executed: ${file}`);
      } catch (err: any) {
        // Bỏ qua lỗi nếu bảng đã tồn tại (thường gặp khi chạy lại)
        if (err.code === '42P07') { // duplicate_table
             console.warn(`⚠️ Warning in ${file}: Table already exists. Skipping.`);
        } else {
             console.error(`❌ Error executing ${file}:`, err.message);
        }
      }
    }

    await queryRunner.release();
    console.log('🎉 All init scripts processed.');

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

runInitSql();