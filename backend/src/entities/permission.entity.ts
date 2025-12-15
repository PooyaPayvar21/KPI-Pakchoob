import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  module!: string;

  @Column()
  action!: string;

  @Column()
  resource!: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string | null;
}
