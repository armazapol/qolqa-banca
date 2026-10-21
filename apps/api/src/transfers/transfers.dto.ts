import {
  createTransferRequestSchema,
  transferResponseSchema,
} from '@qolqa/contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateTransferDto extends createZodDto(
  createTransferRequestSchema,
) {}
export class TransferResponseDto extends createZodDto(transferResponseSchema) {}
