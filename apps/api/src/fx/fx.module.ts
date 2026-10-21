import { Module } from '@nestjs/common';
import { BcrpClient } from './bcrp.client';
import { FxController } from './fx.controller';
import { FxGateway } from './fx.gateway';
import { FxService } from './fx.service';

@Module({
  controllers: [FxController],
  providers: [BcrpClient, FxService, FxGateway],
})
export class FxModule {}
