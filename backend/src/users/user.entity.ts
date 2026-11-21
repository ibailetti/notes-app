import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Category } from '../categories/category.entity';
import { Note } from '../notes/note.entity';

/** Maps the `users` table (schema owned by Flyway, see db/migrations). */
@Entity('users')
@Unique(['username'])
export class User {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'varchar' })
  username: string;

  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => Note, (note) => note.user)
  notes: Note[];

  @OneToMany(() => Category, (category) => category.user)
  categories: Category[];
}
