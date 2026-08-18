/**
 * Idempotent seed. Upserts by slug / email, so running it repeatedly converges
 * on the same state rather than duplicating the catalogue.
 *
 *   npm run seed
 */
import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { CategorySchema } from '../categories/schemas/category.schema';
import { ProductSchema } from '../products/schemas/product.schema';
import { UserSchema } from '../users/schemas/user.schema';
import { CATEGORIES, PRODUCTS, SEED_USERS } from './data';
import { ProductStatus } from '../common/enums';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      '\n  MONGODB_URI is not set.\n  Copy .env.example to .env and paste your MongoDB Atlas connection string.\n',
    );
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to ${mongoose.connection.name}`);

  const CategoryModel = mongoose.model('Category', CategorySchema);
  const ProductModel = mongoose.model('Product', ProductSchema);
  const UserModel = mongoose.model('User', UserSchema);

  // --- Categories -----------------------------------------------------------
  // Two passes: parents must exist before a subcategory can point at one.
  // CATEGORIES is ordered top-level-first, but sorting makes that explicit
  // rather than a rule someone has to remember when editing the data file.
  const categoryIdBySlug = new Map<string, mongoose.Types.ObjectId>();
  const ordered = [
    ...CATEGORIES.filter((c) => !c.parentSlug),
    ...CATEGORIES.filter((c) => c.parentSlug),
  ];

  for (const { parentSlug, ...category } of ordered) {
    let parent: mongoose.Types.ObjectId | null = null;
    if (parentSlug) {
      parent = categoryIdBySlug.get(parentSlug) ?? null;
      if (!parent) throw new Error(`Unknown parent category slug "${parentSlug}"`);
    }

    const doc = await CategoryModel.findOneAndUpdate(
      { slug: category.slug },
      { $set: { ...category, parent } },
      { returnDocument: 'after', upsert: true },
    ).exec();
    categoryIdBySlug.set(category.slug, doc._id as mongoose.Types.ObjectId);
  }
  console.log(`Categories upserted: ${CATEGORIES.length}`);

  // --- Products -------------------------------------------------------------
  for (const product of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(product.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug "${product.categorySlug}"`);

    const { categorySlug: _ignored, ...rest } = product;
    await ProductModel.findOneAndUpdate(
      { slug: product.slug },
      {
        $set: {
          ...rest,
          compareAtPrice: product.compareAtPrice ?? null,
          isFeatured: product.isFeatured ?? false,
          isExclusive: product.isExclusive ?? false,
          category: categoryId,
          currency: 'PKR',
        },
      },
      { returnDocument: 'after', upsert: true },
    ).exec();
  }
  console.log(`Products upserted: ${PRODUCTS.length}`);

  // --- Users ----------------------------------------------------------------
  for (const user of SEED_USERS) {
    const existing = await UserModel.findOne({ email: user.email }).exec();
    if (existing) {
      // Refresh the role but leave a changed password alone.
      await UserModel.updateOne({ _id: existing._id }, { $set: { role: user.role } }).exec();
      continue;
    }
    await UserModel.create({
      email: user.email,
      passwordHash: await bcrypt.hash(user.password, 12),
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
  }
  console.log(`Users upserted: ${SEED_USERS.length}`);

  const [categories, products, published, users] = await Promise.all([
    CategoryModel.countDocuments().exec(),
    ProductModel.countDocuments().exec(),
    ProductModel.countDocuments({ status: ProductStatus.Published } as Record<string, unknown>).exec(),
    UserModel.countDocuments().exec(),
  ]);

  console.log('\n  Seed complete');
  console.log(`    categories ......... ${categories}`);
  console.log(`    products ........... ${products} (${published} published)`);
  console.log(`    users .............. ${users}`);
  console.log('\n  Sign in as:');
  for (const user of SEED_USERS) {
    console.log(`    ${user.role.padEnd(8)} ${user.email}  /  ${user.password}`);
  }
  console.log('');

  await mongoose.disconnect();
}

run().catch((error: unknown) => {
  console.error('\nSeed failed:', error instanceof Error ? error.message : error);
  void mongoose.disconnect();
  process.exit(1);
});
