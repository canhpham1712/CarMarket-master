import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ListingDetail } from './listing-detail.entity';
import { Transaction } from './transaction.entity';
import { UserRole } from './user-role.entity';
import { SellerRating } from './seller-rating.entity';

export enum OAuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  @Exclude()
  password?: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phoneNumber!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  profileImage!: string;

  @Column({ nullable: true, type: 'text' })
  bio!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string;

  @Column({ nullable: true, type: 'date' })
  dateOfBirth!: Date;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ default: false })
  isEmailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetExpires!: Date | null;

  @Column({
    type: 'enum',
    enum: OAuthProvider,
    default: OAuthProvider.LOCAL,
  })
  provider!: OAuthProvider;

  @Column({ name: "provider_id", type: 'varchar', length: 255, nullable: true })
  providerId!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => ListingDetail, (listing) => listing.seller)
  listings!: ListingDetail[];

  @OneToMany(() => Transaction, (transaction) => transaction.seller)
  sales!: Transaction[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles!: UserRole[];

  @OneToMany(() => SellerRating, (rating) => rating.seller)
  receivedRatings!: SellerRating[];

  @OneToMany(() => SellerRating, (rating) => rating.buyer)
  givenRatings!: SellerRating[];

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
