import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

const ARGON2ID_OPTIONS = {
  parallelism: 1,
  iterations: 2,
  memorySize: 19_456,
  hashLength: 32,
  outputType: 'encoded',
} as const;

@Injectable()
export class PinHasher {
  async hash(pin: string): Promise<string> {
    return argon2id({
      password: pin,
      salt: randomBytes(16),
      ...ARGON2ID_OPTIONS,
    });
  }

  async verify(encodedHash: string, pin: string): Promise<boolean> {
    try {
      return await argon2Verify({
        password: pin,
        hash: encodedHash,
      });
    } catch {
      return false;
    }
  }
}
