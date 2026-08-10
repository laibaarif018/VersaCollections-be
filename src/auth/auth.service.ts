import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * jsonwebtoken types `expiresIn` as a template-literal union ("15m", "7d", …)
 * rather than plain string, so config values need a narrowing cast.
 */
type ExpiresIn = NonNullable<JwtSignOptions['expiresIn']>;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id as string,
      email: user.email,
      role: user.role,
      tier: user.membershipTier,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('app.jwt.accessSecret'),
        expiresIn: this.config.getOrThrow<string>('app.jwt.accessTtl') as ExpiresIn,
      }),
      this.jwtService.signAsync(
        { sub: payload.sub },
        {
          secret: this.config.getOrThrow<string>('app.jwt.refreshSecret'),
          expiresIn: this.config.getOrThrow<string>('app.jwt.refreshTtl') as ExpiresIn,
        },
      ),
    ]);

    await this.usersService.setRefreshTokenHash(user.id as string, refreshToken);
    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('An account with that email already exists');

    const user = await this.usersService.create(dto);
    return { user, tokens: await this.issueTokens(user) };
  }

  async login(dto: LoginDto): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const user = await this.usersService.findByEmail(dto.email);
    // Same message either way so the endpoint can't be used to enumerate accounts.
    if (!user || !(await this.usersService.compareSecret(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect email or password');
    }
    return { user, tokens: await this.issueTokens(user) };
  }

  async refresh(refreshToken: string | undefined): Promise<{ user: UserDocument; tokens: TokenPair }> {
    if (!refreshToken) throw new UnauthorizedException('No refresh token supplied');

    let sub: string;
    try {
      const decoded = await this.jwtService.verifyAsync<{ sub: string }>(refreshToken, {
        secret: this.config.getOrThrow<string>('app.jwt.refreshSecret'),
      });
      sub = decoded.sub;
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const user = await this.usersService.findById(sub);
    if (!user?.refreshTokenHash) throw new UnauthorizedException('Session is no longer active');

    // Rotation: the presented token must match the one we last issued.
    const matches = await this.usersService.compareSecret(refreshToken, user.refreshTokenHash);
    if (!matches) {
      await this.usersService.setRefreshTokenHash(user.id as string, null);
      throw new UnauthorizedException('Refresh token has been superseded');
    }

    return { user, tokens: await this.issueTokens(user) };
  }

  async logout(userId: string): Promise<void> {
    await this.usersService.setRefreshTokenHash(userId, null);
  }
}
