import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  /** Loads the user including the (normally hidden) password hash. */
  findByUsernameWithPassword(username: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.username = :username', { username })
      .getOne();
  }

  existsByUsername(username: string): Promise<boolean> {
    return this.repo.existsBy({ username });
  }

  create(username: string, passwordHash: string): Promise<User> {
    return this.repo.save(this.repo.create({ username, passwordHash }));
  }
}
