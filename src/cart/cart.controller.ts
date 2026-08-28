import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CartOwner, CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ensureSessionId } from '../auth/cookies';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

/**
 * Every route is `@Public()` because guests must be able to build a bag — the
 * global guard still decodes the access cookie when present, so `user` is
 * populated for signed-in shoppers and the cart keys off their id instead.
 */
@ApiTags('cart')
@Public()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  private owner(user: AuthUser | null, req: Request, res: Response): CartOwner {
    if (user) return { userId: user.id };
    return { sessionId: ensureSessionId(req, res) };
  }

  @Get()
  @ApiOperation({ summary: 'Read the current bag with recomputed totals' })
  async get(
    @CurrentUser() user: AuthUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.get(this.owner(user, req, res));
  }

  @Post('items')
  @ApiOperation({ summary: 'Add a piece to the bag' })
  async add(
    @Body() dto: AddToCartDto,
    @CurrentUser() user: AuthUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.add(this.owner(user, req, res), dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Change a line quantity (0 removes it)' })
  async update(
    @Param('productId', ParseObjectIdPipe) productId: string,
    @Body() dto: UpdateCartItemDto,
    @CurrentUser() user: AuthUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.updateItem(
      this.owner(user, req, res),
      productId,
      dto,
    );
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a line from the bag' })
  async remove(
    @Param('productId', ParseObjectIdPipe) productId: string,
    @Query('size') size: string | undefined,
    @CurrentUser() user: AuthUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.removeItem(
      this.owner(user, req, res),
      productId,
      size,
    );
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the bag' })
  async clear(
    @CurrentUser() user: AuthUser | null,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.cartService.clear(this.owner(user, req, res));
  }
}
