import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type {
  AccessTokenResponse,
  CsrfTokenResponse,
  LoginChallengeResponse,
  WsTicketResponse,
} from '@qolqa/contracts';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import { ReqMeta, type RequestMeta } from '../common/request-context';
import {
  cookieNames,
  csrfCookieOptions,
  refreshCookieOptions,
} from '../common/security/cookies';
import { CsrfGuard } from '../common/security/csrf.guard';
import { CsrfService } from '../common/security/csrf.service';
import type { Env } from '../config/env';
import {
  AccessTokenGuard,
  type AuthUser,
  CurrentUser,
} from './access-token.guard';
import { REFRESH_TOKEN_TTL_MS, WS_TICKET_TTL_MS } from './auth.constants';
import {
  AccessTokenResponseDto,
  CsrfTokenResponseDto,
  LoginChallengeResponseDto,
  LoginDto,
  VerifyOtpDto,
  WsTicketResponseDto,
} from './auth.dto';
import { AuthService } from './auth.service';
import { WsTicketService } from './ws-ticket.service';

/** Límite estricto contra fuerza bruta en los pasos de autenticación. */
const AUTH_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly production: boolean;
  private readonly cookies: ReturnType<typeof cookieNames>;

  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
    private readonly wsTickets: WsTicketService,
    config: ConfigService<Env, true>,
  ) {
    this.production = config.get('NODE_ENV', { infer: true }) === 'production';
    this.cookies = cookieNames(this.production);
  }

  /** Emite el token CSRF (cookie legible + cuerpo) antes de usar refresh/logout. */
  @Get('csrf')
  @ZodResponse({ status: 200, type: CsrfTokenResponseDto })
  issueCsrf(@Res({ passthrough: true }) res: Response): CsrfTokenResponse {
    const csrfToken = this.csrf.issue();
    res.cookie(
      this.cookies.csrf,
      csrfToken,
      csrfCookieOptions(this.production),
    );
    return { csrfToken };
  }

  @Post('login')
  @ZodResponse({ status: 200, type: LoginChallengeResponseDto })
  @Throttle(AUTH_THROTTLE)
  login(
    @Body() dto: LoginDto,
    @ReqMeta() meta: RequestMeta,
  ): Promise<LoginChallengeResponse> {
    return this.auth.login(dto, meta);
  }

  @Post('otp')
  @ZodResponse({ status: 200, type: AccessTokenResponseDto })
  @Throttle(AUTH_THROTTLE)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    const session = await this.auth.verifyOtp(dto, meta);
    this.setRefreshCookie(res, session.refreshToken);
    return session.response;
  }

  @Post('refresh')
  @ZodResponse({ status: 200, type: AccessTokenResponseDto })
  @UseGuards(CsrfGuard)
  async refresh(
    @Req() req: Request,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponse> {
    try {
      const session = await this.auth.refresh(
        this.readRefreshCookie(req),
        meta,
      );
      this.setRefreshCookie(res, session.refreshToken);
      return session.response;
    } catch (error) {
      this.clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Sesión cerrada' })
  @UseGuards(CsrfGuard)
  async logout(
    @Req() req: Request,
    @ReqMeta() meta: RequestMeta,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(this.readRefreshCookie(req), meta);
    this.clearRefreshCookie(res);
  }

  @Post('ws-ticket')
  @ZodResponse({ status: 200, type: WsTicketResponseDto })
  @UseGuards(AccessTokenGuard)
  issueWsTicket(@CurrentUser() user: AuthUser): WsTicketResponse {
    return {
      ticket: this.wsTickets.issue(user.id),
      expiresIn: WS_TICKET_TTL_MS / 1000,
    };
  }

  private readRefreshCookie(req: Request): string | undefined {
    return req.cookies?.[this.cookies.refresh] as string | undefined;
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(
      this.cookies.refresh,
      token,
      refreshCookieOptions(this.production, REFRESH_TOKEN_TTL_MS),
    );
  }

  private clearRefreshCookie(res: Response): void {
    // clearCookie debe recibir los mismos atributos (sin maxAge) para que el navegador la borre.
    const options = refreshCookieOptions(this.production, 0);
    delete options.maxAge;
    res.clearCookie(this.cookies.refresh, options);
  }
}
