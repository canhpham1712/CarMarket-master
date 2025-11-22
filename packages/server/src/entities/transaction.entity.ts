import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ListingDetail } from './listing-detail.entity';

export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT_CARD = 'credit_card',
  FINANCING = 'financing',
  OTHER = 'other',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  transactionNumber!: string; // e.g., TXN-2024-001

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformFee!: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalAmount!: number;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status!: TransactionStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
  })
  paymentMethod!: PaymentMethod;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentReference!: string; // External payment gateway reference

  @Column('text', { nullable: true })
  notes!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  meetingLocation!: string;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledMeetingDate!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt!: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  cancellationReason!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => User, (user) => user.sales, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sellerId' })
  seller!: User;

  @Column()
  sellerId!: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'buyerId' })
  buyer!: User;

  @Column({ nullable: true })
  buyerId!: string | null;

  @ManyToOne(() => ListingDetail, (listing) => listing.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listingId' })
  listing!: ListingDetail;

  @Column()
  listingId!: string;

  // Virtual properties
  get isPending(): boolean {
    return this.status === TransactionStatus.PENDING;
  }

  get isCompleted(): boolean {
    return this.status === TransactionStatus.COMPLETED;
  }

  get isCancelled(): boolean {
    return this.status === TransactionStatus.CANCELLED;
  }
}
