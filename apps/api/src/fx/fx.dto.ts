import {
  bankFxQuoteSchema,
  fxHistoryPointSchema,
  officialFxRateSchema,
} from '@qolqa/contracts';
import { createZodDto } from 'nestjs-zod';

export class OfficialFxRateDto extends createZodDto(officialFxRateSchema) {}
export class BankFxQuoteDto extends createZodDto(bankFxQuoteSchema) {}
export class FxHistoryPointDto extends createZodDto(fxHistoryPointSchema) {}
