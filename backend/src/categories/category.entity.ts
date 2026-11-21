import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Note } from '../notes/note.entity';
import { User } from '../users/user.entity';

/** Maps the `categories` table (schema owned by Flyway, see db/migrations). */
@Entity('categories')
@Unique(['userId', 'name'])
export class Category {
  @PrimaryGeneratedColumn('identity', { generatedIdentity: 'BY DEFAULT' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'user_id', type: 'integer', select: false })
  userId: number;

  @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToMany(() => Note, (note) => note.categories)
  notes: Note[];
}
