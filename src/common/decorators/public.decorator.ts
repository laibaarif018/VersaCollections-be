import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Opt a route out of the global JwtAuthGuard. The guard still *attempts* to
 * decode the access-token cookie on public routes, so `@CurrentUser()` is
 * populated when a signed-in visitor hits one — it just never rejects.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
