import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { UserQueryDto } from './dto/user-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

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

  @Get(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Fetch one user by id (admin)' })
  async findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return (await this.usersService.findByIdOrFail(id)).toJSON();
  }

  /**
   * Create an account for someone else — in practice, a second administrator.
   *
   * There is no invitation email: SMTP is optional in this deployment, so the
   * admin sets the first password here and passes it on. The new account signs
   * in through the ordinary login route and can change it from there.
   */
  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a user, optionally an admin (admin)' })
  async create(@Body() dto: CreateUserDto) {
    return (await this.usersService.createByAdmin(dto)).toJSON();
  }
}
