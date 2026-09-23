import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Category } from './category.entity';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category) private readonly repo: Repository<Category>,
  ) {}

  findAllByUser(userId: number): Promise<Category[]> {
    return this.repo.find({ where: { userId }, order: { name: 'ASC' } });
  }

  findOneByUser(userId: number, id: number): Promise<Category | null> {
    return this.repo.findOneBy({ id, userId });
  }

  findManyByUser(userId: number, ids: number[]): Promise<Category[]> {
    return this.repo.findBy({ id: In(ids), userId });
  }

  existsByName(userId: number, name: string): Promise<boolean> {
    return this.repo.existsBy({ userId, name });
  }

  create(userId: number, name: string): Promise<Category> {
    return this.repo.save(this.repo.create({ userId, name }));
  }

  async remove(category: Category): Promise<void> {
    await this.repo.remove(category);
  }
}
