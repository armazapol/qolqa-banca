import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CSRF_HEADER } from '@qolqa/contracts';
import type { Request } from 'express';
import type { Env } from '../../config/env';
import { cookieNames } from './cookies';
import { CsrfService } from './csrf.service';

/**
 * Solo se aplica a endpoints autenticados por cookie (refresh, logout).
 * Los endpoints con Bearer token no son vulnerables a CSRF: el navegador
 * no adjunta el token automáticamente.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfCookie: string;

  constructor(
    private readonly csrf: CsrfService,
    config: ConfigService<Env, true>,
  ) {
    this.csrfCookie = cookieNames(
      config.get('NODE_ENV', { infer: true }) === 'production',
    ).csrf;
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = request.cookies?.[this.csrfCookie] as
      string | undefined;
    const headerToken = request.header(CSRF_HEADER);
    if (!this.csrf.verify(cookieToken, headerToken)) {
      throw new ForbiddenException('Token CSRF inválido');
    }
    return true;
  }
}
