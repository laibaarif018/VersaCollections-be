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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'List products. Admins additionally see drafts and archived items.',
  })
  async find(
    @Query() query: ProductQueryDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    const result = await this.productsService.find(
      query,
      user?.role === Role.Admin,
    );
    return { ...result, items: result.items.map((p) => p.toJSON()) };
  }

  // Declared before ':slug' so the literal segment wins the route match.
  @Get('by-id/:id')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Fetch one product by id regardless of status (admin)',
  })
  async findById(@Param('id', ParseObjectIdPipe) id: string) {
    return (await this.productsService.findById(id)).toJSON();
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Fetch one product by slug' })
  async findBySlug(
    @Param('slug') slug: string,
    @CurrentUser() user: AuthUser | null,
  ) {
    const product = await this.productsService.findBySlug(
      slug,
      user?.role === Role.Admin,
    );
    return product.toJSON();
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Create a product (admin)' })
  async create(@Body() dto: CreateProductDto) {
    return (await this.productsService.create(dto)).toJSON();
  }

  @Patch(':id')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Update a product (admin)' })
  async update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return (await this.productsService.update(id, dto)).toJSON();
  }

  @Delete(':id')
  @Roles(Role.Admin)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a product (admin)' })
  async remove(@Param('id', ParseObjectIdPipe) id: string) {
    await this.productsService.remove(id);
  }
}
