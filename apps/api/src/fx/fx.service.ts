import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type {
  BankFxQuote,
  FxHistoryPoint,
  OfficialFxRate,
} from '@qolqa/contracts';
import { BcrpClient, type BcrpDailyRate } from './bcrp.client';

const HISTORY_DAYS = 45;
/** Margen del banco sobre la tasa oficial (compra más baja, venta más alta). */
const BANK_SPREAD = 0.02;
/** La cotización simulada oscila como máximo ±1 céntimo alrededor del margen. */
const MAX_DRIFT = 0.01;
const DRIFT_STEP = 0.001;

@Injectable()
export class FxService implements OnModuleInit {
  private readonly logger = new Logger(FxService.name);
  private history: BcrpDailyRate[] = [];
  private drift = 0;
  private quote: BankFxQuote | null = null;

  constructor(private readonly bcrp: BcrpClient) {}

  /** No bloquea el arranque: si el BCRP no responde, el resto del BFF funciona. */
  onModuleInit(): void {
    void this.refreshOfficial();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshOfficial(): Promise<void> {
    const to = new Date();
    const from = new Date(to.getTime() - HISTORY_DAYS * 24 * 60 * 60 * 1000);
    try {
      const rates = await this.bcrp.fetchRates(toIsoDate(from), toIsoDate(to));
      if (rates.length > 0) {
        this.history = rates;
        this.tick();
      }
    } catch (error) {
      // Se mantiene el último dato conocido: degradación controlada.
      this.logger.warn(
        { err: error },
        'No se pudo actualizar el tipo de cambio del BCRP',
      );
    }
  }

  official(): OfficialFxRate {
    const latest = this.history.at(-1);
    if (!latest)
      throw new ServiceUnavailableException('Tipo de cambio no disponible');
    return { ...latest, source: 'BCRP' };
  }

  historyPoints(): FxHistoryPoint[] {
    return this.history.map(({ date, sell }) => ({ date, sell }));
  }

  currentQuote(): BankFxQuote {
    return this.quote ?? this.tick();
  }

  /** Avanza la cotización simulada un paso aleatorio acotado (ADR-0017). */
  tick(): BankFxQuote {
    const official = this.official();
    const step = (Math.random() * 2 - 1) * DRIFT_STEP;
    this.drift = Math.min(MAX_DRIFT, Math.max(-MAX_DRIFT, this.drift + step));
    this.quote = {
      buy: round3(official.buy - BANK_SPREAD + this.drift),
      sell: round3(official.sell + BANK_SPREAD + this.drift),
      official,
      simulated: true,
      updatedAt: new Date().toISOString(),
    };
    return this.quote;
  }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}
