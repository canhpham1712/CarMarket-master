import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddChatbotConversationFields1710000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add title column
    await queryRunner.addColumn(
      'chatbot_conversations',
      new TableColumn({
        name: 'title',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add deviceId column
    await queryRunner.addColumn(
      'chatbot_conversations',
      new TableColumn({
        name: 'deviceId',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Add sessionId column
    await queryRunner.addColumn(
      'chatbot_conversations',
      new TableColumn({
        name: 'sessionId',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
    );

    // Create index on deviceId
    await queryRunner.createIndex(
      'chatbot_conversations',
      new TableIndex({
        name: 'IDX_chatbot_conversations_device_id',
        columnNames: ['deviceId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.dropIndex(
      'chatbot_conversations',
      'IDX_chatbot_conversations_device_id',
    );

    // Drop columns
    await queryRunner.dropColumn('chatbot_conversations', 'sessionId');
    await queryRunner.dropColumn('chatbot_conversations', 'deviceId');
    await queryRunner.dropColumn('chatbot_conversations', 'title');
  }
}

