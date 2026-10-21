import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from './access-token.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { TotpService } from './totp.service';
import { WsTicketService } from './ws-ticket.service';

// Global: el guard y la verificación OTP se usan en cuentas, transferencias y gateways.
@Global()
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TotpService,
    TokenService,
    WsTicketService,
    AccessTokenGuard,
  ],
  exports: [
    AuthService,
    TokenService,
    WsTicketService,
    AccessTokenGuard,
    PasswordService,
    TotpService,
  ],
})
export class AuthModule {}
