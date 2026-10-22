import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

/**
 * - `GET /api/health/live`: el proceso responde. Lo usan el health check de Render
 *   y el keep-alive; no toca la base de datos para que Neon pueda suspenderse (ADR-0023).
 * - `GET /api/health`: además comprueba la base de datos (503 si no responde). Lo
 *   usa el despliegue para verificar que la versión nueva quedó operativa.
 */
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get()
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException({ status: 'degraded' });
    }
  }
}
