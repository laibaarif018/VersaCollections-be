export const ACCESS_COOKIE = 'vc_access';
export const REFRESH_COOKIE = 'vc_refresh';
/** Guest cart identifier, issued to anonymous visitors so their bag survives a reload. */
export const SESSION_COOKIE = 'vc_sid';

export const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000; // 15m
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7d
export const SESSION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30d
