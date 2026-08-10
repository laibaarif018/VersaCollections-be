import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateMembershipTierDto, UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update the signed-in customer profile' })
  async updateMe(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return (await this.usersService.updateProfile(user.id, dto)).toJSON();
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List users (admin)' })
  async list(@Query() query: UserQueryDto) {
    const result = await this.usersService.list(query);
    return { ...result, items: result.items.map((u) => u.toJSON()) };
  }

  @Patch(':id/membership')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Set a member tier directly (admin)' })
  async setTier(@Param('id') id: string, @Body() dto: UpdateMembershipTierDto) {
    return (await this.usersService.setMembershipTier(id, dto.membershipTier)).toJSON();
  }
}
