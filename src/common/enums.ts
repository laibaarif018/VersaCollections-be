export enum Role {
  Customer = 'customer',
  Admin = 'admin',
}

export enum OrderStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Shipped = 'shipped',
  Delivered = 'delivered',
  Cancelled = 'cancelled',
}

export enum ProductStatus {
  Draft = 'draft',
  Published = 'published',
  Archived = 'archived',
}

/**
 * How a garment is sold. Standard vocabulary for Pakistani clothing: unstitched
 * fabric is bought by the suit and tailored by the buyer, semi-stitched arrives
 * partly made up. `NotApplicable` covers accessories and anything one-size.
 */
export enum StitchType {
  Stitched = 'stitched',
  SemiStitched = 'semi-stitched',
  Unstitched = 'unstitched',
  NotApplicable = 'not-applicable',
}

/**
 * The transactional emails an order can trigger. Stored on the order once sent,
 * so the admin can see what a customer has received and resend it.
 */
export enum OrderEmailKind {
  Placed = 'placed',
  PaymentReceived = 'payment-received',
  Confirmed = 'confirmed',
  Dispatched = 'dispatched',
}

/** What a landing-hero slide holds. Images are timed; videos play to the end. */
export enum HeroSlideKind {
  Image = 'image',
  Video = 'video',
}

/**
 * How an editorial block sits on the landing page. `FullBleed` is a wide band
 * with the copy laid over the photograph and no body text; the two split
 * layouts put the image beside the copy, on one side or the other.
 */
export enum EditorialLayout {
  FullBleed = 'full-bleed',
  ImageLeft = 'image-left',
  ImageRight = 'image-right',
}

/**
 * Statuses an order may move to from a given status. Terminal states have no
 * outgoing transitions, which is what stops the admin panel from, say,
 * "un-delivering" an order.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Confirmed, OrderStatus.Cancelled],
  [OrderStatus.Confirmed]: [OrderStatus.Shipped, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
};
