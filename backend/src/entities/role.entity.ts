import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string | null;

  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  permissions?: any | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
