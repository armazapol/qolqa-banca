import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IDEMPOTENCY_HEADER, type TransferResponse } from '@qolqa/contracts';
import { z } from 'zod';
import {
  AccessTokenGuard,
  type AuthUser,
  CurrentUser,
} from '../auth/access-token.guard';
import { ReqMeta, type RequestMeta } from '../common/request-context';
import { CreateTransferDto } from './transfers.dto';
import { TransfersService } from './transfers.service';

const idempotencyKeySchema = z.uuid();

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('transfers')
@UseGuards(AccessTokenGuard)
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiHeader({
    name: IDEMPOTENCY_HEADER,
    required: true,
    description: 'UUID único por operación',
  })
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTransferDto,
    @Headers(IDEMPOTENCY_HEADER) idempotencyKey: string | undefined,
    @ReqMeta() meta: RequestMeta,
  ): Promise<TransferResponse> {
    const key = idempotencyKeySchema.safeParse(idempotencyKey);
    if (!key.success)
      throw new BadRequestException(`Cabecera ${IDEMPOTENCY_HEADER} inválida`);
    return this.transfers.create(user.id, dto, key.data, meta);
  }
}
