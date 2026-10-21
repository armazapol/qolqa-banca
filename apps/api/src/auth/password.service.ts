import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';
import { ARGON2_OPTIONS } from './argon2-options';

@Injectable()
export class PasswordService {
  /** Hash ficticio para igualar tiempos cuando el usuario no existe. */
  private dummyHash?: Promise<string>;

  hash(password: string): Promise<string> {
    return hash(password, ARGON2_OPTIONS);
  }

  async verify(
    passwordHash: string | null,
    password: string,
  ): Promise<boolean> {
    if (!passwordHash) {
      this.dummyHash ??= this.hash('qolqa-timing-equalizer');
      await verify(await this.dummyHash, password);
      return false;
    }
    return verify(passwordHash, password);
  }
}
