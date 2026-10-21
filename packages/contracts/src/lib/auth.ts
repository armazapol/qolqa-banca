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
export interface LoginChallengeResponse {
  challengeToken: string;
  expiresIn: number;
}

export const verifyOtpRequestSchema = z.object({
  challengeToken: z.string().min(1).max(2048),
  code: otpCodeSchema,
});
export type VerifyOtpRequest = z.infer<typeof verifyOtpRequestSchema>;

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
}

/** El access token viaja en el cuerpo y se guarda solo en memoria (ADR-0009). */
export interface AccessTokenResponse {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

export interface CsrfTokenResponse {
  csrfToken: string;
}

export interface WsTicketResponse {
  ticket: string;
  expiresIn: number;
}

export const CSRF_HEADER = 'x-csrf-token';
