import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { clearAuthCookies, setAuthCookies } from './cookies';
import { REFRESH_COOKIE } from './auth.constants';
import { UsersService } from '../users/users.service';
import { CartService } from '../cart/cart.service';
import { SESSION_COOKIE } from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly cartService: CartService,
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
    await this.mergeGuestCart(req, user.id as string);
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
    await this.mergeGuestCart(req, user.id as string);
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

  @Get('me')
  @ApiOperation({ summary: 'Return the signed-in user' })
  async me(@CurrentUser() user: AuthUser) {
    return (await this.usersService.findByIdOrFail(user.id)).toJSON();
  }

  /** Folds anything in the anonymous bag into the account's cart on sign-in. */
  private async mergeGuestCart(req: Request, userId: string): Promise<void> {
    const sid = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (sid) await this.cartService.mergeGuestCartIntoUser(sid, userId);
  }
}
