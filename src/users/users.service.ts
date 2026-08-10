import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { MembershipTier, Role } from '../common/enums';
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

  async setRefreshTokenHash(userId: string, refreshToken: string | null): Promise<void> {
    await this.userModel
      .findByIdAndUpdate(userId, {
        refreshTokenHash: refreshToken ? await this.hashSecret(refreshToken) : null,
      })
      .exec();
  }

  async setMembershipTier(userId: string, tier: MembershipTier): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { membershipTier: tier }, { new: true })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    input: { firstName?: string; lastName?: string },
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(userId, input, { new: true }).exec();
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

  countMembers(): Promise<number> {
    return this.userModel.countDocuments({ membershipTier: { $ne: MembershipTier.None } }).exec();
  }
}
