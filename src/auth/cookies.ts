import type { CookieOptions, Response, Request } from 'express';
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_MAX_AGE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_MAX_AGE,
  SESSION_COOKIE,
  SESSION_COOKIE_MAX_AGE,
} from './auth.constants';
import { randomUUID } from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

function baseOptions(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    // Cross-site cookies must be Secure; over plain-http localhost we stay on Lax.
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge,
  };
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, baseOptions(ACCESS_COOKIE_MAX_AGE));
  res.cookie(REFRESH_COOKIE, refreshToken, baseOptions(REFRESH_COOKIE_MAX_AGE));
}

export function clearAuthCookies(res: Response): void {
  const { maxAge: _access, ...accessOpts } = baseOptions(0);
  res.clearCookie(ACCESS_COOKIE, accessOpts);
  res.clearCookie(REFRESH_COOKIE, accessOpts);
}

/**
 * Returns the guest cart id, minting and setting one when the visitor has none.
 * Signed-in shoppers never reach this — their cart keys off the user id.
 */
export function ensureSessionId(req: Request, res: Response): string {
  const existing = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (existing) return existing;

  const sid = randomUUID();
  res.cookie(SESSION_COOKIE, sid, baseOptions(SESSION_COOKIE_MAX_AGE));
  return sid;
}
