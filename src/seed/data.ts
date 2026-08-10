import { MembershipTier, ProductStatus, Role } from '../common/enums';

export interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  heroImage: string;
  sortOrder: number;
}

export interface SeedProduct {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  story: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  imageAlt: string;
  line: string;
  materials: string[];
  sizes: string[];
  stock: number;
  isFeatured?: boolean;
  isExclusive?: boolean;
  membershipOnly?: boolean;
  tags: string[];
  status: ProductStatus;
}

export const CATEGORIES: SeedCategory[] = [
  {
    name: 'Leather Goods',
    slug: 'leather-goods',
    description:
      'Vegetable-tanned hides finished by hand, cut so the grain runs true across every panel.',
    heroImage: '/images/collection-leather.svg',
    sortOrder: 1,
  },
  {
    name: 'Fine Jewellery',
    slug: 'fine-jewellery',
    description: 'Solid gold and single stones. Nothing plated, nothing hollow, nothing hurried.',
    heroImage: '/images/collection-jewellery.svg',
    sortOrder: 2,
  },
  {
    name: 'Outerwear',
    slug: 'outerwear',
    description: 'Cashmere, vicuña and dense wool cloth, tailored to soften rather than wear out.',
    heroImage: '/images/collection-outerwear.svg',
    sortOrder: 3,
  },
  {
    name: 'Objects',
    slug: 'objects',
    description: 'For the desk, the hallway, the hand. Small things made to outlast their owner.',
    heroImage: '/images/collection-objects.svg',
    sortOrder: 4,
  },
];

