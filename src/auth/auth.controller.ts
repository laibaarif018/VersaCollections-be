import { Body, Controller, Get, HttpCode, Logger, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { clearAuthCookies, setAuthCookies } from './cookies';
import { REFRESH_COOKIE } from './auth.constants';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { SESSION_COOKIE } from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create a customer account and sign in' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.register(dto);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    await this.adoptGuestActivity(req, user.id as string, user.email);
    return user.toJSON();
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign in and receive httpOnly auth cookies' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    await this.adoptGuestActivity(req, user.id as string, user.email);
    return user.toJSON();
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Rotate the access token using the refresh cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const { user, tokens } = await this.authService.refresh(token);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return user.toJSON();
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke the session and clear cookies' })
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(user.id);
    clearAuthCookies(res);
    return { success: true };
  }

  @Post('password/code')
  @HttpCode(200)
  @ApiOperation({ summary: 'Email yourself a code to authorise a password change' })
  async requestPasswordCode(@CurrentUser() user: AuthUser) {
    return this.authService.requestPasswordCode(user.id);
  }

  @Patch('password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change your own password' })
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user: updated, tokens } = await this.authService.changePassword(user.id, dto);
    // Keeps this browser signed in; every other session is now invalid.
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    return updated.toJSON();
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the signed-in user' })
  async me(@CurrentUser() user: AuthUser) {
    return (await this.usersService.findByIdOrFail(user.id)).toJSON();
  }

  /**
   * Carries anonymous activity over to the account on register or sign-in: the
   * bag they were building, and any guest orders they already placed.
   *
   * Deliberately best-effort — a failure here must not cost someone their
   * sign-in, which has already succeeded and set cookies by this point.
   */
  private async adoptGuestActivity(req: Request, userId: string, email: string): Promise<void> {
    const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
    try {
      if (sid) await this.cartService.mergeGuestCartIntoUser(sid, userId);
      await this.ordersService.claimForUser(userId, email, sid);
    } catch (error) {
      this.logger.warn(
        `Could not carry over guest activity for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
