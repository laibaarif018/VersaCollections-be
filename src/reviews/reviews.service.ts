import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { SubmitReviewDto, ModerateReviewDto } from './dto/review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { ReviewStatus } from '../common/enums';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Creates or overwrites this customer's one review for the product. Either
   * way the result re-enters moderation as `Pending` — an edit is not
   * grandfathered in on the previous approval.
   */
  async submit(userId: string, dto: SubmitReviewDto): Promise<ReviewDocument> {
    // 404s on a bad id rather than silently attaching a review to nothing.
    await this.productsService.findById(dto.productId);
    const user = await this.usersService.findByIdOrFail(userId);
    const verifiedPurchase = await this.ordersService.hasDelivered(
      userId,
      dto.productId,
    );

    const review = await this.reviewModel
      .findOneAndUpdate(
        {
          product: new Types.ObjectId(dto.productId),
          user: new Types.ObjectId(userId),
        },
        {
          $set: {
            reviewerName: `${user.firstName} ${user.lastName}`.trim(),
            rating: dto.rating,
            comment: dto.comment,
            verifiedPurchase,
            status: ReviewStatus.Pending,
          },
        },
        { upsert: true, returnDocument: 'after' },
      )
      .exec();

    // Handles the edit case: a previously-approved review dropping back to
    // Pending must stop counting toward the average immediately, not wait
    // for the next moderation pass.
    await this.recomputeRating(dto.productId);
    return review;
  }

  /**
   * Backs both the storefront's per-product list (forced to `status=Approved`
   * by the controller) and the admin moderation queue — same shape either
   * way, `product` always populated with just enough to label a table row.
   */
  async findAll(query: ReviewQueryDto): Promise<Paginated<ReviewDocument>> {
    const filter: QueryFilter<ReviewDocument> = {};
    if (query.product) filter.product = new Types.ObjectId(query.product);
    if (query.status) filter.status = query.status;
    return this.paginateReviews(filter, query, {
      path: 'product',
      select: 'name slug',
    });
  }

  private async paginateReviews(
    filter: QueryFilter<ReviewDocument>,
    query: ReviewQueryDto,
    populate?: { path: string; select: string },
  ): Promise<Paginated<ReviewDocument>> {
    const base = this.reviewModel.find(filter);
    if (populate) base.populate(populate);

    const [items, total] = await Promise.all([
      base
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);
    return paginate(items, total, query.page, query.limit);
  }

  /** The signed-in customer's own review for this product, any status — lets
   *  the storefront show "your review is awaiting approval" or prefill an edit. */
  findMineForProduct(
    userId: string,
    productId: string,
  ): Promise<ReviewDocument | null> {
    return this.reviewModel
      .findOne({
        user: new Types.ObjectId(userId),
        product: new Types.ObjectId(productId),
      })
      .exec();
  }

  async moderate(id: string, dto: ModerateReviewDto): Promise<ReviewDocument> {
    const review = await this.reviewModel
      .findByIdAndUpdate(
        id,
        { status: dto.status },
        { returnDocument: 'after' },
      )
      .exec();
    if (!review) throw new NotFoundException('Review not found');
    await this.recomputeRating(String(review.product));
    return review;
  }

  async remove(id: string): Promise<void> {
    const review = await this.reviewModel.findByIdAndDelete(id).exec();
    if (!review) throw new NotFoundException('Review not found');
    await this.recomputeRating(String(review.product));
  }

  /** Recomputes a product's denormalized rating from its approved reviews. */
  private async recomputeRating(productId: string): Promise<void> {
    const [agg] = await this.reviewModel
      .aggregate<{ average: number; count: number }>([
        {
          $match: {
            product: new Types.ObjectId(productId),
            status: ReviewStatus.Approved,
          },
        },
        {
          $group: {
            _id: null,
            average: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    await this.productsService.updateRating(
      productId,
      agg ? Math.round(agg.average * 10) / 10 : 0,
      agg ? agg.count : 0,
    );
  }
}
