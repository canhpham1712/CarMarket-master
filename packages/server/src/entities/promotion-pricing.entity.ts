import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PromotionPackageType } from './listing-promotion.entity';

@Entity('promotion_pricing')
export class PromotionPricing {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: PromotionPackageType,
    unique: true,
  })
  packageType!: PromotionPackageType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price!: number;

  @Column()
  durationDays!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Virtual property
  get pricePerDay(): number {
    return Number(this.price) / this.durationDays;
  }
}

