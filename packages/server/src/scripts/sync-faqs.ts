import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { FAQ } from '../entities/faq.entity';
// SỬA LỖI 2: Import AppDataSource thay vì databaseConfig
import { AppDataSource } from '../config/data-source'; 

config();

// Helper xử lý CSV
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function syncFaqs() {
  console.log('🚀 Starting FAQ Synchronization Process...');
  
  try {
    // Kết nối Database sử dụng AppDataSource có sẵn
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }
    console.log('✅ Connected to Database!');

    const faqRepository = AppDataSource.getRepository(FAQ);

    // Đường dẫn file CSV: Tìm trong folder data ngang hàng với thư mục chạy (dist hoặc src)
    // Logic: Khi chạy production, workdir là /app/packages/server, file ở ./data/carmarket_faqs.csv
    const csvPath = path.resolve(process.cwd(), 'data', 'carmarket_faqs.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`❌ CSV file not found at: ${csvPath}`);
    }

    console.log(`📥 Reading CSV data from: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    console.log('🧹 Cleaning old FAQs...');
    await faqRepository.query('TRUNCATE TABLE faq RESTART IDENTITY CASCADE');

    let count = 0;
    // Bỏ qua header (i=1)
    for (let i = 1; i < lines.length; i++) {
      // SỬA LỖI 1: Kiểm tra undefined trước khi trim
      const lineRaw = lines[i]; 
      if (!lineRaw) continue; // Nếu dòng rỗng thì bỏ qua
      
      const line = lineRaw.trim();
      if (!line) continue;

      const columns = parseCSVLine(line);
      if (columns.length >= 3) {
        const [cat, quest, ans] = columns.map(c => c.replace(/^"|"$/g, ''));
        if (quest && ans) {
          await faqRepository.save({
            category: cat || 'General',
            question: quest,
            answer: ans,
            order: i,
            isActive: true,
          });
          count++;
        }
      }
    }
    console.log(`✅ Seeded ${count} FAQs into Database.`);
    
    // SỬA LỖI 3: Xóa phần gọi EmbeddingService ở đây. 
    // Chúng ta sẽ chạy tách biệt bằng lệnh npm để tránh lỗi context NestJS phức tạp.

  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }
  }
}

syncFaqs();