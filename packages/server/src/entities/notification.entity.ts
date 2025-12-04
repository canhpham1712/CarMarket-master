import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ListingDetail } from './listing-detail.entity';

export enum NotificationType {
  LISTING_APPROVED = 'listing_approved',
  LISTING_REJECTED = 'listing_rejected',
  NEW_MESSAGE = 'new_message',
  LISTING_SOLD = 'listing_sold',
  NEW_INQUIRY = 'new_inquiry',
  COMMENT_REPORTED = 'comment_reported',
  ROLE_ASSIGNED = 'role_assigned',
  SYSTEM = 'system',
}

@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
@Index(['userId', 'isRead', 'createdAt'])
@Index(['userId', 'type'])
@Index(['groupId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type!: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ default: false })
  isRead!: boolean;

  @Column({ type: 'uuid', nullable: true })
  relatedListingId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => ListingDetail, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'relatedListingId' })
  relatedListing!: ListingDetail | null;
}

