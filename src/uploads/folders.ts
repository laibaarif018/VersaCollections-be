/**
 * Where a file lives in Cloudinary.
 *
 * The tree is meant to be browsable as an archive, one year at a time:
 *
 *   versacollections/
 *     2026/
 *       _staging/                  fresh uploads, before they are filed
 *       hero/                      landing-page hero slides
 *       women/
 *         _cover/                  the collection's own hero image
 *         pret/
 *           _cover/
 *           68f2a1c9…/             one folder per product
 *     2027/                        same shape, next year
 *
 * Kept as pure functions with no Cloudinary or Nest dependency so the scheme
 * can be reasoned about — and tested — on its own.
 */

/** Underscore-prefixed so reserved folders sort together and never collide
 *  with a category slug, which is always lowercase letters and hyphens. */
const STAGING = '_staging';
const COVER = '_cover';
const HERO = 'hero';
const EDITORIAL = 'editorial';

/**
 * The calendar year an asset is filed under. Uploads use "now"; a move keeps
 * whatever year the asset already carries, so re-filing a 2026 product in
 * January does not drag its photographs into 2027.
 */
export function currentYear(): string {
  return String(new Date().getFullYear());
}

/** Where a fresh upload lands before the product it belongs to exists. */
export function stagingFolder(root: string, year: string): string {
  return `${root}/${year}/${STAGING}`;
}

/** Landing-page hero media. The settings singleton has no id, so no staging. */
export function heroFolder(root: string, year: string): string {
  return `${root}/${year}/${HERO}`;
}

/** The editorial bands further down the landing page. Also unstaged. */
export function editorialFolder(root: string, year: string): string {
  return `${root}/${year}/${EDITORIAL}`;
}

/** A collection's or subcategory's own cover image. */
export function categoryFolder(
  root: string,
  year: string,
  collectionSlug: string,
  subcategorySlug?: string | null,
): string {
  return [root, year, collectionSlug, subcategorySlug, COVER].filter(Boolean).join('/');
}

/**
 * A product's own folder. `subcategorySlug` is omitted for a product filed
 * directly under a top-level collection, which is legal — the segment simply
 * does not appear.
 */
export function productFolder(
  root: string,
  year: string,
  collectionSlug: string,
  subcategorySlug: string | null | undefined,
  productId: string,
): string {
  return [root, year, collectionSlug, subcategorySlug, productId].filter(Boolean).join('/');
}

/** The folder part of a public id — everything before the final segment. */
export function folderOf(publicId: string): string {
  const cut = publicId.lastIndexOf('/');
  return cut === -1 ? '' : publicId.slice(0, cut);
}

/** The bare filename part of a public id, with no folders. */
export function nameOf(publicId: string): string {
  return publicId.slice(publicId.lastIndexOf('/') + 1);
}

/**
 * The year an existing asset is already filed under, so a move can preserve
 * it. Falls back to the current year for anything unrecognisable.
 */
export function yearOf(root: string, publicId: string): string {
  const match = new RegExp(`^${root}/(\\d{4})/`).exec(publicId);
  return match ? match[1] : currentYear();
}

/**
 * Guards deletion. A public id must sit inside our own root folder — without
 * this an admin could destroy any asset in the whole Cloudinary account.
 */
export function isInsideRoot(root: string, publicId: string): boolean {
  return publicId.startsWith(`${root}/`) && !publicId.includes('..');
}
