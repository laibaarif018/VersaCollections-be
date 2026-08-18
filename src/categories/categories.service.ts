import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { UploadsService } from '../uploads/uploads.service';
import { categoryFolder } from '../uploads/folders';

type CategoryJson = ReturnType<CategoryDocument['toJSON']>;

/**
 * A category serialised for the storefront: the plain document plus the two
 * relations the UI needs to draw navigation and breadcrumbs in one round trip.
 * `parent` widens from an id to the resolved document.
 */
export type CategoryView = Omit<CategoryJson, 'parent'> & {
  parent: CategoryJson | null;
  children: CategoryJson[];
};

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    // Injected only to guard deletes — products own the relationship, not us.
    // Importing ProductsService here instead would create a module cycle.
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    private readonly uploadsService: UploadsService,
  ) {}

  findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).exec();
  }

  /**
   * The whole tree in one read. Two levels means one query and an in-memory
   * grouping — no `$graphLookup`, and the collection is small enough that
   * fetching it whole is cheaper than a lookup pipeline.
   */
  async findTree(): Promise<CategoryView[]> {
    const all = await this.findAll();

    const childrenByParent = new Map<string, CategoryDocument[]>();
    for (const category of all) {
      if (!category.parent) continue;
      const key = category.parent.toString();
      const bucket = childrenByParent.get(key);
      if (bucket) bucket.push(category);
      else childrenByParent.set(key, [category]);
    }

    return all
      .filter((category) => !category.parent)
      .map((parent) => ({
        ...parent.toJSON(),
        parent: null,
        children: (childrenByParent.get(parent._id.toString()) ?? []).map((c) => c.toJSON()),
      }));
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ slug: slug.toLowerCase() }).exec();
    if (!category) throw new NotFoundException(`No category with slug "${slug}"`);
    return category;
  }

  /** `findBySlug` plus its parent and children, for collection pages. */
  async findBySlugDetailed(slug: string): Promise<CategoryView> {
    const category = await this.findBySlug(slug);
    const [parent, children] = await Promise.all([
      category.parent ? this.categoryModel.findById(category.parent).exec() : null,
      this.childrenOf(category._id),
    ]);

    return {
      ...category.toJSON(),
      parent: parent ? parent.toJSON() : null,
      children: children.map((c) => c.toJSON()),
    };
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  /**
   * The category itself plus everything filed beneath it, so listing "Women"
   * also returns the products sitting in "Kurtis". A subcategory can never
   * have children of its own, so it short-circuits without a second query.
   */
  async descendantIds(category: CategoryDocument): Promise<Types.ObjectId[]> {
    if (category.parent) return [category._id];
    const children = await this.childrenOf(category._id);
    return [category._id, ...children.map((child) => child._id)];
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const clash = await this.categoryModel.findOne({ slug: dto.slug }).exec();
    if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    if (dto.parent) await this.assertValidParent(dto.parent);

    const created = await this.categoryModel.create({
      ...dto,
      parent: dto.parent ? new Types.ObjectId(dto.parent) : null,
    });
    await this.fileHeroImage(created);
    return created;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    if (dto.slug) {
      const clash = await this.categoryModel.findOne({ slug: dto.slug, _id: { $ne: id } }).exec();
      if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }

    const patch: Record<string, unknown> = { ...dto };
    if (dto.parent !== undefined) {
      if (dto.parent === null) {
        patch.parent = null;
      } else {
        await this.assertValidParent(dto.parent, id);
        // Moving a collection under another would push its own children to a
        // third level, which the storefront has no room to render.
        const children = await this.childrenOf(new Types.ObjectId(id));
        if (children.length > 0) {
          throw new BadRequestException(
            `${children.length} subcategor${children.length === 1 ? 'y sits' : 'ies sit'} under this collection — move them out before nesting it`,
          );
        }
        patch.parent = new Types.ObjectId(dto.parent);
      }
    }

    const category = await this.categoryModel.findByIdAndUpdate(id, patch, { returnDocument: 'after' }).exec();
    if (!category) throw new NotFoundException('Category not found');

    await this.fileHeroImage(category);
    return category;
  }

  /**
   * Files a collection's cover into `<root>/<year>/<collection>/<sub>/_cover/`.
   *
   * Best-effort for the same reason products are: a failed move leaves a
   * working image in the wrong folder, which is far better than a failed save.
   */
  private async fileHeroImage(category: CategoryDocument): Promise<void> {
    if (!category.heroImagePublicId) return;

    try {
      const parent = category.parent
        ? await this.categoryModel.findById(category.parent).exec()
        : null;

      const target = categoryFolder(
        this.uploadsService.rootFolder,
        this.uploadsService.yearFor(category.heroImagePublicId),
        parent ? parent.slug : category.slug,
        parent ? category.slug : null,
      );

      const moved = await this.uploadsService.moveTo(
        { url: category.heroImage, publicId: category.heroImagePublicId },
        target,
        'image',
      );

      if (moved.publicId !== category.heroImagePublicId) {
        category.heroImage = moved.url;
        category.heroImagePublicId = moved.publicId;
        await category.save();
      }
    } catch (error) {
      this.logger.warn(
        `Could not file hero image for category ${category.slug}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async remove(id: string): Promise<void> {
    const category = await this.findById(id);

    // Without these guards a delete silently orphans every product pointing
    // here, and every subcategory beneath it.
    const [children, products] = await Promise.all([
      this.categoryModel.countDocuments({ parent: category._id }).exec(),
      this.productModel.countDocuments({ category: category._id }).exec(),
    ]);

    if (children > 0) {
      throw new ConflictException(
        `"${category.name}" still has ${children} subcategor${children === 1 ? 'y' : 'ies'} — delete or move them first`,
      );
    }
    if (products > 0) {
      throw new ConflictException(
        `"${category.name}" still holds ${products} product${products === 1 ? '' : 's'} — move them to another collection first`,
      );
    }

    await this.categoryModel.findByIdAndDelete(id).exec();
  }

  countAll(): Promise<number> {
    return this.categoryModel.countDocuments().exec();
  }

  private childrenOf(parentId: Types.ObjectId): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ parent: parentId }).sort({ sortOrder: 1, name: 1 }).exec();
  }

  /**
   * Enforces the two-level cap: a parent must exist and must itself be
   * top-level, and nothing may be its own parent.
   */
  private async assertValidParent(parentId: string, selfId?: string): Promise<void> {
    if (selfId && parentId === selfId) {
      throw new BadRequestException('A collection cannot be its own parent');
    }

    const parent = await this.categoryModel.findById(parentId).exec();
    if (!parent) throw new BadRequestException('Parent collection not found');
    if (parent.parent) {
      throw new BadRequestException(
        `"${parent.name}" is already a subcategory — collections only nest two levels deep`,
      );
    }
  }
}
