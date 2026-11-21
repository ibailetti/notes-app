import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwtService = new JwtService({ secret: 'test-secret' });
  let usersService: jest.Mocked<UsersService>;
  let service: AuthService;

  beforeEach(() => {
    usersService = {
      validateCredentials: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    service = new AuthService(usersService, jwtService);
  });

  it('returns a token and the user for valid credentials', async () => {
    usersService.validateCredentials.mockResolvedValue(
      Object.assign(new User(), { id: 1, username: 'admin' }),
    );

    const result = await service.login({
      username: 'admin',
      password: 'admin123',
    });

    expect(result.user).toEqual({ id: 1, username: 'admin' });
    await expect(service.verifyToken(result.accessToken)).resolves.toEqual({
      id: 1,
      username: 'admin',
    });
  });

  it('rejects invalid credentials with 401', async () => {
    usersService.validateCredentials.mockResolvedValue(null);

    await expect(
      service.login({ username: 'admin', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a malformed token with 401', async () => {
    await expect(service.verifyToken('not-a-jwt')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret with 401', async () => {
    const foreign = await new JwtService({ secret: 'other' }).signAsync({
      sub: 1,
      username: 'admin',
    });

    await expect(service.verifyToken(foreign)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
