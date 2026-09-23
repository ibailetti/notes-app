import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticatedUser } from '../common/authenticated-user';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload';

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login({ username, password }: LoginDto): Promise<LoginResult> {
    const user = await this.usersService.validateCredentials(
      username,
      password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const payload: JwtPayload = { sub: user.id, username: user.username };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, username: user.username },
    };
  }

  /** Verifies a token and returns the user it belongs to. */
  async verifyToken(token: string): Promise<AuthenticatedUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      return { id: payload.sub, username: payload.username };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
