import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  QueryFilter,
  Model,
  PopulateOptions,
  SortOrder,
  Types,
} from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { ProductStatus } from '../common/enums';
import { escapeRegExp } from '../common/regex';
import { CategoriesService } from '../categories/categories.service';
import { UploadsService } from '../uploads/uploads.service';
import { productFolder } from '../uploads/folders';

/**
 * Categories nest one level, so a product's own category is not enough to draw
 * a breadcrumb — "Kurtis" needs "Women" above it. Every read populates both.
 */
const CATEGORY_POPULATE: PopulateOptions = {
  path: 'category',
  populate: { path: 'parent' },
};

const SORTS: Record<ProductSort, Record<string, SortOrder>> = {
  [ProductSort.Newest]: { createdAt: -1 },
  [ProductSort.PriceAsc]: { price: 1 },
  [ProductSort.PriceDesc]: { price: -1 },
  [ProductSort.NameAsc]: { name: 1 },
};

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly categoriesService: CategoriesService,
    private readonly uploadsService: UploadsService,
  ) {}

  /**
   * @param includeUnpublished admin listings see drafts and archived items;
   *   storefront requests are pinned to published only.
   */
  async find(
    query: ProductQueryDto,
    includeUnpublished = false,
  ): Promise<Paginated<ProductDocument>> {
    const filter: QueryFilter<ProductDocument> = {};

    if (includeUnpublished) {
      if (query.status) filter.status = query.status;
    } else {
      filter.status = ProductStatus.Published;
    }

    if (query.category) {
      const category = await this.categoriesService.findBySlug(query.category);
      // A top-level collection lists everything beneath it too, so "Women"
      // shows the pieces filed directly under it *and* those under "Kurtis".
      filter.category = {
        $in: await this.categoriesService.descendantIds(category),
      };
    }
    if (query.line) filter.line = query.line;
    if (query.tag) filter.tags = query.tag;
    if (query.featured !== undefined) filter.isFeatured = query.featured;
    if (query.search) {
      const rx = new RegExp(escapeRegExp(query.search), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { line: rx }];
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate(CATEGORY_POPULATE)
        .sort(SORTS[query.sort ?? ProductSort.Newest])
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findBySlug(
    slug: string,
    includeUnpublished = false,
  ): Promise<ProductDocument> {
    const filter: QueryFilter<ProductDocument> = { slug: slug.toLowerCase() };
    if (!includeUnpublished) filter.status = ProductStatus.Published;

    const product = await this.productModel
      .findOne(filter)
      .populate(CATEGORY_POPULATE)
      .exec();
    if (!product) throw new NotFoundException(`No product with slug "${slug}"`);
    return product;
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate(CATEGORY_POPULATE)
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    const clash = await this.productModel.findOne({ slug: dto.slug }).exec();
    if (clash)
      throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    // Surfaces a clear 404 rather than saving a product pointing at nothing.
    await this.categoriesService.findById(dto.category);

    const created = new this.productModel({
      ...dto,
      category: new Types.ObjectId(dto.category),
    });
    await created.save();
    await created.populate(CATEGORY_POPULATE);

    // Only now does an id exist, which is the whole reason images stage first.
    await this.fileImages(created);
    return created;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    if (dto.slug) {
      const clash = await this.productModel
        .findOne({ slug: dto.slug, _id: { $ne: id } })
        .exec();
      if (clash)
        throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }
    if (dto.category) await this.categoriesService.findById(dto.category);

    const patch: Record<string, unknown> = { ...dto };
    if (dto.category) patch.category = new Types.ObjectId(dto.category);

    const product = await this.productModel
      .findByIdAndUpdate(id, patch, { returnDocument: 'after' })
      .populate(CATEGORY_POPULATE)
      .exec();
    if (!product) throw new NotFoundException('Product not found');

    // Recomputed from the *current* category every time, so this covers both a
    // newly staged image and a product moved to a different collection.
    await this.fileImages(product);
    return product;
  }

  /**
   * Files a product's images into `<root>/<year>/<collection>/<sub>/<id>/`.
   *
   * Deliberately best-effort. A failed move must never fail the save: the
   * staging URL is still a perfectly good delivery URL, so the worst outcome is
   * a correctly-working product whose asset sits in the wrong folder — and the
   * next save will try again, because the target is recomputed each time.
   */
  private async fileImages(product: ProductDocument): Promise<void> {
    if (product.images.length === 0) return;

    // Populated by CATEGORY_POPULATE, which pulls the category and its parent —
    // exactly the two slugs the folder path is built from.
    const category = product.category as unknown as {
      slug?: string;
      parent?: { slug?: string } | null;
    };
    const collectionSlug = category?.parent?.slug ?? category?.slug;
    const subcategorySlug = category?.parent?.slug ? category.slug : null;
    if (!collectionSlug) return;

    let changed = false;

    for (const image of product.images) {
      if (!image.publicId) continue;
      try {
        const target = productFolder(
          this.uploadsService.rootFolder,
          this.uploadsService.yearFor(image.publicId),
          collectionSlug,
          subcategorySlug,
          String(product._id),
        );
        const moved = await this.uploadsService.moveTo(
          { url: image.url, publicId: image.publicId },
          target,
          'image',
        );
        if (moved.publicId !== image.publicId) {
          image.url = moved.url;
          image.publicId = moved.publicId;
          changed = true;
        }
      } catch (error) {
        this.logger.warn(
          `Could not file image ${image.publicId} for product ${String(product._id)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    if (changed) await product.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Product not found');
  }

  /**
   * Conditionally decrements stock. The `stock: { $gte: qty }` guard makes the
   * check-and-decrement a single atomic operation, so two shoppers racing for
   * the last piece cannot both win.
   */
  async decrementStock(
    productId: Types.ObjectId | string,
    qty: number,
  ): Promise<boolean> {
    const result = await this.productModel
      .findOneAndUpdate(
        { _id: productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { returnDocument: 'after' },
      )
      .exec();
    return result !== null;
  }

  async incrementStock(
    productId: Types.ObjectId | string,
    qty: number,
  ): Promise<void> {
    await this.productModel
      .findByIdAndUpdate(productId, { $inc: { stock: qty } })
      .exec();
  }

  /** Called by `ReviewsService` whenever a review's approval status settles. */
  async updateRating(
    productId: Types.ObjectId | string,
    average: number,
    count: number,
  ): Promise<void> {
    await this.productModel
      .findByIdAndUpdate(productId, {
        ratingAverage: average,
        ratingCount: count,
      })
      .exec();
  }

  countAll(): Promise<number> {
    return this.productModel.countDocuments().exec();
  }

  countPublished(): Promise<number> {
    return this.productModel
      .countDocuments({ status: ProductStatus.Published })
      .exec();
  }
}
