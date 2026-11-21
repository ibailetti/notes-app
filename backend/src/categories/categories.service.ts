import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isUniqueViolation } from '../database/database-errors';
import { CategoriesRepository } from './categories.repository';
import { Category } from './category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  findAll(userId: number): Promise<Category[]> {
    return this.categoriesRepository.findAllByUser(userId);
  }

  async create(userId: number, { name }: CreateCategoryDto): Promise<Category> {
    if (await this.categoriesRepository.existsByName(userId, name)) {
      throw this.duplicateName(name);
    }
    try {
      const { id } = await this.categoriesRepository.create(userId, name);
      return await this.findOne(userId, id);
    } catch (error) {
      // Two concurrent requests can both pass the check above; the unique
      // constraint in the database decides, and we still answer 409.
      if (isUniqueViolation(error)) throw this.duplicateName(name);
      throw error;
    }
  }

  async remove(userId: number, id: number): Promise<void> {
    await this.categoriesRepository.remove(await this.findOne(userId, id));
  }

  async findOne(userId: number, id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOneByUser(userId, id);
    if (!category) {
      throw new NotFoundException(`Category ${id} not found`);
    }
    return category;
  }

  /** Resolves a list of ids, failing if any of them is not owned by the user. */
  async findMany(userId: number, ids: number[]): Promise<Category[]> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) {
      return [];
    }
    const categories = await this.categoriesRepository.findManyByUser(
      userId,
      uniqueIds,
    );
    if (categories.length !== uniqueIds.length) {
      const found = new Set(categories.map((category) => category.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new BadRequestException(
        `Unknown category id(s): ${missing.join(', ')}`,
      );
    }
    return categories;
  }

  private duplicateName(name: string): ConflictException {
    return new ConflictException(`Category "${name}" already exists`);
  }
}
