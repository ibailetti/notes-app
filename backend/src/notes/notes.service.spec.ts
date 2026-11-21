import { NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/category.entity';
import { Note } from './note.entity';
import { NotesRepository } from './notes.repository';
import { NotesService } from './notes.service';

const USER_ID = 7;

function category(id: number, name: string): Category {
  return Object.assign(new Category(), { id, name });
}

function note(overrides: Partial<Note> = {}): Note {
  return Object.assign(new Note(), {
    id: 1,
    title: 'Title',
    content: '',
    archived: false,
    categories: [],
    ...overrides,
  });
}

describe('NotesService', () => {
  let repository: jest.Mocked<NotesRepository>;
  let categories: jest.Mocked<CategoriesService>;
  let service: NotesService;

  beforeEach(() => {
    repository = {
      findByUser: jest.fn(),
      findOneByUser: jest.fn(),
      create: jest.fn((data: Partial<Note>) => note(data)),
      save: jest.fn((n: Note) => Promise.resolve(n)),
      remove: jest.fn(),
    } as unknown as jest.Mocked<NotesRepository>;
    categories = {
      findOne: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<CategoriesService>;
    service = new NotesService(repository, categories);
  });

  describe('findAll', () => {
    it('lists active notes by default', async () => {
      repository.findByUser.mockResolvedValue([]);

      await service.findAll(USER_ID, {});
      expect(repository.findByUser).toHaveBeenCalledWith(USER_ID, {
        archived: false,
        categoryId: undefined,
      });
    });

    it('passes the archived flag and category filter through', async () => {
      repository.findByUser.mockResolvedValue([]);

      await service.findAll(USER_ID, { archived: true, categoryId: 3 });
      expect(repository.findByUser).toHaveBeenCalledWith(USER_ID, {
        archived: true,
        categoryId: 3,
      });
    });
  });

  describe('findOne', () => {
    it('returns 404 when the note does not exist for this user', async () => {
      repository.findOneByUser.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates an active note with its resolved categories', async () => {
      const work = category(2, 'Work');
      categories.findMany.mockResolvedValue([work]);
      repository.findOneByUser.mockResolvedValue(note({ categories: [work] }));

      await service.create(USER_ID, { title: 'Plan', categoryIds: [2] });

      expect(categories.findMany).toHaveBeenCalledWith(USER_ID, [2]);
      expect(repository.create).toHaveBeenCalledWith({
        userId: USER_ID,
        title: 'Plan',
        content: '',
        archived: false,
        categories: [work],
      });
    });
  });

  describe('update', () => {
    it('only changes the fields that were sent', async () => {
      const existing = note({ title: 'Old', content: 'Keep me' });
      repository.findOneByUser.mockResolvedValue(existing);

      await service.update(USER_ID, 1, { title: 'New' });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New', content: 'Keep me' }),
      );
      expect(categories.findMany).not.toHaveBeenCalled();
    });

    it('replaces the categories when categoryIds is sent', async () => {
      const home = category(3, 'Home');
      repository.findOneByUser.mockResolvedValue(
        note({ categories: [category(2, 'Work')] }),
      );
      categories.findMany.mockResolvedValue([home]);

      await service.update(USER_ID, 1, { categoryIds: [3] });

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ categories: [home] }),
      );
    });
  });

  describe('archive / unarchive', () => {
    it('archives an active note', async () => {
      repository.findOneByUser.mockResolvedValue(note({ archived: false }));

      await service.archive(USER_ID, 1);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ archived: true }),
      );
    });

    it('does not write when the note is already archived', async () => {
      repository.findOneByUser.mockResolvedValue(note({ archived: true }));

      await service.archive(USER_ID, 1);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('unarchives an archived note', async () => {
      repository.findOneByUser.mockResolvedValue(note({ archived: true }));

      await service.unarchive(USER_ID, 1);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ archived: false }),
      );
    });
  });

  describe('categories on a note', () => {
    it('adds a category once, even if requested twice', async () => {
      const work = category(2, 'Work');
      repository.findOneByUser.mockResolvedValue(note({ categories: [work] }));
      categories.findOne.mockResolvedValue(work);

      await service.addCategory(USER_ID, 1, 2);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('removes a category from the note', async () => {
      const work = category(2, 'Work');
      const home = category(3, 'Home');
      repository.findOneByUser.mockResolvedValue(
        note({ categories: [work, home] }),
      );
      categories.findOne.mockResolvedValue(work);

      await service.removeCategory(USER_ID, 1, 2);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ categories: [home] }),
      );
    });
  });

  describe('remove', () => {
    it('deletes an owned note', async () => {
      const existing = note();
      repository.findOneByUser.mockResolvedValue(existing);

      await service.remove(USER_ID, 1);
      expect(repository.remove).toHaveBeenCalledWith(existing);
    });
  });
});
