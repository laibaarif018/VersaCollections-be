import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  findAll(): Promise<CategoryDocument[]> {
    return this.categoryModel.find().sort({ sortOrder: 1, name: 1 }).exec();
  }

  async findBySlug(slug: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findOne({ slug: slug.toLowerCase() }).exec();
    if (!category) throw new NotFoundException(`No category with slug "${slug}"`);
    return category;
  }

  async findById(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel.findById(id).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const clash = await this.categoryModel.findOne({ slug: dto.slug }).exec();
    if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    return this.categoryModel.create(dto);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    if (dto.slug) {
      const clash = await this.categoryModel.findOne({ slug: dto.slug, _id: { $ne: id } }).exec();
      if (clash) throw new ConflictException(`Slug "${dto.slug}" is already in use`);
    }
    const category = await this.categoryModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Category not found');
  }

  countAll(): Promise<number> {
    return this.categoryModel.countDocuments().exec();
  }
}
