import { ProductStatus, Role, StitchType } from '../common/enums';

export interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  heroImage: string;
  sortOrder: number;
  /** Slug of the collection this sits under. Omit for a top-level collection. */
  parentSlug?: string;
}

export interface SeedImage {
  url: string;
  alt: string;
}

export interface SeedColor {
  name: string;
  hex: string;
}

export interface SeedSizeChartRow {
  size: string;
  chest?: string;
  waist?: string;
  length?: string;
  sleeve?: string;
}

export interface SeedProduct {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  story: string;
  price: number;
  compareAtPrice?: number;
  images: SeedImage[];
  line: string;
  materials: string[];
  sizes: string[];
  colors: SeedColor[];
  fabric: string;
  stitchType: StitchType;
  sizeChart: SeedSizeChartRow[];
  stock: number;
  isFeatured?: boolean;
  isExclusive?: boolean;
  tags: string[];
  status: ProductStatus;
}

/**
 * Photography placeholders.
 *
 * These are real, verified Unsplash editorial fashion frames — but they are not
 * photographs of these specific garments, because these garments do not exist
 * yet. They are here so the storefront has something honest-looking to render
 * before the first real shoot. Every one is replaced the moment an admin
 * uploads an image through the panel, which writes a `/uploads/…` path instead.
 *
 * Stored bare, without query parameters: the storefront's `photo()` helper
 * appends its own sizing, and a URL that already carries a query string would
 * come out malformed.
 */
const U = 'https://images.unsplash.com';
const SHOT = {
  tailored: `${U}/photo-1784832555222-230841ae7b34`,
  cloth: `${U}/photo-1783881210962-1119b54ce6a4`,
  portrait: `${U}/photo-1785579274542-2714c03ef209`,
  detail: `${U}/photo-1783881210991-fe3c3c5759cd`,
  turned: `${U}/photo-1785088602176-468cf253fa5b`,
  shadow: `${U}/photo-1781909907688-7c26289069b8`,
  coat: `${U}/photo-1784822003391-3187ab4b10a5`,
  camel: `${U}/photo-1784613047036-2695adc87684`,
  scarf: `${U}/photo-1783881214840-f8e4cc635375`,
};

/** Reused by every stitched women's piece — one house block, one chart. */
const WOMENS_CHART: SeedSizeChartRow[] = [
  { size: 'XS', chest: '34 in', waist: '28 in', length: '40 in', sleeve: '22 in' },
  { size: 'S', chest: '36 in', waist: '30 in', length: '40 in', sleeve: '22.5 in' },
  { size: 'M', chest: '38 in', waist: '32 in', length: '41 in', sleeve: '23 in' },
  { size: 'L', chest: '40 in', waist: '34 in', length: '41 in', sleeve: '23.5 in' },
  { size: 'XL', chest: '42 in', waist: '36 in', length: '42 in', sleeve: '24 in' },
];

const KIDS_CHART: SeedSizeChartRow[] = [
  { size: '2–3Y', chest: '22 in', length: '24 in', sleeve: '12 in' },
  { size: '4–5Y', chest: '24 in', length: '27 in', sleeve: '14 in' },
  { size: '6–7Y', chest: '26 in', length: '30 in', sleeve: '16 in' },
  { size: '8–9Y', chest: '28 in', length: '33 in', sleeve: '18 in' },
  { size: '10–11Y', chest: '30 in', length: '36 in', sleeve: '20 in' },
];

/**
 * Top-level collections first, then their subcategories — the seed relies on
 * that ordering to resolve `parentSlug` to an id it has already written.
 */
