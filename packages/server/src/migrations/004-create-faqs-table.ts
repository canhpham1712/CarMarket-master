import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFaqsTable1700000000004 implements MigrationInterface {
  name = 'CreateFaqsTable1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Tạo bảng faqs
    await queryRunner.createTable(
      new Table({
        name: 'faqs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()', // Sử dụng hàm tạo UUID của Postgres
          },
          {
            name: 'category',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'question',
            type: 'text',
          },
          {
            name: 'answer',
            type: 'text',
          },
          {
            name: 'embedding',
            type: 'float8',
            isArray: true,
            isNullable: true, // Entity cho phép null
          },
          {
            name: 'language',
            type: 'varchar',
            length: '10',
            default: "'en'",
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'searchCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'rating',
            type: 'decimal',
            precision: 3,
            scale: 2,
            isNullable: true,
            default: 0,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // 2. Tạo Index cho cột category (như trong @Index(['category']) của entity)
    await queryRunner.createIndex(
      'faqs',
      new TableIndex({
        name: 'IDX_faqs_category',
        columnNames: ['category'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Xóa bảng nếu cần
    await queryRunner.dropTable('faqs');
  }
}