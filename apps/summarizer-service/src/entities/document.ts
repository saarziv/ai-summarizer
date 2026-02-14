import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  text: string;

  // pgvector column (dimension = 1536 for Jina embeddings)
  @Column({
    type: 'vector',
    length: 1024,
    transformer: {
      to: (value: number[]) => value,
      from: (value: any) => value,
    },
  })
  embedding: number[];
}
