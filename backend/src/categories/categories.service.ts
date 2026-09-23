import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
      throw new ConflictException(`Category "${name}" already exists`);
    }
    const { id } = await this.categoriesRepository.create(userId, name);
    return this.findOne(userId, id);
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
}
