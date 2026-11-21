import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NOTE_CATEGORIES_TABLE, Note } from './note.entity';

export interface NoteFilter {
  archived: boolean;
  categoryId?: number;
}

@Injectable()
export class NotesRepository {
  constructor(
    @InjectRepository(Note) private readonly repo: Repository<Note>,
  ) {}

  /** Notes of a user with all their categories, newest changes first. */
  findByUser(userId: number, filter: NoteFilter): Promise<Note[]> {
    const query = this.repo
      .createQueryBuilder('note')
      .leftJoinAndSelect('note.categories', 'category')
      .where('note.userId = :userId', { userId })
      .andWhere('note.archived = :archived', { archived: filter.archived })
      .orderBy('note.updatedAt', 'DESC')
      .addOrderBy('note.id', 'DESC')
      .addOrderBy('category.name', 'ASC');

    if (filter.categoryId !== undefined) {
      // Filter with a sub-query so every category of a matching note is still loaded.
      query.andWhere(
        `note.id IN (SELECT nc.note_id FROM ${NOTE_CATEGORIES_TABLE} nc WHERE nc.category_id = :categoryId)`,
        { categoryId: filter.categoryId },
      );
    }
    return query.getMany();
  }

  findOneByUser(userId: number, id: number): Promise<Note | null> {
    return this.repo.findOne({
      where: { id, userId },
      relations: { categories: true },
      order: { categories: { name: 'ASC' } },
    });
  }

  create(data: Partial<Note>): Note {
    return this.repo.create(data);
  }

  save(note: Note): Promise<Note> {
    return this.repo.save(note);
  }

  async remove(note: Note): Promise<void> {
    await this.repo.remove(note);
  }
}
