import * as bcrypt from 'bcrypt';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let repository: jest.Mocked<UsersRepository>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      findByUsernameWithPassword: jest.fn(),
      existsByUsername: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    service = new UsersService(repository);
  });

  describe('default user seed', () => {
    it('creates admin with a bcrypt hash when it does not exist', async () => {
      repository.existsByUsername.mockResolvedValue(false);

      await service.onModuleInit();

      expect(repository.create).toHaveBeenCalledTimes(1);
      const [username, hash] = repository.create.mock.calls[0];
      expect(username).toBe('admin');
      expect(hash).not.toBe('admin123');
      await expect(bcrypt.compare('admin123', hash)).resolves.toBe(true);
    });

    it('does nothing when admin already exists', async () => {
      repository.existsByUsername.mockResolvedValue(true);

      await service.onModuleInit();
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateCredentials', () => {
    const hash = bcrypt.hashSync('secret', 4);
    const stored = Object.assign(new User(), {
      id: 1,
      username: 'ana',
      passwordHash: hash,
    });

    it('returns the user when the password matches', async () => {
      repository.findByUsernameWithPassword.mockResolvedValue(stored);

      await expect(service.validateCredentials('ana', 'secret')).resolves.toBe(
        stored,
      );
    });

    it('returns null when the password is wrong', async () => {
      repository.findByUsernameWithPassword.mockResolvedValue(stored);

      await expect(
        service.validateCredentials('ana', 'nope'),
      ).resolves.toBeNull();
    });

    it('returns null for an unknown user', async () => {
      repository.findByUsernameWithPassword.mockResolvedValue(null);

      await expect(
        service.validateCredentials('ghost', 'secret'),
      ).resolves.toBeNull();
    });
  });
});
