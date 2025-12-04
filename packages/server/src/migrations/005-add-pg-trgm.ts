import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPgTrgmExtension1710000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Lệnh này kích hoạt extension pg_trgm trong PostgreSQL
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        
        // (Tùy chọn) Tạo index GIN cho các trường hay tìm kiếm để tăng tốc độ
        // await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_listing_title_trgm ON listing_details USING gin (title gin_trgm_ops);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Khi revert migration thì xóa extension đi (thường không bắt buộc)
        await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm;`);
    }
}