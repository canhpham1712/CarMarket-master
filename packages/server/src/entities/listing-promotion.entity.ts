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

export enum PromotionPackageType {
  ONE_DAY = '1_day',
  THREE_DAYS = '3_days',
  SEVEN_DAYS = '7_days',
}

export enum PromotionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PAYOS = 'payos',
  MOMO = 'momo',
  VNPAY = 'vnpay',
  STRIPE = 'stripe',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Entity('listing_promotions')
export class ListingPromotion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  listingId!: string;

  @Column()
  sellerId!: string;

  @Column({
    type: 'enum',
    enum: PromotionPackageType,
  })
  packageType!: PromotionPackageType;

  @Column({ type: 'timestamptz', nullable: true })
  startDate!: Date | null;

  @Column({ type: 'timestamptz' })
  endDate!: Date;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    default: PromotionStatus.PENDING,
  })
  status!: PromotionStatus;

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    nullable: true,
  })
  paymentMethod!: PaymentMethod | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentReference!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentTransactionId!: string | null;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => ListingDetail, (listing) => listing.promotions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'listingId' })
  listing!: ListingDetail;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sellerId' })
  seller!: User;

  // Virtual properties
  get isActive(): boolean {
    return (
      this.status === PromotionStatus.ACTIVE &&
      this.endDate > new Date()
    );
  }

  get isExpired(): boolean {
    return this.endDate <= new Date();
  }

  get daysRemaining(): number {
    if (!this.isActive) return 0;
    const now = new Date();
    const diff = this.endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}

