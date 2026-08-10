import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model } from 'mongoose';
import {
  MembershipApplication,
  MembershipApplicationDocument,
} from './schemas/membership-application.schema';
import {
  ApplicationQueryDto,
  ApplyForMembershipDto,
  ReviewApplicationDto,
} from './dto/membership.dto';
import { ApplicationStatus, MembershipTier } from '../common/enums';
import { UsersService } from '../users/users.service';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { MEMBERSHIP_TIERS } from './tiers';

@Injectable()
export class MembershipService {
  constructor(
    @InjectModel(MembershipApplication.name)
    private readonly applicationModel: Model<MembershipApplicationDocument>,
    private readonly usersService: UsersService,
  ) {}

  tiers() {
    return MEMBERSHIP_TIERS;
  }

  async apply(dto: ApplyForMembershipDto): Promise<MembershipApplicationDocument> {
    if (dto.tier === MembershipTier.None) {
      throw new BadRequestException('Choose one of the three membership tiers');
    }

    const email = dto.email.toLowerCase().trim();
    const open = await this.applicationModel
      .findOne({ email, status: ApplicationStatus.Pending })
      .exec();
    if (open) {
      throw new BadRequestException(
        'An application for this address is already with the committee. We will be in touch.',
      );
    }

    const user = await this.usersService.findByEmail(email);
    return this.applicationModel.create({
      fullName: dto.fullName,
      email,
      tier: dto.tier,
      message: dto.message ?? '',
      user: user?._id ?? null,
    });
  }

  async list(query: ApplicationQueryDto): Promise<Paginated<MembershipApplicationDocument>> {
    const filter: QueryFilter<MembershipApplicationDocument> = {};
    if (query.status) filter.status = query.status;

    const [items, total] = await Promise.all([
      this.applicationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.applicationModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  /** Approving grants the tier to the linked account, if the applicant has one. */
  async review(id: string, dto: ReviewApplicationDto): Promise<MembershipApplicationDocument> {
    if (dto.status === ApplicationStatus.Pending) {
      throw new BadRequestException('Review must resolve to approved or declined');
    }

    const application = await this.applicationModel.findById(id).exec();
    if (!application) throw new NotFoundException('Application not found');
    if (application.status !== ApplicationStatus.Pending) {
      throw new BadRequestException('This application has already been reviewed');
    }

    if (dto.status === ApplicationStatus.Approved) {
      // Re-resolve in case the applicant registered after applying.
      const user =
        (application.user ? await this.usersService.findById(application.user.toString()) : null) ??
        (await this.usersService.findByEmail(application.email));

      if (user) {
        await this.usersService.setMembershipTier(user.id as string, application.tier);
        application.user = user._id;
      }
    }

    application.status = dto.status;
    application.reviewNote = dto.reviewNote ?? '';
    await application.save();
    return application;
  }

  countPending(): Promise<number> {
    return this.applicationModel.countDocuments({ status: ApplicationStatus.Pending }).exec();
  }
}
