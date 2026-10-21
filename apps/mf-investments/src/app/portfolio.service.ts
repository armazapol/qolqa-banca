import { Injectable } from '@angular/core';

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPriceUsd: number;
}

export class AuthRequiredError extends Error {
  constructor() {
    super('Tu sesión expiró. Ingresa nuevamente para ver tu portafolio.');
  }
}

const HOLDINGS_QUERY = '{ holdings { symbol name quantity avgPriceUsd } }';

interface HoldingsResponse {
  data?: {
    holdings: {
      symbol: string;
      name: string;
      quantity: string;
      avgPriceUsd: string;
    }[];
  };
  errors?: { message: string; extensions?: { code?: string } }[];
}

/**
 * Lee el portafolio del BFF con el token que entrega el shell (ADR-0010):
 * el remote nunca guarda el token, lo pide en cada llamada.
 */
@Injectable()
export class PortfolioService {
  async holdings(
    apiBaseUrl: string,
    getAccessToken: () => Promise<string | null>,
  ): Promise<Holding[]> {
    const request = async () => {
      const token = await getAccessToken();
      if (!token) throw new AuthRequiredError();
      const response = await fetch(`${apiBaseUrl}/graphql`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: HOLDINGS_QUERY }),
      });
      if (!response.ok)
        throw new Error(`El servidor respondió ${response.status}`);
      return (await response.json()) as HoldingsResponse;
    };

    let result = await request();
    // Si el token caducó entre medias, el shell entrega uno renovado en el segundo intento.
    if (
      result.errors?.some(
        (error) => error.extensions?.code === 'UNAUTHENTICATED',
      )
    ) {
      result = await request();
    }
    if (
      result.errors?.some(
        (error) => error.extensions?.code === 'UNAUTHENTICATED',
      )
    ) {
      throw new AuthRequiredError();
    }
    if (!result.data)
      throw new Error(result.errors?.[0]?.message ?? 'Respuesta inválida');

    return result.data.holdings.map((holding) => ({
      symbol: holding.symbol,
      name: holding.name,
      quantity: Number(holding.quantity),
      avgPriceUsd: Number(holding.avgPriceUsd),
    }));
  }

  /** Tipo de cambio oficial (venta) para valorizar en soles. Dato público. */
  async officialSell(apiBaseUrl: string): Promise<number | null> {
    try {
      const response = await fetch(`${apiBaseUrl}/fx/official`);
      if (!response.ok) return null;
      const body = (await response.json()) as { sell?: unknown };
      return typeof body.sell === 'number' ? body.sell : null;
    } catch {
      return null;
    }
  }
}
