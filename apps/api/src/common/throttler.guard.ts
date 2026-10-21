import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';

/** ThrottlerGuard que entiende REST y GraphQL; los WebSockets se limitan aparte. */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() === 'ws') return true;
    return super.canActivate(context);
  }

  protected override getRequestResponse(context: ExecutionContext): {
    req: Record<string, unknown>;
    res: Record<string, unknown>;
  } {
    if (context.getType<'http' | 'graphql'>() === 'graphql') {
      const { req, res } = GqlExecutionContext.create(context).getContext<{
        req: Request;
        res: Response;
      }>();
      return { req: req as never, res: res as never };
    }
    return super.getRequestResponse(context);
  }
}
