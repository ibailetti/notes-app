import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';

const BCRYPT_ROUNDS = 10;
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin123';

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultUser();
  }

  /** Returns the user when the credentials are valid, otherwise null. */
  async validateCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user =
      await this.usersRepository.findByUsernameWithPassword(username);
    if (!user) {
      return null;
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
  }

  private async seedDefaultUser(): Promise<void> {
    if (await this.usersRepository.existsByUsername(DEFAULT_USERNAME)) {
      return;
    }
    const hash = await bcrypt.hash(DEFAULT_PASSWORD, BCRYPT_ROUNDS);
    await this.usersRepository.create(DEFAULT_USERNAME, hash);
    this.logger.log(`Seeded default user "${DEFAULT_USERNAME}"`);
  }
}
