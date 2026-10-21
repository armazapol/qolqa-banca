import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
  BankFxQuote,
  FxHistoryPoint,
  OfficialFxRate,
} from '@qolqa/contracts';
import { ZodResponse } from 'nestjs-zod';
import { BankFxQuoteDto, FxHistoryPointDto, OfficialFxRateDto } from './fx.dto';
import { FxService } from './fx.service';

/**
 * Datos públicos: los consume la página SSR /tipo-de-cambio (ADR-0004),
 * por eso se permiten en caché compartida (CDN) unos minutos.
 */
@ApiTags('fx')
@Controller('fx')
export class FxController {
  constructor(private readonly fx: FxService) {}

  @Get('official')
  @ZodResponse({ status: 200, type: OfficialFxRateDto })
  @Header(
    'Cache-Control',
    'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
  )
  official(): OfficialFxRate {
    return this.fx.official();
  }

  @Get('history')
  @ZodResponse({ status: 200, type: [FxHistoryPointDto] })
  @Header(
    'Cache-Control',
    'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600',
  )
  history(): FxHistoryPoint[] {
    return this.fx.historyPoints();
  }

  @Get('quote')
  @ZodResponse({ status: 200, type: BankFxQuoteDto })
  @Header('Cache-Control', 'no-store')
  quote(): BankFxQuote {
    return this.fx.currentQuote();
  }
}