export const CATEGORIES: SeedCategory[] = [
  {
    name: 'Women',
    slug: 'women',
    description:
      'Lawn, chiffon and khaddar cut for Lahore weather — unstitched by the suit, or finished and ready to wear.',
    heroImage: '',
    sortOrder: 1,
  },
  {
    name: 'Men',
    slug: 'men',
    description: 'Kurta shalwar and waistcoats in cloth chosen to survive a Punjabi summer.',
    heroImage: '',
    sortOrder: 2,
  },
  {
    name: 'Kids',
    slug: 'kids',
    description: 'Smaller versions of the same cloth, cut to be played in and washed often.',
    heroImage: '',
    sortOrder: 3,
  },

  // --- Women ------------------------------------------------------------------
  {
    name: 'Unstitched',
    slug: 'unstitched',
    description: 'Two- and three-piece suits, sold by the length for your own tailor.',
    heroImage: '',
    sortOrder: 1,
    parentSlug: 'women',
  },
  {
    name: 'Kurtis',
    slug: 'kurtis',
    description: 'Ready-to-wear shirts, stitched in the house block.',
    heroImage: '',
    sortOrder: 2,
    parentSlug: 'women',
  },
  {
    name: 'Formal Wear',
    slug: 'formal-wear',
    description: 'Hand-worked festive pieces for mehndi, nikah and everything the season demands.',
    heroImage: '',
    sortOrder: 3,
    parentSlug: 'women',
  },

  // --- Men --------------------------------------------------------------------
  {
    name: 'Kurta Shalwar',
    slug: 'kurta-shalwar',
    description: 'The everyday suit, in wash-and-wear and summer cottons.',
    heroImage: '',
    sortOrder: 1,
    parentSlug: 'men',
  },
  {
    name: 'Waistcoats',
    slug: 'waistcoats',
    description: 'Cut close over a kurta, for weddings and the offices that still ask for one.',
    heroImage: '',
    sortOrder: 2,
    parentSlug: 'men',
  },

  // --- Kids -------------------------------------------------------------------
  {
    name: 'Girls',
    slug: 'girls',
    description: 'Frocks and kurta sets, sized two to eleven years.',
    heroImage: '',
    sortOrder: 1,
    parentSlug: 'kids',
  },
  {
    name: 'Boys',
    slug: 'boys',
    description: 'Kurta shalwar and waistcoat sets, sized two to eleven years.',
    heroImage: '',
    sortOrder: 2,
    parentSlug: 'kids',
  },
];

