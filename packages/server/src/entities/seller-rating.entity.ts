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
import { Transaction } from './transaction.entity';

@Entity('seller_ratings')
@Unique(['buyerId', 'sellerId', 'transactionId'])
@Index(['sellerId'])
@Index(['buyerId'])
@Index(['transactionId'])
export class SellerRating {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  sellerId!: string;

  @Column({ type: 'uuid' })
  buyerId!: string;

  @Column({ type: 'uuid', nullable: true })
  transactionId!: string | null;

  @Column({ type: 'int' })
  rating!: number; // 1-5 stars

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sellerId' })
  seller!: User;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'buyerId' })
  buyer!: User;

  @ManyToOne(() => Transaction, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'transactionId' })
  transaction!: Transaction | null;
}

