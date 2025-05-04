import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from 'src/auth/types';

export const GetCurrentUserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Add null checks and type validation
    if (!request.user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const user = request.user as JwtPayload;

    if (!user.sub) {
      throw new UnauthorizedException('Invalid user payload');
    }

    return user.sub;
  },
);
