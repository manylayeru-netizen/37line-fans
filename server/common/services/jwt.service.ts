import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class JwtService {
  private readonly secret: string;
  private readonly expiresIn: number;

  constructor() {
    this.secret = process.env.JWT_SECRET || '37line-hand-diary-secret-key-2024';
    this.expiresIn = 7 * 24 * 60 * 60 * 1000;
  }

  sign(payload: Record<string, any>): string {
    const header = Buffer.from(JSON.stringify({
      alg: 'HS256',
      typ: 'JWT',
    })).toString('base64url');

    const body = Buffer.from(JSON.stringify({
      ...payload,
      iat: Date.now(),
      exp: Date.now() + this.expiresIn,
    })).toString('base64url');

    const signature = this.hmac(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  verify(token: string): Record<string, any> | null {
    try {
      const [header, body, signature] = token.split('.');
      if (!header || !body || !signature) return null;

      const expected = this.hmac(`${header}.${body}`);
      if (expected !== signature) return null;

      const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (payload.exp && payload.exp < Date.now()) return null;

      return payload;
    } catch {
      return null;
    }
  }

  private hmac(data: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }
}
