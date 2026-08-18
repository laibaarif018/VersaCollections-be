import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Category, CategorySchema } from './schemas/category.schema';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [
    // Files collection covers once the category has been saved.
    UploadsModule,
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
      // Schema only, not ProductsModule — the service reads product counts to
      // guard deletes, and importing the module would close a dependency cycle.
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  providers: [CategoriesService],
  controllers: [CategoriesController],
  exports: [CategoriesService, MongooseModule],
})
export class CategoriesModule {}
