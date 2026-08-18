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
  /**
   * Seed value only, in minor units (paisa), used the first time the settings
   * document is created. The live delivery charge is stored in the database and
   * edited from the admin panel — read it through `SettingsService`, never here.
   */
  shippingFlatRate: number;
  currency: string;
  /**
   * Legacy local upload directory. Nothing is written here any more — media
   * goes to Cloudinary — but it is still served, so `/uploads/...` URLs frozen
   * onto historical orders keep resolving.
   */
  uploadDir: string;
  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    /** Top-level folder every asset lives under, and the delete guard. */
    rootFolder: string;
  };
  mail: {
    host: string;
    port: number;
    /** True for implicit TLS on 465; false for STARTTLS on 587. */
    secure: boolean;
    user: string;
    password: string;
    /** The From header, e.g. `Versa Collections <orders@versa.pk>`. */
    from: string;
    replyTo: string;
  };
  /** Public storefront origin, used to link customers back to their order. */
  storefrontUrl: string;
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
    // Paisa: 25000 = Rs 250. Only seeds the settings document on first run.
    shippingFlatRate: parseInt(process.env.SHIPPING_FLAT_RATE ?? '25000', 10),
    currency: process.env.CURRENCY ?? 'PKR',
    uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
      apiKey: process.env.CLOUDINARY_API_KEY ?? '',
      apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
      rootFolder: process.env.CLOUDINARY_ROOT_FOLDER ?? 'versacollections',
    },
    mail: {
      host: process.env.SMTP_HOST ?? '',
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      // Port 465 is implicit TLS; 587 upgrades with STARTTLS. Defaulting off
      // the port number means one fewer thing to get wrong.
      secure: process.env.SMTP_SECURE
        ? process.env.SMTP_SECURE === 'true'
        : parseInt(process.env.SMTP_PORT ?? '587', 10) === 465,
      user: process.env.SMTP_USER ?? '',
      password: process.env.SMTP_PASSWORD ?? '',
      from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
      replyTo: process.env.MAIL_REPLY_TO ?? '',
    },
    storefrontUrl: (process.env.STOREFRONT_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  },
});
