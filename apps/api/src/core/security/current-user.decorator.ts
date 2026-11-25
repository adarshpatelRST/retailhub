import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleType } from '@prisma/client';
import { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  userId?: string;
  email: string;
  fullName: string;
  role: RoleType;
  isActive: boolean;
}

/**
 * Parameter decorator extracting the authenticated user (or a specific property of the user)
 * from `request.user`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
