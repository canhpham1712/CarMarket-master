import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { CarDetail } from './car-detail.entity';

@Entity('car_videos')
export class CarVideo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  filename!: string;

  @Column()
  originalName!: string;

  @Column()
  url!: string;

  @Column({ default: 0 })
  sortOrder!: number;

  @Column({ default: false })
  isPrimary!: boolean;

  @Column({ type: 'bigint', nullable: true })
  fileSize!: number | null; // in bytes

  @Column({ type: 'varchar', length: 255, nullable: true })
  mimeType!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  alt!: string | null; // Alt text for accessibility

  @Column({ type: 'int', nullable: true })
  duration!: number | null; // Video duration in seconds

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl!: string | null; // Thumbnail URL for video preview

  @CreateDateColumn()
  createdAt!: Date;

  // Relationships
  @ManyToOne(() => CarDetail, (carDetail) => carDetail.videos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'carDetailId' })
  carDetail!: CarDetail;

  @Column()
  carDetailId!: string;
}
