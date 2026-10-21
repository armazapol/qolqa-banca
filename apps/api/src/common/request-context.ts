import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request } from 'express';

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

/** Obtiene la request tanto en controladores REST como en resolvers GraphQL. */
export function getRequest(context: ExecutionContext): Request {
  if (context.getType<'http' | 'graphql'>() === 'graphql') {
    return GqlExecutionContext.create(context).getContext<{ req: Request }>()
      .req;
  }
  return context.switchToHttp().getRequest<Request>();
}

/** IP (respetando trust proxy) y user agent, para auditoría. */
export const ReqMeta = createParamDecorator(
  (_: unknown, context: ExecutionContext): RequestMeta => {
    const request = getRequest(context);
    return {
      ip: request.ip ?? null,
      userAgent: request.header('user-agent')?.slice(0, 256) ?? null,
    };
  },
);
