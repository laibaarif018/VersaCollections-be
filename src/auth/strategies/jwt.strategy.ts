import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { AuthUser } from '../../common/decorators/current-user.decorator';
import { MembershipTier, Role } from '../../common/enums';
import { ACCESS_COOKIE } from '../auth.constants';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  tier: MembershipTier;
}

/** Reads the access token from the httpOnly cookie, falling back to a bearer header (useful in Swagger). */
const fromCookieOrBearer = ExtractJwt.fromExtractors([
  (req: Request) => (req?.cookies?.[ACCESS_COOKIE] as string | undefined) ?? null,
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: fromCookieOrBearer,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.jwt.accessSecret'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      membershipTier: payload.tier,
    };
  }
}
