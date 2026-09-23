import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Note } from '../notes/note.entity';
import { User } from '../users/user.entity';

@Entity('categories')
@Unique(['userId', 'name'])
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ select: false })
  userId: number;

  @ManyToOne(() => User, (user) => user.categories, { onDelete: 'CASCADE' })
  user: User;

  @ManyToMany(() => Note, (note) => note.categories)
  notes: Note[];
}
