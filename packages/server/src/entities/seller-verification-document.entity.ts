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
import { SellerVerification } from './seller-verification.entity';
import { User } from './user.entity';

export enum VerificationDocumentType {
  IDENTITY_CARD = 'identity_card', // CMND/CCCD
  PASSPORT = 'passport',
  DRIVING_LICENSE = 'driving_license',
  BANK_STATEMENT = 'bank_statement',
  ADDRESS_PROOF = 'address_proof',
  BUSINESS_LICENSE = 'business_license',
}

@Entity('seller_verification_documents')
@Index(['verificationId'])
@Index(['documentType'])
export class SellerVerificationDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  verificationId!: string;

  @Column({
    type: 'enum',
    enum: VerificationDocumentType,
  })
  documentType!: VerificationDocumentType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber!: string | null;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ type: 'varchar', length: 500 })
  fileUrl!: string;

  @Column({ type: 'integer', nullable: true })
  fileSize!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ type: 'uuid', nullable: true })
  verifiedBy!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason!: string | null;

  @CreateDateColumn()
  uploadedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => SellerVerification, (verification) => verification.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'verificationId' })
  verification!: SellerVerification;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'verifiedBy' })
  verifier!: User | null;
}

