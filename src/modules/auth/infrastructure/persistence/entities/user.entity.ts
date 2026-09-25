import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserStatus } from '../../../domain/auth-user';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 120, nullable: true })
  displayName!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({
    type: 'varchar',
    length: 32,
    default: UserStatus.PendingVerification,
  })
  status!: UserStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
