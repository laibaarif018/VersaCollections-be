import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembershipService } from './membership.service';
import {
  ApplicationQueryDto,
  ApplyForMembershipDto,
  ReviewApplicationDto,
} from './dto/membership.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('membership')
@Controller('membership')
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Public()
  @Get('tiers')
  @ApiOperation({ summary: 'The three membership tiers and their benefits' })
  tiers() {
    return this.membershipService.tiers();
  }

  @Public()
  @Post('apply')
  @ApiOperation({ summary: 'Request an invitation' })
  async apply(@Body() dto: ApplyForMembershipDto) {
    const application = await this.membershipService.apply(dto);
    return {
      id: application.id as string,
      status: application.status,
      message: 'Your request is with the membership committee.',
    };
  }

  @Get('applications')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List membership applications (admin)' })
  async list(@Query() query: ApplicationQueryDto) {
    const result = await this.membershipService.list(query);
    return { ...result, items: result.items.map((a) => a.toJSON()) };
  }

  @Patch('applications/:id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Approve or decline an application (admin)' })
  async review(@Param('id') id: string, @Body() dto: ReviewApplicationDto) {
    return (await this.membershipService.review(id, dto)).toJSON();
  }
}
