import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { getRequest } from '../common/request-context';
import { TokenService } from './token.service';

export interface AuthUser {
  id: string;
  name: string;
}

declare module 'express' {
  interface Request {
    user?: AuthUser;
  }
}

/** Valida el Bearer token en REST y GraphQL. */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokens: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequest(context);
    const [scheme, token] = request.header('authorization')?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token)
      throw new UnauthorizedException('Token requerido');

    try {
      const payload = await this.tokens.verifyAccessToken(token);
      request.user = { id: payload.sub, name: payload.name };
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext) => {
    const user = getRequest(context).user;
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
