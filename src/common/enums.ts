export enum Role {
  Customer = 'customer',
  Admin = 'admin',
}

export enum MembershipTier {
  None = 'none',
  Atelier = 'atelier',
  Maison = 'maison',
  Prive = 'prive',
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

export enum ApplicationStatus {
  Pending = 'pending',
  Approved = 'approved',
  Declined = 'declined',
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
