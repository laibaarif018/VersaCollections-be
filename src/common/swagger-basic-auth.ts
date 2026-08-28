import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * HTTP Basic Auth in front of the Swagger UI/JSON/YAML routes. Swagger has no
 * auth of its own, and it otherwise hands anyone the entire admin API surface
 * — every route, DTO shape and the cookie/bearer auth scheme — for free.
 *
 * Constant-time comparison so a timing attack can't shave the credential
 * search space down character by character.
 */
export function swaggerBasicAuth(user: string, password: string) {
  const expectedUser = Buffer.from(user);
  const expectedPassword = Buffer.from(password);

  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;

    if (header?.startsWith('Basic ')) {
      const [providedUser = '', providedPassword = ''] = Buffer.from(
        header.slice(6),
        'base64',
      )
        .toString('utf8')
        .split(':');

      // timingSafeEqual throws on a length mismatch, so that has to be
      // checked first — but doing it with `&&` before the buffer compare
      // would leak length as a cheap side channel, so both sides always run.
      const providedUserBuf = Buffer.from(providedUser);
      const providedPasswordBuf = Buffer.from(providedPassword);
      const userMatches =
        providedUserBuf.length === expectedUser.length &&
        timingSafeEqual(providedUserBuf, expectedUser);
      const passwordMatches =
        providedPasswordBuf.length === expectedPassword.length &&
        timingSafeEqual(providedPasswordBuf, expectedPassword);

      if (userMatches && passwordMatches) {
        next();
        return;
      }
    }

    res.setHeader(
      'WWW-Authenticate',
      'Basic realm="Versa Collections API docs"',
    );
    res.status(401).send('Authentication required');
  };
}