export const PRODUCTS: SeedProduct[] = [
  {
    name: 'Nocturne Tote',
    slug: 'nocturne-tote',
    categorySlug: 'leather-goods',
    description:
      'A single-piece tote in black calfskin, closed by a folded flap and a brushed brass tongue. Unlined, so the leather is asked to be the structure rather than hide behind one.',
    story:
      'The Nocturne began as a refusal. Our leatherworkers had been asked, for the third season running, to add a lining — and for the third time they declined. A lining, they argued, is where a bag goes to hide its faults. So the Nocturne carries none. Every interior seam is skived, folded and burnished by hand, which means the inside of this tote is finished to precisely the standard of the outside. It takes four hours longer to make. It is the only version worth making.',
    price: 289000,
    image: '/images/product-nocturne-tote.svg',
    imageAlt: 'Black calfskin tote with brushed brass closure, lit low against dark stone',
    line: 'Nocturne',
    materials: ['Vegetable-tanned calfskin', 'Brushed brass'],
    sizes: [],
    stock: 8,
    isFeatured: true,
    isExclusive: true,
    tags: ['bags', 'signature'],
    status: ProductStatus.Published,
  },
  {
    name: 'Meridian Weekender',
    slug: 'meridian-weekender',
    categorySlug: 'leather-goods',
    description:
      'Four days of luggage in a bag that fits an overhead locker. Full-grain bridle leather over a hand-stitched frame, with solid brass hardware that will patinate rather than tarnish.',
    story:
      'Bridle leather was made for horses — for tack that would be rained on, sweated into and pulled hard for thirty years. We use it because we could not find anything that failed more slowly. The Meridian is stitched with waxed linen thread at eight stitches to the inch, entirely by hand. Machine stitching is faster and, when one stitch breaks, the seam unzips. A hand-stitched seam holds. That is the whole argument.',
    price: 412000,
    image: '/images/product-meridian-weekender.svg',
    imageAlt: 'Tan bridle leather weekend bag with brass fittings on a dark surface',
    line: 'Meridian',
    materials: ['Full-grain bridle leather', 'Solid brass', 'Waxed linen thread'],
    sizes: [],
    stock: 5,
    isFeatured: true,
    tags: ['bags', 'travel'],
    status: ProductStatus.Published,
  },
  {
    name: 'Archive Card Case',
    slug: 'archive-card-case',
    categorySlug: 'leather-goods',
    description:
      'Six pockets cut from one hide, folded rather than joined. Slim enough to forget, substantial enough to keep.',
    story:
      'Most card cases are five pieces of leather glued into the shape of a card case. Ours is one piece, folded — which sounds simpler and is considerably harder, because a single hide must be pared to three different thicknesses across its length so the folds sit flat. Our workshop calls this piece the apprentice test. Nobody joins the leather floor without making one that passes.',
    price: 42000,
    image: '/images/product-archive-card-case.svg',
    imageAlt: 'Slim folded leather card case in oxblood, photographed from above',
    line: 'Archive',
    materials: ['Vegetable-tanned calfskin'],
    sizes: [],
    stock: 24,
    isFeatured: false,
    tags: ['small-leather-goods', 'gifts'],
    status: ProductStatus.Published,
  },
  {
    name: 'Solstice Signet',
    slug: 'solstice-signet',
    categorySlug: 'fine-jewellery',
    description:
      'A signet in 18-carat yellow gold, cast solid and finished with a hand-planished face left deliberately unengraved.',
    story:
      'A signet was once a signature — pressed into wax, it closed a letter and said who had written it. We leave the face blank on purpose. The ring is finished, the tradition is not: what goes there is yours to decide, and our engraver in the Marais will cut it by hand when you have decided. Some clients wait years. One waited eleven.',
    price: 178000,
    image: '/images/product-solstice-signet.svg',
    imageAlt: 'Solid 18-carat gold signet ring with a blank planished face',
    line: 'Solstice',
    materials: ['18ct yellow gold'],
    sizes: ['48', '50', '52', '54', '56', '58', '60'],
    stock: 14,
    isFeatured: true,
    tags: ['jewellery', 'gold'],
    status: ProductStatus.Published,
  },
  {
    name: 'Obsidian Line Bracelet',
    slug: 'obsidian-line-bracelet',
    categorySlug: 'fine-jewellery',
    description:
      'Black spinel set in a continuous line of blackened white gold. Worn, it reads as a shadow at the wrist rather than a stone.',
    story:
      'We spent a season trying to make a black diamond bracelet and failed — black diamonds are brittle, and setting forty of them in a line meant losing four to the setter every time. Black spinel is harder to source and easier to trust. The metal is rhodium-blackened white gold, which will wear through at the clasp in perhaps a decade. We will re-black it, without charge, for as long as the house stands.',
    price: 246000,
    compareAtPrice: 289000,
    image: '/images/product-obsidian-bracelet.svg',
    imageAlt: 'Blackened white gold bracelet set with a line of black spinel stones',
    line: 'Nocturne',
    materials: ['Blackened 18ct white gold', 'Black spinel'],
    sizes: ['16cm', '17cm', '18cm', '19cm'],
    stock: 6,
    isFeatured: false,
    isExclusive: true,
    tags: ['jewellery', 'stones'],
    status: ProductStatus.Published,
  },
  {
    name: 'Ember Drop Earrings',
    slug: 'ember-drop-earrings',
    categorySlug: 'fine-jewellery',
    description:
      'Two brilliant-cut citrines suspended from a hand-drawn gold thread so fine it disappears at conversational distance.',
    story:
      'The thread is drawn down to 0.4 millimetres — thin enough that the stone appears to hang in the air. Drawing gold that fine work-hardens it, so it must be annealed four times on the way down, each time in a reducing flame to keep the surface clean. Our jeweller describes the process as "arguing with the metal until it agrees."',
    price: 134000,
    image: '/images/product-ember-earrings.svg',
    imageAlt: 'Citrine drop earrings on fine gold threads catching warm light',
    line: 'Solstice',
    materials: ['18ct yellow gold', 'Citrine'],
    sizes: [],
    stock: 11,
    isFeatured: false,
    tags: ['jewellery', 'stones'],
    status: ProductStatus.Published,
  },
  {
    name: 'Vicuña Overcoat',
    slug: 'vicuna-overcoat',
    categorySlug: 'outerwear',
    description:
      'An unstructured overcoat in pure vicuña, undyed. The fibre is twelve microns; the coat weighs less than a heavy shirt and is warmer than anything else we make.',
    story:
      'Vicuña can be shorn only once every two years, and only in the wild, under a chaccu — a communal round-up practised in the Andes since before the Inca. One animal yields around 200 grams of usable fibre. This coat takes the annual yield of roughly thirty animals, all of them released unharmed. We buy from two co-operatives, both of which we have visited, and we will tell you which one made your cloth if you ask.',
    price: 1840000,
    image: '/images/product-vicuna-overcoat.svg',
    imageAlt: 'Undyed vicuña overcoat draped over a stand in low warm light',
    line: 'Atelier Reserve',
    materials: ['100% wild vicuña'],
    sizes: ['46', '48', '50', '52', '54'],
    stock: 3,
    isFeatured: true,
    isExclusive: true,
    membershipOnly: true,
    tags: ['outerwear', 'reserve'],
    status: ProductStatus.Published,
  },
  {
    name: 'Cashmere Travel Coat',
    slug: 'cashmere-travel-coat',
    categorySlug: 'outerwear',
    description:
      'Double-faced Mongolian cashmere, joined entirely by hand so the coat has no lining and no visible seam allowance on either face.',
    story:
      'Double-facing is the quietest luxury in tailoring and the least visible: two layers of cloth are split, then rejoined by hand with a saddle stitch that never shows on either side. A single coat takes one tailor around forty hours. The result reverses cleanly, though almost nobody wears it that way. They simply notice that it hangs differently.',
    price: 685000,
    image: '/images/product-cashmere-coat.svg',
    imageAlt: 'Camel double-faced cashmere coat photographed against a dark ground',
    line: 'Meridian',
    materials: ['Double-faced Mongolian cashmere'],
    sizes: ['46', '48', '50', '52', '54'],
    stock: 7,
    isFeatured: false,
    tags: ['outerwear'],
    status: ProductStatus.Published,
  },
  {
    name: 'Nocturne Wool Scarf',
    slug: 'nocturne-wool-scarf',
    categorySlug: 'outerwear',
    description:
      'A generously long scarf in brushed lambswool, woven on a loom slow enough to keep the hand soft.',
    story:
      'Woven in a mill in the Scottish Borders on a loom built in 1963, at roughly a fifth of modern commercial speed. Running slowly means less tension on the yarn, which means the finished cloth is loftier and does not flatten after a winter. The mill has four of these looms. Three still run.',
    price: 58000,
    image: '/images/product-nocturne-scarf.svg',
    imageAlt: 'Charcoal brushed lambswool scarf folded on dark stone',
    line: 'Nocturne',
    materials: ['Brushed lambswool'],
    sizes: [],
    stock: 32,
    isFeatured: false,
    tags: ['outerwear', 'gifts'],
    status: ProductStatus.Published,
  },
  {
    name: 'Horizon Desk Clock',
    slug: 'horizon-desk-clock',
    categorySlug: 'objects',
    description:
      'A solid brass eight-day desk clock with a hand-finished dial, wound by key. No battery, and no intention of ever taking one.',
    story:
      'An eight-day movement means you wind it on the same morning each week — a small, deliberate appointment with an object. We chose brass because it will not stay pristine: within a year the case carries the marks of the desk it lives on. That is not wear. That is the record of where it has been.',
    price: 96000,
    image: '/images/product-horizon-clock.svg',
    imageAlt: 'Solid brass desk clock with a pale dial, warm reflection on the case',
    line: 'Archive',
    materials: ['Solid brass', 'Eight-day mechanical movement'],
    sizes: [],
    stock: 9,
    isFeatured: false,
    tags: ['objects', 'desk'],
    status: ProductStatus.Published,
  },
  {
    name: 'Atelier Fountain Pen',
    slug: 'atelier-fountain-pen',
    categorySlug: 'objects',
    description:
      'Turned from a single billet of ebonite, with an 18-carat gold nib ground by hand to a medium stub.',
    story:
      'Ebonite is vulcanised rubber — the material fountain pens were made from before plastic, abandoned because it is slow to cure and smells appalling in the workshop. It is also warmer in the hand than any resin and takes a deeper polish. Each nib is ground and tuned on a loupe by one person, who writes a full line with every pen before it is boxed. If yours skips, it did not leave here that way, and we will put it right.',
    price: 118000,
    image: '/images/product-atelier-pen.svg',
    imageAlt: 'Black ebonite fountain pen with a gold nib resting on paper',
    line: 'Atelier Reserve',
    materials: ['Ebonite', '18ct gold nib'],
    sizes: [],
    stock: 15,
    isFeatured: false,
    tags: ['objects', 'desk', 'gifts'],
    status: ProductStatus.Published,
  },
  {
    name: 'Solstice Decanter',
    slug: 'solstice-decanter',
    categorySlug: 'objects',
    description:
      'Mouth-blown lead-free crystal with a hand-cut base, weighted so it sits without sliding.',
    story:
      'Blown by two people working as a pair — one at the pipe, one at the base — in a glassworks that has operated continuously since 1836. The base is cut on a wheel afterwards, which is where most of the weight and all of the risk lies: a decanter that has taken an hour to blow can be lost in four seconds at the wheel. Roughly one in six is.',
    price: 74000,
    image: '/images/product-solstice-decanter.svg',
    imageAlt: 'Mouth-blown crystal decanter catching a warm highlight on a dark table',
    line: 'Solstice',
    materials: ['Lead-free crystal'],
    sizes: [],
    stock: 12,
    isFeatured: false,
    tags: ['objects', 'table'],
    status: ProductStatus.Published,
  },
  {
    name: 'Cendre Field Jacket',
    slug: 'cendre-field-jacket',
    categorySlug: 'outerwear',
    description:
      'A waxed-cotton field jacket with a moleskin collar. Currently being re-cut; returning next season.',
    story:
      'We withdrew the Cendre after two seasons because the shoulder was wrong — too clean, too tailored for a jacket meant to be worn over a knit. It is being re-cut with a wider armhole and will return. We would rather show you an empty peg than the wrong jacket.',
    price: 168000,
    image: '/images/product-cendre-jacket.svg',
    imageAlt: 'Waxed cotton field jacket with moleskin collar hanging in shadow',
    line: 'Meridian',
    materials: ['Waxed cotton', 'Moleskin'],
    sizes: ['46', '48', '50', '52'],
    stock: 0,
    isFeatured: false,
    tags: ['outerwear'],
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
    membershipTier: MembershipTier.Prive,
  },
  {
    email: 'client@versacollections.com',
    password: 'Versa!Client2026',
    firstName: 'Jules',
    lastName: 'Moreau',
    role: Role.Customer,
    membershipTier: MembershipTier.Maison,
  },
  {
    email: 'guest@versacollections.com',
    password: 'Versa!Guest2026',
    firstName: 'Noor',
    lastName: 'Haddad',
    role: Role.Customer,
    membershipTier: MembershipTier.None,
  },
];
