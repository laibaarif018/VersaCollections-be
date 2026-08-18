import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash } from 'node:crypto';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../common/enums';
import { Paginated, paginate } from '../common/dto/pagination.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  hashSecret(secret: string): Promise<string> {
    return bcrypt.hash(secret, BCRYPT_ROUNDS);
  }

  compareSecret(secret: string, hash: string): Promise<boolean> {
    return bcrypt.compare(secret, hash);
  }

  findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdOrFail(id: string): Promise<UserDocument> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: Role;
  }): Promise<UserDocument> {
    return this.userModel.create({
      email: input.email.toLowerCase().trim(),
      passwordHash: await this.hashSecret(input.password),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role ?? Role.Customer,
    });
  }

  /**
   * Create an account on someone else's behalf. Unlike `create`, the duplicate
   * email is rejected up front — registration can afford a generic message to
   * avoid leaking who has an account, but an admin typing a colleague's
   * address needs to be told plainly that it is already taken.
   */
  async createByAdmin(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: Role;
  }): Promise<UserDocument> {
    const existing = await this.findByEmail(input.email);
    if (existing) throw new ConflictException('An account with that email already exists');
    return this.create(input);
  }

  /** Replaces the stored hash. The caller is responsible for checking the old one. */
  async setPassword(userId: string, password: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { passwordHash: await this.hashSecret(password) },
        { returnDocument: 'after' },
      )
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Stores the hashed one-time code, replacing any previous one. */
  async setPasswordCode(userId: string, code: string, expiresAt: Date): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        passwordCodeHash: await this.hashSecret(code),
        passwordCodeExpiresAt: expiresAt,
        // A new code starts with a clean slate, so failed guesses against the
        // old one cannot burn through the new one's allowance.
        passwordCodeAttempts: 0,
      })
      .exec();
  }

  async clearPasswordCode(userId: string): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        passwordCodeHash: null,
        passwordCodeExpiresAt: null,
        passwordCodeAttempts: 0,
      })
      .exec();
  }

  /** @returns the attempt count after this one, so the caller can cap it. */
  async recordPasswordCodeAttempt(userId: string): Promise<number> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { $inc: { passwordCodeAttempts: 1 } }, { returnDocument: 'after' })
      .exec();
    return user?.passwordCodeAttempts ?? 0;
  }

  /** Rejects an address already in use, since email is the sign-in handle. */
  async setEmail(userId: string, email: string): Promise<UserDocument> {
    const normalised = email.toLowerCase().trim();
    const existing = await this.findByEmail(normalised);
    if (existing && (existing.id as string) !== userId) {
      throw new ConflictException('An account with that email already exists');
    }

    const user = await this.userModel
      .findByIdAndUpdate(userId, { email: normalised }, { returnDocument: 'after' })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Condenses a refresh token before it meets bcrypt.
   *
   * bcrypt silently truncates its input at 72 bytes. A refresh JWT is far
   * longer than that, and two tokens issued to the *same* user are identical
   * well past byte 72 — same header, same `sub` claim, with only `iat`/`exp`
   * differing around byte 103. Hashing the raw token therefore made every
   * token for a user compare equal, which quietly disabled rotation detection:
   * a superseded token kept working until it expired.
   *
   * SHA-256 first gives bcrypt 64 bytes that actually differ per token.
   */
  private digestToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async setRefreshTokenHash(userId: string, refreshToken: string | null): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        refreshTokenHash: refreshToken
          ? await this.hashSecret(this.digestToken(refreshToken))
          : null,
      })
      .exec();
  }

  /** The counterpart to `setRefreshTokenHash` — never use `compareSecret` here. */
  compareRefreshToken(refreshToken: string, hash: string): Promise<boolean> {
    return this.compareSecret(this.digestToken(refreshToken), hash);
  }

  async updateProfile(
    userId: string,
    input: { firstName?: string; lastName?: string },
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, input, { returnDocument: 'after' }).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async list(params: {
    page: number;
    limit: number;
    role?: Role;
    search?: string;
  }): Promise<Paginated<UserDocument>> {
    const filter: QueryFilter<UserDocument> = {};
    if (params.role) filter.role = params.role;
    if (params.search) {
      const rx = new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { firstName: rx }, { lastName: rx }];
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((params.page - 1) * params.limit)
        .limit(params.limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, total, params.page, params.limit);
  }

  countAll(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }
}
