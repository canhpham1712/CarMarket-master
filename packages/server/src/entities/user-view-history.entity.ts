import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ListingDetail } from './listing-detail.entity';

export enum ViewAction {
  VIEW = 'view',
  CLICK_CONTACT = 'click_contact',
  CLICK_FAVORITE = 'click_favorite',
  LONG_VIEW = 'long_view', // View duration > 30 seconds
}

@Entity('user_view_history')
@Unique(['userId', 'listingId', 'action', 'viewedAt'])
@Index(['userId', 'viewedAt'])
@Index(['listingId'])
@Index(['userId', 'listingId'])
export class UserViewHistory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  listingId!: string;

  @Column({
    type: 'enum',
    enum: ViewAction,
    default: ViewAction.VIEW,
  })
  action!: ViewAction;

  @Column({ type: 'int', nullable: true })
  viewDuration!: number | null; // in seconds

  @Column({ type: 'timestamptz' })
  viewedAt!: Date;

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
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listingId' })
  listing!: ListingDetail;
}

