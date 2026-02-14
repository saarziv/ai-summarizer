import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class Summary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  uuid: string;

  @Column({ type: 'text', unique: true })
  originalText: string;

  @Column({ type: 'text' })
  category: string;

  @Column({ type: 'text', unique: true })
  summary: string;

  @Column('text', { array: true })
  topics: string[];

  @Column({ type: 'boolean', default: false })
  isWithContext: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
