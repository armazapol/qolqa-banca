import {
  accessTokenResponseSchema,
  csrfTokenResponseSchema,
  loginChallengeResponseSchema,
  loginRequestSchema,
  verifyOtpRequestSchema,
  wsTicketResponseSchema,
} from '@qolqa/contracts';
import { createZodDto } from 'nestjs-zod';

// Los DTO reutilizan los esquemas Zod del front: una sola fuente de verdad (ADR-0018).
export class LoginDto extends createZodDto(loginRequestSchema) {}
export class VerifyOtpDto extends createZodDto(verifyOtpRequestSchema) {}

export class LoginChallengeResponseDto extends createZodDto(
  loginChallengeResponseSchema,
) {}
export class AccessTokenResponseDto extends createZodDto(
  accessTokenResponseSchema,
) {}
export class CsrfTokenResponseDto extends createZodDto(
  csrfTokenResponseSchema,
) {}
export class WsTicketResponseDto extends createZodDto(wsTicketResponseSchema) {}
