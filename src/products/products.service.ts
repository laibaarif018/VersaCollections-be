import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { QueryFilter, Model, SortOrder, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto, ProductSort } from './dto/product-query.dto';
import { Paginated, paginate } from '../common/dto/pagination.dto';
import { ProductStatus } from '../common/enums';
import { CategoriesService } from '../categories/categories.service';

const SORTS: Record<ProductSort, Record<string, SortOrder>> = {
  [ProductSort.Newest]: { createdAt: -1 },
  [ProductSort.PriceAsc]: { price: 1 },
  [ProductSort.PriceDesc]: { price: -1 },
  [ProductSort.NameAsc]: { name: 1 },
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly categoriesService: CategoriesService,
  ) {}

  /**
   * @param includeUnpublished admin listings see drafts and archived items;
   *   storefront requests are pinned to published only.
   */
  async find(query: ProductQueryDto, includeUnpublished = false): Promise<Paginated<ProductDocument>> {
    const filter: QueryFilter<ProductDocument> = {};

    if (includeUnpublished) {
      if (query.status) filter.status = query.status;
    } else {
      filter.status = ProductStatus.Published;
    }

    if (query.category) {
      const category = await this.categoriesService.findBySlug(query.category);
      filter.category = category._id;
    }
    if (query.line) filter.line = query.line;
    if (query.tag) filter.tags = query.tag;
    if (query.featured !== undefined) filter.isFeatured = query.featured;
    if (query.search) {
      const rx = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: rx }, { description: rx }, { line: rx }];
    }

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category')
        .sort(SORTS[query.sort ?? ProductSort.Newest])
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .exec(),
      this.productModel.countDocuments(filter).exec(),
    ]);

    return paginate(items, total, query.page, query.limit);
  }

  async findBySlug(slug: string, includeUnpublished = false): Promise<ProductDocument> {
    const filter: QueryFilter<ProductDocument> = { slug: slug.toLowerCase() };
    if (!includeUnpublished) filter.status = ProductStatus.Published;

    const product = await this.productModel.findOne(filter).populate('category').exec();
    if (!product) throw new NotFoundException(`No product with slug "${slug}"`);
    return product;
  }

  async findById(id: string): Promise<ProductDocument> {
    const product = await this.productModel.findById(id).populate('category').exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    const clash = await this.productModel.findOne({ slug: dto.slug }).exec();
    if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    // Surfaces a clear 404 rather than saving a product pointing at nothing.
    await this.categoriesService.findById(dto.category);

    const created = new this.productModel({
      ...dto,
      category: new Types.ObjectId(dto.category),
    });
    await created.save();
    return created.populate('category');
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    if (dto.slug) {
      const clash = await this.productModel.findOne({ slug: dto.slug, _id: { $ne: id } }).exec();
      if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }
    if (dto.category) await this.categoriesService.findById(dto.category);

    const patch: Record<string, unknown> = { ...dto };
    if (dto.category) patch.category = new Types.ObjectId(dto.category);

    const product = await this.productModel
      .findByIdAndUpdate(id, patch, { new: true })
      .populate('category')
      .exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
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
  async decrementStock(productId: Types.ObjectId | string, qty: number): Promise<boolean> {
    const result = await this.productModel
      .findOneAndUpdate(
        { _id: productId, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { new: true },
      )
      .exec();
    return result !== null;
  }

  async incrementStock(productId: Types.ObjectId | string, qty: number): Promise<void> {
    await this.productModel.findByIdAndUpdate(productId, { $inc: { stock: qty } }).exec();
  }

  countAll(): Promise<number> {
    return this.productModel.countDocuments().exec();
  }

  countPublished(): Promise<number> {
    return this.productModel.countDocuments({ status: ProductStatus.Published }).exec();
  }
}
