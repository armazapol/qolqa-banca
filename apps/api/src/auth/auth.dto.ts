import { loginRequestSchema, verifyOtpRequestSchema } from '@qolqa/contracts';
import { createZodDto } from 'nestjs-zod';

// Los DTO reutilizan los esquemas Zod del front: una sola fuente de verdad (ADR-0018).
export class LoginDto extends createZodDto(loginRequestSchema) {}
export class VerifyOtpDto extends createZodDto(verifyOtpRequestSchema) {}
