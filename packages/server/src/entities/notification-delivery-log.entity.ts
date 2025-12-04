import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Notification } from './notification.entity';

export enum DeliveryChannel {
  IN_APP = 'inApp',
  EMAIL = 'email',
  PUSH = 'push',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
}

@Entity('notification_delivery_logs')
@Index(['notificationId', 'channel'])
@Index(['status', 'attemptedAt'])
export class NotificationDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  notificationId!: string;

  @Column({
    type: 'enum',
    enum: DeliveryChannel,
  })
  channel!: DeliveryChannel;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status!: DeliveryStatus;

  @CreateDateColumn()
  attemptedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ type: 'int', default: 0 })
  retryCount!: number;

  // Relationships
  @ManyToOne(() => Notification, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'notificationId' })
  notification!: Notification;
}

