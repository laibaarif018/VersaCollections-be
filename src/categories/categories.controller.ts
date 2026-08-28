import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all collections' })
  async findAll() {
    return (await this.categoriesService.findAll()).map((c) => c.toJSON());
  }

  // Declared before `:slug` — Nest matches in declaration order, so the
  // reverse would have "tree" swallowed as a category slug.
  @Public()
  @Get('tree')
  @ApiOperation({
    summary: 'List top-level collections, each with its subcategories',
  })
  findTree() {
    return this.categoriesService.findTree();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Fetch one collection by slug, with its parent and subcategories',
  })
  findBySlug(@Param('slug') slug: string) {
    return this.categoriesService.findBySlugDetailed(slug);
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a collection (admin)' })
  async create(@Body() dto: CreateCategoryDto) {
    return (await this.categoriesService.create(dto)).toJSON();
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update a collection (admin)' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return (await this.categoriesService.update(id, dto)).toJSON();
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a collection (admin)' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    await this.categoriesService.remove(id);
  }
}
