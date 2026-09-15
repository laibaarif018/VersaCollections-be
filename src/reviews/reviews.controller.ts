import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { SubmitReviewDto, ModerateReviewDto } from './dto/review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, ReviewStatus } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'List reviews. Anonymous and customer callers only ever see approved ones; admins may filter by status.',
  })
  async find(
    @Query() query: ReviewQueryDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    if (user?.role !== Role.Admin) query.status = ReviewStatus.Approved;
    const result = await this.reviewsService.findAll(query);
    return { ...result, items: result.items.map((r) => r.toJSON()) };
  }

  @Get('mine')
  @ApiOperation({
    summary: "The signed-in customer's own review for a product, any status",
  })
  async mine(
    @Query('product', ParseObjectIdPipe) product: string,
    @CurrentUser() user: AuthUser,
  ) {
    const review = await this.reviewsService.findMineForProduct(
      user.id,
      product,
    );
    return review ? review.toJSON() : null;
  }

  @Post()
  @ApiOperation({ summary: 'Submit or edit your review for a product' })
  async submit(@Body() dto: SubmitReviewDto, @CurrentUser() user: AuthUser) {
    return (await this.reviewsService.submit(user.id, dto)).toJSON();
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Approve or reject a review (admin)' })
  async moderate(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: ModerateReviewDto,
  ) {
    return (await this.reviewsService.moderate(id, dto)).toJSON();
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a review (admin)' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    await this.reviewsService.remove(id);
  }
}
