import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../config/env';

/** Series del BCRP: TC Sistema bancario SBS (S/ por US$), compra y venta (ADR-0017). */
const SERIES = 'PD04639PD-PD04640PD';
const TIMEOUT_MS = 8_000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; QolqaBFF/1.0; +https://github.com/armazapol/qolqa-banca)';

const MONTHS: Record<string, string> = {
  Ene: '01',
  Feb: '02',
  Mar: '03',
  Abr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Ago: '08',
  Sep: '09',
  Set: '09',
  Oct: '10',
  Nov: '11',
  Dic: '12',
  Jan: '01',
  Apr: '04',
  Aug: '08',
  Dec: '12',
};

// Validamos la respuesta externa: una API de terceros nunca es de confianza.
const responseSchema = z.object({
  periods: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
});

export interface BcrpDailyRate {
  date: string;
  buy: number;
  sell: number;
}

@Injectable()
export class BcrpClient {
  private readonly baseUrl: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('BCRP_BASE_URL', { infer: true });
  }

  /** Días con dato en el rango; los feriados y días sin publicar ("n.d.") se descartan. */
  async fetchRates(from: string, to: string): Promise<BcrpDailyRate[]> {
    const response = await fetch(
      `${this.baseUrl}/${SERIES}/json/${from}/${to}`,
      {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        // El servidor del BCRP añade un aviso PHP en HTML tras el JSON si no
        // reconoce el User-Agent (el de Node es "node").
        headers: { accept: 'application/json', 'user-agent': USER_AGENT },
      },
    );
    if (!response.ok) throw new Error(`BCRP respondió ${response.status}`);
    return parseBcrpResponse(extractJson(await response.text()));
  }
}

/** Tolerante a basura tras el JSON: se recorta hasta la última llave antes de cualquier HTML. */
export function extractJson(raw: string): unknown {
  const htmlStart = raw.indexOf('<');
  const end = raw.lastIndexOf('}', htmlStart === -1 ? raw.length : htmlStart);
  return JSON.parse(raw.slice(0, end + 1));
}

export function parseBcrpResponse(body: unknown): BcrpDailyRate[] {
  const { periods } = responseSchema.parse(body);
  return periods.flatMap(({ name, values }) => {
    const date = parsePeriodName(name);
    const [buy, sell] = values.map(Number);
    if (!date || !Number.isFinite(buy) || !Number.isFinite(sell)) return [];
    return [{ date, buy, sell }];
  });
}

/** "01.Oct.26" → "2026-10-01" */
function parsePeriodName(name: string): string | null {
  const match = /^(\d{2})\.([A-Za-z]{3})\.(\d{2})$/.exec(name);
  const month = match ? MONTHS[match[2]] : undefined;
  return match && month ? `20${match[3]}-${month}-${match[1]}` : null;
}
