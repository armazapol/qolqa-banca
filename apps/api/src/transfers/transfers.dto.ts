import { createTransferRequestSchema } from '@qolqa/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateTransferDto extends createZodDto(
  createTransferRequestSchema,
) {}