/** Prices are paisa: 450000 = Rs 4,500. */
export const PRODUCTS: SeedProduct[] = [
  {
    name: 'Sahar Embroidered Lawn — 3 Piece',
    slug: 'sahar-embroidered-lawn-3-piece',
    categorySlug: 'unstitched',
    description:
      'A three-piece unstitched suit in 100% cotton lawn: an embroidered front, plain back and sleeves, a printed chiffon dupatta and cambric trouser. Sold by the suit, for your own tailor.',
    story:
      'Every house in Lahore prints lawn, and most of them print it heavy — because thicker cloth hides a cheaper screen. We went the other way. This is a 120-count lawn, light enough to see the shape of your hand through, which means every flaw in the printing shows. It took our printer in Faisalabad four attempts to hold the register on the neckline motif at that weight. He now claims it is the best thing he prints, and charges us accordingly.',
    price: 485000,
    compareAtPrice: 585000,
    images: [
      { url: SHOT.cloth, alt: 'Embroidered lawn falling in raking light' },
      { url: SHOT.detail, alt: 'The neckline embroidery, photographed close' },
      { url: SHOT.shadow, alt: 'The dupatta printed and folded' },
    ],
    line: 'Sahar',
    materials: ['100% cotton lawn', 'Chiffon dupatta', 'Cambric trouser'],
    sizes: [],
    colors: [
      { name: 'Ivory', hex: '#f3efe7' },
      { name: 'Tea Rose', hex: '#c9a29a' },
      { name: 'Indigo', hex: '#2f3d5c' },
    ],
    fabric: 'Lawn',
    stitchType: StitchType.Unstitched,
    sizeChart: [],
    stock: 40,
    isFeatured: true,
    tags: ['lawn', 'summer', 'three-piece'],
    status: ProductStatus.Published,
  },
  {
    name: 'Bagh Printed Lawn — 2 Piece',
    slug: 'bagh-printed-lawn-2-piece',
    categorySlug: 'unstitched',
    description:
      'Shirt and trouser lengths in printed lawn, no dupatta. For the weeks when you are buying three suits at a time and dupattas have stopped being the point.',
    story:
      'The two-piece exists because our customers told us the truth: they were buying six suits a season and wearing two dupattas. So we stopped charging for cloth nobody was using. The saving is passed on rather than pocketed — a two-piece here costs almost exactly the three-piece minus the dupatta, which is a duller commercial decision than it sounds and the reason we keep hearing about it.',
    price: 325000,
    images: [
      { url: SHOT.detail, alt: 'Printed lawn shirt length laid flat' },
      { url: SHOT.cloth, alt: 'The print in daylight' },
    ],
    line: 'Bagh',
    materials: ['100% cotton lawn'],
    sizes: [],
    colors: [
      { name: 'Sage', hex: '#9aa88f' },
      { name: 'Clay', hex: '#b07d62' },
    ],
    fabric: 'Lawn',
    stitchType: StitchType.Unstitched,
    sizeChart: [],
    stock: 55,
    tags: ['lawn', 'summer', 'two-piece'],
    status: ProductStatus.Published,
  },
  {
    name: 'Mehr Khaddar Winter Suit — 3 Piece',
    slug: 'mehr-khaddar-winter-suit',
    categorySlug: 'unstitched',
    description:
      'Loom-woven khaddar in a heavier winter count, with a wool-blend shawl and plain trouser. Cut for December in the north.',
    story:
      'Khaddar is handwoven, so no two lengths are identical — the slub runs differently down every piece, and a lot of brands treat that as a defect to be pressed out. We buy from a weaver in Kamalia who refuses to. The cloth arrives with the loom marks in it. It softens over three or four winters and never quite looks like anyone else’s.',
    price: 620000,
    images: [
      { url: SHOT.scarf, alt: 'Khaddar and a folded wool shawl' },
      { url: SHOT.cloth, alt: 'The weave, close, showing the slub' },
    ],
    line: 'Mehr',
    materials: ['Handwoven khaddar', 'Wool-blend shawl'],
    sizes: [],
    colors: [
      { name: 'Charcoal', hex: '#3a3a3a' },
      { name: 'Camel', hex: '#b18f6a' },
    ],
    fabric: 'Khaddar',
    stitchType: StitchType.Unstitched,
    sizeChart: [],
    stock: 28,
    isFeatured: true,
    tags: ['khaddar', 'winter', 'three-piece'],
    status: ProductStatus.Published,
  },
  {
    name: 'Noor Embroidered Kurti',
    slug: 'noor-embroidered-kurti',
    categorySlug: 'kurtis',
    description:
      'A straight-cut lawn kurti with thread-worked placket and side slits, stitched in the house block and ready to wear.',
    story:
      'Our stitched block came out of a year of complaints. Ready-to-wear in Pakistan is cut for a mannequin, not a person: the armhole is too high, the hip is too narrow and the length is decided by whatever uses least cloth. We fitted this one on eleven women in Lahore, in three sizes each, and moved the armhole down by an inch and a quarter. It is the least glamorous change we have ever made and the one people write to us about.',
    price: 385000,
    images: [
      { url: SHOT.tailored, alt: 'A straight-cut kurti photographed close' },
      { url: SHOT.portrait, alt: 'The placket embroidery at the collar' },
      { url: SHOT.turned, alt: 'The kurti from behind, showing the side slit' },
    ],
    line: 'Noor',
    materials: ['Cotton lawn', 'Viscose thread embroidery'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Ivory', hex: '#f3efe7' },
      { name: 'Powder Blue', hex: '#a8bcd0' },
      { name: 'Black', hex: '#171717' },
    ],
    fabric: 'Lawn',
    stitchType: StitchType.Stitched,
    sizeChart: WOMENS_CHART,
    stock: 34,
    isFeatured: true,
    tags: ['kurti', 'ready-to-wear', 'summer'],
    status: ProductStatus.Published,
  },
  {
    name: 'Rait Cambric Shirt',
    slug: 'rait-cambric-shirt',
    categorySlug: 'kurtis',
    description:
      'A plain cambric shirt with a mandarin collar and full sleeves. The one to own in three colours and stop thinking about.',
    story:
      'There is no story here and that is the point. It is a well-cut plain shirt in good cambric, priced so you can own several. Everything else in the collection is trying to be memorable; this is trying to be the thing you actually reach for on a Tuesday.',
    price: 295000,
    images: [
      { url: SHOT.detail, alt: 'A plain cambric shirt, collar detail' },
      { url: SHOT.tailored, alt: 'The shirt hanging, full length' },
    ],
    line: 'Rait',
    materials: ['Cotton cambric'],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: [
      { name: 'White', hex: '#fbfbf9' },
      { name: 'Stone', hex: '#b9b2a6' },
      { name: 'Olive', hex: '#5d6144' },
    ],
    fabric: 'Cambric',
    stitchType: StitchType.Stitched,
    sizeChart: WOMENS_CHART,
    stock: 62,
    tags: ['kurti', 'basics', 'ready-to-wear'],
    status: ProductStatus.Published,
  },
  {
    name: 'Zarin Hand-Worked Formal',
    slug: 'zarin-hand-worked-formal',
    categorySlug: 'formal-wear',
    description:
      'A chiffon formal with hand-done dabka and naqshi across the bodice, raw-silk trouser and a scalloped organza dupatta. Made to order in six to eight weeks.',
    story:
      'Nine hundred hours of hand work, spread across four karigars in Shahi Mohallah who have worked together for two decades. We tell you the hours because the number is the product — machine embroidery would render this in ninety minutes and it would look, to anyone who has seen the real thing, exactly like what it is. The scallop on the dupatta is cut and finished by hand last, after the fitting, because it cannot be done accurately before.',
    price: 4850000,
    images: [
      { url: SHOT.portrait, alt: 'Hand-worked bodice in low light' },
      { url: SHOT.detail, alt: 'Dabka and naqshi worked close on chiffon' },
      { url: SHOT.turned, alt: 'The organza dupatta, scalloped edge' },
    ],
    line: 'Zarin',
    materials: ['Pure chiffon', 'Raw silk', 'Organza', 'Dabka and naqshi hand work'],
    sizes: ['XS', 'S', 'M', 'L'],
    colors: [
      { name: 'Champagne', hex: '#d8c7a8' },
      { name: 'Deep Maroon', hex: '#5c1f26' },
    ],
    fabric: 'Chiffon',
    stitchType: StitchType.SemiStitched,
    sizeChart: WOMENS_CHART,
    stock: 6,
    isFeatured: true,
    isExclusive: true,
    tags: ['formal', 'bridal', 'hand-work'],
    status: ProductStatus.Published,
  },
  {
    name: 'Shab Organza Formal — 2 Piece',
    slug: 'shab-organza-formal-2-piece',
    categorySlug: 'formal-wear',
    description:
      'A sequinned organza shirt over a silk slip, with a matching dupatta. Lighter than it looks and considerably lighter than it photographs.',
    story:
      'Organza formals are notoriously miserable to wear — the cloth is stiff, the lining is hot and by the third hour of a mehndi you are counting the exits. We line ours in silk rather than the standard polyester, which costs roughly four times as much and is the single reason anyone keeps this one on all evening.',
    price: 2650000,
    compareAtPrice: 3200000,
    images: [
      { url: SHOT.shadow, alt: 'Sequinned organza catching light' },
      { url: SHOT.portrait, alt: 'The shirt over its silk slip' },
    ],
    line: 'Shab',
    materials: ['Organza', 'Silk lining', 'Hand-set sequins'],
    sizes: ['S', 'M', 'L'],
    colors: [
      { name: 'Pearl', hex: '#eae6df' },
      { name: 'Emerald', hex: '#1f5148' },
    ],
    fabric: 'Organza',
    stitchType: StitchType.Stitched,
    sizeChart: WOMENS_CHART,
    stock: 11,
    tags: ['formal', 'party', 'ready-to-wear'],
    status: ProductStatus.Published,
  },
  {
    name: 'Sada Wash-and-Wear Kurta Shalwar',
    slug: 'sada-wash-and-wear-kurta-shalwar',
    categorySlug: 'kurta-shalwar',
    description:
      'The standing suit, in a wash-and-wear blend that presses flat and stays flat through a Lahore working day.',
    story:
      'We tested nine wash-and-wear blends by wearing them, in June, from nine in the morning until the evening, and then photographing the shoulders. Six of them were finished by two o’clock. This one holds a crease at forty-two degrees, which is not a marketing claim so much as a description of the only test that matters here.',
    price: 545000,
    images: [
      { url: SHOT.coat, alt: 'A kurta shalwar hanging, shoulder detail' },
      { url: SHOT.tailored, alt: 'The collar and placket, close' },
    ],
    line: 'Sada',
    materials: ['Poly-cotton wash and wear'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'White', hex: '#fbfbf9' },
      { name: 'Grey', hex: '#8a8a86' },
      { name: 'Navy', hex: '#25314b' },
    ],
    fabric: 'Wash and Wear',
    stitchType: StitchType.Stitched,
    sizeChart: [
      { size: 'S', chest: '38 in', length: '40 in', sleeve: '23 in' },
      { size: 'M', chest: '40 in', length: '41 in', sleeve: '23.5 in' },
      { size: 'L', chest: '42 in', length: '42 in', sleeve: '24 in' },
      { size: 'XL', chest: '44 in', length: '43 in', sleeve: '24.5 in' },
      { size: 'XXL', chest: '46 in', length: '44 in', sleeve: '25 in' },
    ],
    stock: 48,
    tags: ['menswear', 'everyday'],
    status: ProductStatus.Published,
  },
  {
    name: 'Qila Raw Silk Waistcoat',
    slug: 'qila-raw-silk-waistcoat',
    categorySlug: 'waistcoats',
    description:
      'A five-button waistcoat in raw silk, cut close over a kurta with a shaped back and no vent.',
    story:
      'Most waistcoats sold with a kurta are cut from the suiting block — straight, boxy, and designed to sit over a shirt and tie. A kurta has no collar and no bulk at the waist, so that shape hangs off it. Ours is drafted from scratch over a kurta on the stand: higher armhole, shorter front point, shaped through the back. It looks obvious once it is on and it took three seasons to get there.',
    price: 875000,
    images: [
      { url: SHOT.camel, alt: 'A raw silk waistcoat over a kurta' },
      { url: SHOT.detail, alt: 'The button stand and shaped front point' },
    ],
    line: 'Qila',
    materials: ['Raw silk', 'Cotton lining'],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Black', hex: '#171717' },
      { name: 'Bottle Green', hex: '#1e4034' },
      { name: 'Oat', hex: '#cbbba0' },
    ],
    fabric: 'Raw Silk',
    stitchType: StitchType.Stitched,
    sizeChart: [
      { size: 'S', chest: '38 in', length: '27 in' },
      { size: 'M', chest: '40 in', length: '28 in' },
      { size: 'L', chest: '42 in', length: '29 in' },
      { size: 'XL', chest: '44 in', length: '30 in' },
    ],
    stock: 19,
    isFeatured: true,
    tags: ['menswear', 'wedding'],
    status: ProductStatus.Published,
  },
  {
    name: 'Gul Girls Lawn Frock',
    slug: 'gul-girls-lawn-frock',
    categorySlug: 'girls',
    description:
      'A gathered lawn frock with churidar pyjama, cut full so it can be run in. Sized two to eleven years.',
    story:
      'Children’s clothes here are usually miniature formalwear — scratchy net, a zip up the back and a child who wants it off within the hour. This is lawn, lined in lawn, closed with covered buttons rather than a zip, and cut with enough sweep to sit down in. We tested it the only way that counts, which was on a five-year-old at a family wedding.',
    price: 265000,
    images: [
      { url: SHOT.cloth, alt: 'A gathered lawn frock laid out' },
      { url: SHOT.detail, alt: 'The covered buttons at the back' },
    ],
    line: 'Gul',
    materials: ['Cotton lawn', 'Lawn lining'],
    sizes: ['2–3Y', '4–5Y', '6–7Y', '8–9Y', '10–11Y'],
    colors: [
      { name: 'Blush', hex: '#e6c9c4' },
      { name: 'Lemon', hex: '#e8d99a' },
    ],
    fabric: 'Lawn',
    stitchType: StitchType.Stitched,
    sizeChart: KIDS_CHART,
    stock: 37,
    tags: ['kids', 'girls', 'summer'],
    status: ProductStatus.Published,
  },
  {
    name: 'Chota Boys Kurta Shalwar Set',
    slug: 'chota-boys-kurta-shalwar-set',
    categorySlug: 'boys',
    description:
      'Kurta and shalwar in soft cotton with a mandarin collar, sized two to eleven years. Waistcoat sold separately.',
    story:
      'Cut from the men’s block, scaled down, and then changed in exactly one place: the collar is a full size looser. Every boy’s kurta we bought to study fastened tight at the throat, and every boy we watched wearing one had it undone within ten minutes. So we made the button sit where the child was going to put it anyway.',
    price: 285000,
    images: [
      { url: SHOT.tailored, alt: 'A boy’s kurta with a mandarin collar' },
      { url: SHOT.coat, alt: 'The kurta and shalwar laid together' },
    ],
    line: 'Chota',
    materials: ['Soft cotton'],
    sizes: ['2–3Y', '4–5Y', '6–7Y', '8–9Y', '10–11Y'],
    colors: [
      { name: 'White', hex: '#fbfbf9' },
      { name: 'Sky', hex: '#a9c3d6' },
      { name: 'Sand', hex: '#d3c3a4' },
    ],
    fabric: 'Cotton',
    stitchType: StitchType.Stitched,
    sizeChart: KIDS_CHART,
    stock: 41,
    tags: ['kids', 'boys', 'everyday'],
    status: ProductStatus.Published,
  },
  {
    name: 'Anaar Velvet Formal',
    slug: 'anaar-velvet-formal',
    categorySlug: 'formal-wear',
    description:
      'A velvet shirt with zardozi at the cuffs and hem. Currently being re-cut through the shoulder; returning for the winter season.',
    story:
      'We pulled the Anaar after one season. Velvet has no give, so a shoulder that fits on the stand binds the moment someone raises an arm — and this is a piece people wear to dance in. It is being re-drafted with a set-in sleeve and a deeper armhole. We would rather show you an empty peg than a shirt you cannot lift your arms in.',
    price: 3450000,
    images: [{ url: SHOT.shadow, alt: 'Velvet with zardozi work at the cuff' }],
    line: 'Anaar',
    materials: ['Silk velvet', 'Zardozi hand work'],
    sizes: ['S', 'M', 'L'],
    colors: [{ name: 'Pomegranate', hex: '#7a1f2b' }],
    fabric: 'Velvet',
    stitchType: StitchType.Stitched,
    sizeChart: WOMENS_CHART,
    stock: 0,
    tags: ['formal', 'winter'],
    status: ProductStatus.Draft,
  },
];

export const SEED_USERS = [
  {
    email: 'admin@versacollections.com',
    password: 'Versa!Admin2026',
    firstName: 'Amara',
    lastName: 'Reyes',
    role: Role.Admin,
  },
  {
    email: 'client@versacollections.com',
    password: 'Versa!Client2026',
    firstName: 'Jules',
    lastName: 'Moreau',
    role: Role.Customer,
  },
  {
    email: 'guest@versacollections.com',
    password: 'Versa!Guest2026',
    firstName: 'Noor',
    lastName: 'Haddad',
    role: Role.Customer,
  },
];
