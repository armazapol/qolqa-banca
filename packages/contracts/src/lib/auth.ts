import { z } from 'zod';

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'El código debe tener 6 dígitos');

export const loginRequestSchema = z.object({
  email: z.email('Correo no válido').trim().toLowerCase().max(254),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(128),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

/** Primer paso correcto: el usuario debe confirmar con su código TOTP. */
export const loginChallengeResponseSchema = z.object({
  challengeToken: z.string(),
  expiresIn: z.number().int(),
});
export type LoginChallengeResponse = z.infer<
  typeof loginChallengeResponseSchema
>;

export const verifyOtpRequestSchema = z.object({
  challengeToken: z.string().min(1).max(2048),
  code: otpCodeSchema,
});
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

export const sessionUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

/** El access token viaja en el cuerpo y se guarda solo en memoria (ADR-0009). */
export const accessTokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number().int(),
  user: sessionUserSchema,
});
export type AccessTokenResponse = z.infer<typeof accessTokenResponseSchema>;

export const csrfTokenResponseSchema = z.object({ csrfToken: z.string() });
export type CsrfTokenResponse = z.infer<typeof csrfTokenResponseSchema>;

export const wsTicketResponseSchema = z.object({
  ticket: z.string(),
  expiresIn: z.number().int(),
});
export type WsTicketResponse = z.infer<typeof wsTicketResponseSchema>;

export const CSRF_HEADER = 'x-csrf-token';
