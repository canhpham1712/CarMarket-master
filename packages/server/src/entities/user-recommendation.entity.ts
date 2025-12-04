import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { ListingDetail } from './listing-detail.entity';

@Entity('user_recommendations')
@Unique(['userId', 'listingId'])
@Index(['userId'])
@Index(['userId', 'score'])
@Index(['listingId'])
export class UserRecommendation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  listingId!: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  score!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

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

