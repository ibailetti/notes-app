import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { Category } from './category.entity';

const USER_ID = 7;

function category(id: number, name: string): Category {
  return Object.assign(new Category(), { id, name });
}

describe('CategoriesService', () => {
  let repository: jest.Mocked<CategoriesRepository>;
  let service: CategoriesService;

  beforeEach(() => {
    repository = {
      findAllByUser: jest.fn(),
      findOneByUser: jest.fn(),
      findManyByUser: jest.fn(),
      existsByName: jest.fn(),
      create: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<CategoriesRepository>;
    service = new CategoriesService(repository);
  });

  describe('create', () => {
    it('creates a category and returns it', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(category(1, 'Work'));
      repository.findOneByUser.mockResolvedValue(category(1, 'Work'));

      await expect(service.create(USER_ID, { name: 'Work' })).resolves.toEqual(
        category(1, 'Work'),
      );
      expect(repository.create).toHaveBeenCalledWith(USER_ID, 'Work');
    });

    it('rejects a name the user already has with 409', async () => {
      repository.existsByName.mockResolvedValue(true);

      await expect(
        service.create(USER_ID, { name: 'Work' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('maps a concurrent unique violation from Postgres to 409', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockRejectedValue(
        new QueryFailedError('INSERT ...', [], { code: '23505' } as never),
      );

      await expect(
        service.create(USER_ID, { name: 'Work' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows other database errors', async () => {
      const error = new QueryFailedError('INSERT ...', [], {
        code: '08006',
      } as never);
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockRejectedValue(error);

      await expect(service.create(USER_ID, { name: 'Work' })).rejects.toBe(
        error,
      );
    });
  });

  describe('findOne / remove', () => {
    it('returns 404 for a category the user does not own', async () => {
      repository.findOneByUser.mockResolvedValue(null);

      await expect(service.findOne(USER_ID, 99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('removes an owned category', async () => {
      const work = category(1, 'Work');
      repository.findOneByUser.mockResolvedValue(work);

      await service.remove(USER_ID, 1);
      expect(repository.remove).toHaveBeenCalledWith(work);
    });
  });

  describe('findMany', () => {
    it('returns an empty list without querying when no ids are given', async () => {
      await expect(service.findMany(USER_ID, [])).resolves.toEqual([]);
      expect(repository.findManyByUser).not.toHaveBeenCalled();
    });

    it('de-duplicates ids before querying', async () => {
      repository.findManyByUser.mockResolvedValue([category(1, 'Work')]);

      await service.findMany(USER_ID, [1, 1]);
      expect(repository.findManyByUser).toHaveBeenCalledWith(USER_ID, [1]);
    });

    it('rejects unknown ids with 400 and names them', async () => {
      repository.findManyByUser.mockResolvedValue([category(1, 'Work')]);

      await expect(service.findMany(USER_ID, [1, 2, 3])).rejects.toThrow(
        new BadRequestException('Unknown category id(s): 2, 3'),
      );
    });
  });
});
