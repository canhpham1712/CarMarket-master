import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { SellerVerificationDocument } from './seller-verification-document.entity';

export enum SellerVerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum VerificationLevel {
  BASIC = 'basic', // Email + Phone verified
  STANDARD = 'standard', // + Identity document
  PREMIUM = 'premium', // + Bank account + Address proof
}

@Entity('seller_verifications')
@Index(['userId'], { unique: true })
@Index(['status'])
@Index(['verificationLevel'])
export class SellerVerification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({
    type: 'enum',
    enum: SellerVerificationStatus,
    default: SellerVerificationStatus.PENDING,
  })
  status!: SellerVerificationStatus;

  @Column({
    type: 'enum',
    enum: VerificationLevel,
    default: VerificationLevel.BASIC,
  })
  verificationLevel!: VerificationLevel;

  // Contact Information
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column({ default: false })
  isPhoneVerified!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  phoneVerifiedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  phoneVerificationDeadline!: Date | null;

  // Identity Information
  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  idNumber!: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Vietnam' })
  country!: string | null;

  // Bank Account (optional for premium verification)
  @Column({ type: 'varchar', length: 255, nullable: true })
  bankName!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccountNumber!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountHolderName!: string | null;

  @Column({ default: false })
  isBankVerified!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  bankVerifiedAt!: Date | null;

  // Admin Review
  @Column({ type: 'uuid', nullable: true })
  reviewedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes!: string | null;

  // Metadata
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewedBy' })
  reviewer!: User | null;

  @OneToMany(
    () => SellerVerificationDocument,
    (document) => document.verification,
    { cascade: true },
  )
  documents!: SellerVerificationDocument[];

  // Virtual properties
  get isVerified(): boolean {
    return this.status === SellerVerificationStatus.APPROVED;
  }

  get isPending(): boolean {
    return this.status === SellerVerificationStatus.PENDING;
  }

  get isInReview(): boolean {
    return this.status === SellerVerificationStatus.IN_REVIEW;
  }

  get isRejected(): boolean {
    return this.status === SellerVerificationStatus.REJECTED;
  }

  get isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }
}

