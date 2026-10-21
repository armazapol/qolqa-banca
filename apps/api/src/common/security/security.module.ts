import { Global, Module } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';
import { CsrfService } from './csrf.service';
import { EncryptionService } from './encryption.service';

@Global()
@Module({
  providers: [EncryptionService, CsrfService, CsrfGuard],
  exports: [EncryptionService, CsrfService, CsrfGuard],
})
export class SecurityModule {}
