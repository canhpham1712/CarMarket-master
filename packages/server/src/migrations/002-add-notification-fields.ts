import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddNotificationFields1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add groupId column to notifications table
    await queryRunner.addColumn(
      'notifications',
      new TableColumn({
        name: 'groupId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add index on groupId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notifications_groupId" ON "notifications" ("groupId")`,
    );

    // Create notification_preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "preferences" jsonb NOT NULL DEFAULT '{}',
        "quietHours" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_notification_preferences_userId" UNIQUE ("userId"),
        CONSTRAINT "PK_notification_preferences" PRIMARY KEY ("id")
      )
    `);

    // Create index on userId
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_preferences_userId" ON "notification_preferences" ("userId")`,
    );

    // Create notification_delivery_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_delivery_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "notificationId" uuid NOT NULL,
        "channel" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "attemptedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deliveredAt" TIMESTAMP,
        "error" text,
        "retryCount" integer NOT NULL DEFAULT 0,
        CONSTRAINT "PK_notification_delivery_logs" PRIMARY KEY ("id")
      )
    `);

    // Create indexes on notification_delivery_logs
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_delivery_logs_notificationId" ON "notification_delivery_logs" ("notificationId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_delivery_logs_channel" ON "notification_delivery_logs" ("channel")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_notification_delivery_logs_status" ON "notification_delivery_logs" ("status", "attemptedAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_delivery_logs_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_delivery_logs_channel"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_delivery_logs_notificationId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notification_preferences_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_groupId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_delivery_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences"`);

    // Drop column
    await queryRunner.dropColumn('notifications', 'groupId');
  }
}

