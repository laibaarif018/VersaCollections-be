export interface AppConfig {
  port: number;
  mongoUri: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  cookieDomain?: string;
  /** Minor units (cents). All money in this API is integer cents. */
  shippingFlatRate: number;
  /** Subtotal at or above which shipping is complimentary. */
  freeShippingThreshold: number;
  currency: string;
}

export default (): { app: AppConfig } => ({
  app: {
    port: parseInt(process.env.PORT ?? '4000', 10),
    mongoUri: process.env.MONGODB_URI ?? '',
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
      accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
      refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
    },
    cookieDomain: process.env.COOKIE_DOMAIN || undefined,
    shippingFlatRate: parseInt(process.env.SHIPPING_FLAT_RATE ?? '4500', 10),
    freeShippingThreshold: parseInt(process.env.FREE_SHIPPING_THRESHOLD ?? '250000', 10),
    currency: process.env.CURRENCY ?? 'USD',
  },
});
