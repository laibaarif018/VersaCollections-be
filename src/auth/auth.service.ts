import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto, LoginDto, ChangePasswordDto } from './dto/auth.dto';
import { MailService } from '../mail/mail.service';
import { buildPasswordCodeEmail } from '../mail/account-emails';
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

/** Six digits is the shape people expect; the attempt cap is what protects it. */
const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;
const MAX_CODE_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mailService: MailService,
  ) {}

  private async issueTokens(user: UserDocument): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id as string,
      email: user.email,
      role: user.role,
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

  /**
   * Emails a one-time code that authorises a password change.
   *
   * Requesting one is harmless on its own: the code only ever goes to the
   * address already on the account, so an attacker at an unlocked browser
   * cannot see it, and the mere act of asking changes nothing.
   */
  async requestPasswordCode(userId: string): Promise<{ sent: boolean; to: string; minutes: number }> {
    const user = await this.usersService.findByIdOrFail(userId);

    // Six digits from a CSPRNG — `Math.random` is not acceptable for anything
    // that stands in for a password.
    const code = String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0');
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

    await this.usersService.setPasswordCode(userId, code, expiresAt);

    const sent = await this.mailService.send(
      buildPasswordCodeEmail({
        to: user.email,
        name: user.firstName,
        code,
        minutes: CODE_TTL_MINUTES,
      }),
    );

    // A code nobody can receive is worse than none: it would leave the form
    // waiting on something that will never arrive.
    if (!sent) {
      await this.usersService.clearPasswordCode(userId);
      throw new ServiceUnavailableException(
        'The code could not be emailed. Email is not configured on this server yet.',
      );
    }

    return { sent, to: user.email, minutes: CODE_TTL_MINUTES };
  }

  /**
   * Change the caller's own password, authorised by the emailed code.
   *
   * Fresh tokens are issued on the way out. That is not cosmetic: writing a new
   * refresh-token hash invalidates the old one, so any other session — the
   * browser this was changed *because of* — is signed out, while the caller
   * stays signed in.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ user: UserDocument; tokens: TokenPair }> {
    const user = await this.usersService.findByIdOrFail(userId);

    if (!user.passwordCodeHash || !user.passwordCodeExpiresAt) {
      throw new BadRequestException('Request a code first');
    }
    if (user.passwordCodeExpiresAt.getTime() < Date.now()) {
      await this.usersService.clearPasswordCode(userId);
      throw new UnauthorizedException('That code has expired — request a new one');
    }

    if (!(await this.usersService.compareSecret(dto.code, user.passwordCodeHash))) {
      // Capped, so the six digits cannot simply be enumerated.
      const attempts = await this.usersService.recordPasswordCodeAttempt(userId);
      if (attempts >= MAX_CODE_ATTEMPTS) {
        await this.usersService.clearPasswordCode(userId);
        throw new UnauthorizedException('Too many incorrect codes — request a new one');
      }
      throw new UnauthorizedException('That code is not correct');
    }

    if (await this.usersService.compareSecret(dto.newPassword, user.passwordHash)) {
      throw new BadRequestException('The new password must be different from the current one');
    }

    // Single use: spent whether or not anything below fails.
    await this.usersService.clearPasswordCode(userId);

    const updated = await this.usersService.setPassword(userId, dto.newPassword);
    return { user: updated, tokens: await this.issueTokens(updated) };
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
    const matches = await this.usersService.compareRefreshToken(refreshToken, user.refreshTokenHash);
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
