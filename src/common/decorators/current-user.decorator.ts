import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role, MembershipTier } from '../enums';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  membershipTier: MembershipTier;
}

/** Resolves to `null` on public routes visited by an anonymous caller. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser | null => {
    const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
    return request.user ?? null;
  },
);
