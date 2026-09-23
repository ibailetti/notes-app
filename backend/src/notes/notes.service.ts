import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { ListNotesQueryDto } from './dto/list-notes-query.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './note.entity';
import { NotesRepository } from './notes.repository';

@Injectable()
export class NotesService {
  constructor(
    private readonly notesRepository: NotesRepository,
    private readonly categoriesService: CategoriesService,
  ) {}

  findAll(userId: number, query: ListNotesQueryDto): Promise<Note[]> {
    return this.notesRepository.findByUser(userId, {
      archived: query.archived ?? false,
      categoryId: query.categoryId,
    });
  }

  async findOne(userId: number, id: number): Promise<Note> {
    const note = await this.notesRepository.findOneByUser(userId, id);
    if (!note) {
      throw new NotFoundException(`Note ${id} not found`);
    }
    return note;
  }

  async create(userId: number, dto: CreateNoteDto): Promise<Note> {
    const categories = await this.categoriesService.findMany(
      userId,
      dto.categoryIds ?? [],
    );
    const note = this.notesRepository.create({
      userId,
      title: dto.title,
      content: dto.content ?? '',
      archived: false,
      categories,
    });
    const { id } = await this.notesRepository.save(note);
    return this.findOne(userId, id);
  }

  async update(userId: number, id: number, dto: UpdateNoteDto): Promise<Note> {
    const note = await this.findOne(userId, id);
    if (dto.title !== undefined) note.title = dto.title;
    if (dto.content !== undefined) note.content = dto.content;
    if (dto.categoryIds !== undefined) {
      note.categories = await this.categoriesService.findMany(
        userId,
        dto.categoryIds,
      );
    }
    await this.notesRepository.save(note);
    return this.findOne(userId, id);
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.notesRepository.remove(await this.findOne(userId, id));
  }

  archive(userId: number, id: number): Promise<Note> {
    return this.setArchived(userId, id, true);
  }

  unarchive(userId: number, id: number): Promise<Note> {
    return this.setArchived(userId, id, false);
  }

  async addCategory(
    userId: number,
    id: number,
    categoryId: number,
  ): Promise<Note> {
    const note = await this.findOne(userId, id);
    const category = await this.categoriesService.findOne(userId, categoryId);
    if (!note.categories.some((c) => c.id === category.id)) {
      note.categories.push(category);
      await this.notesRepository.save(note);
    }
    return this.findOne(userId, id);
  }

  async removeCategory(
    userId: number,
    id: number,
    categoryId: number,
  ): Promise<Note> {
    const note = await this.findOne(userId, id);
    await this.categoriesService.findOne(userId, categoryId);
    note.categories = note.categories.filter((c) => c.id !== categoryId);
    await this.notesRepository.save(note);
    return this.findOne(userId, id);
  }

  private async setArchived(
    userId: number,
    id: number,
    archived: boolean,
  ): Promise<Note> {
    const note = await this.findOne(userId, id);
    if (note.archived !== archived) {
      note.archived = archived;
      await this.notesRepository.save(note);
    }
    return this.findOne(userId, id);
  }
}
