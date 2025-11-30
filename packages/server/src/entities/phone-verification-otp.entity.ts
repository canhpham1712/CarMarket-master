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

@Entity('phone_verification_otps')
@Index(['userId', 'phoneNumber'], { unique: true })
@Index(['expiresAt'])
export class PhoneVerificationOtp {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 20 })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  otpCode!: string; // Hashed OTP using bcrypt

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts!: number;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  // Virtual properties
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isExceededMaxAttempts(): boolean {
    return this.attempts >= this.maxAttempts;
  }

  get isVerified(): boolean {
    return !!this.verifiedAt;
  }

  get canAttempt(): boolean {
    return !this.isExpired && !this.isExceededMaxAttempts && !this.isVerified;
  }
}

