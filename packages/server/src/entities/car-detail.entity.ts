import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { ListingDetail } from './listing-detail.entity';
import { CarImage } from './car-image.entity';
import { CarVideo } from './car-video.entity';

export enum FuelType {
  PETROL = 'petrol',
  DIESEL = 'diesel',
  ELECTRIC = 'electric',
  HYBRID = 'hybrid',
  LPG = 'lpg',
  CNG = 'cng',
}

export enum TransmissionType {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  CVT = 'cvt',
  SEMI_AUTOMATIC = 'semi_automatic',
}

export enum BodyType {
  SEDAN = 'sedan',
  HATCHBACK = 'hatchback',
  SUV = 'suv',
  COUPE = 'coupe',
  CONVERTIBLE = 'convertible',
  WAGON = 'wagon',
  PICKUP = 'pickup',
  VAN = 'van',
  MINIVAN = 'minivan',
}

export enum CarCondition {
  EXCELLENT = 'excellent',
  VERY_GOOD = 'very_good',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

@Entity('car_details')
export class CarDetail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  make!: string;

  @Column()
  model!: string;

  @Column()
  year!: number;

  @Column({
    type: 'enum',
    enum: BodyType,
  })
  bodyType!: BodyType;

  @Column({
    type: 'enum',
    enum: FuelType,
  })
  fuelType!: FuelType;

  @Column({
    type: 'enum',
    enum: TransmissionType,
  })
  transmission!: TransmissionType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  engineSize!: number;

  @Column()
  enginePower!: number; // in HP

  @Column()
  mileage!: number; // in kilometers

  @Column()
  color!: string;

  @Column({ default: 4 })
  numberOfDoors!: number;

  @Column({ default: 5 })
  numberOfSeats!: number;

  @Column({
    type: 'enum',
    enum: CarCondition,
  })
  condition!: CarCondition;

  @Column({ type: 'varchar', length: 32, nullable: true })
  vin!: string | null; // Vehicle Identification Number

  @Column({ type: 'varchar', length: 64, nullable: true })
  registrationNumber!: string | null;

  @Column({ type: 'int', nullable: true })
  previousOwners!: number | null;

  @Column({ default: false })
  hasAccidentHistory!: boolean;

  @Column({ default: false })
  hasServiceHistory!: boolean;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('simple-array', { nullable: true })
  features!: string[] | null; // e.g., ['GPS', 'Leather seats', 'Sunroof']

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relationships
  @OneToOne(() => ListingDetail, (listing) => listing.carDetail)
  listing!: ListingDetail;

  @OneToMany(() => CarImage, (image) => image.carDetail)
  images!: CarImage[];

  @OneToMany(() => CarVideo, (video) => video.carDetail)
  videos!: CarVideo[];
}
