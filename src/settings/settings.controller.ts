import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/settings.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Delivery charge and currency — everything the cart needs to quote' })
  findPublic() {
    return this.settingsService.publicView();
  }

  /**
   * Public, because checkout does not require an account — a guest has to be
   * able to read the payment instructions on their own order page.
   *
   * This was signed-in only until guest checkout landed. Gating it bought
   * little in practice: anyone could register, or simply place an order, to
   * reach the same details, and these are the shop's own receiving accounts —
   * the sort of thing printed on an invoice. Only *enabled* methods are
   * returned, so an account switched off in the admin never leaves the server.
   */
  @Public()
  @Get('payment')
  @ApiOperation({ summary: 'Where to send the delivery charge' })
  findPayment() {
    return this.settingsService.paymentView();
  }

  @Get('all')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'The whole settings document (admin)' })
  async findAll() {
    return (await this.settingsService.get()).toJSON();
  }

  @Patch()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update store settings (admin)' })
  async update(@Body() dto: UpdateSettingsDto) {
    return (await this.settingsService.update(dto)).toJSON();
  }
}
