import { Global, Module } from '@nestjs/common';
import { SecretBox } from './secret-box';

@Global()
@Module({
  providers: [{ provide: SecretBox, useFactory: () => new SecretBox() }],
  exports: [SecretBox],
})
export class CryptoModule {}
