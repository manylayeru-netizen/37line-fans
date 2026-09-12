import { SqlExecutionContextMiddleware } from '@lark-apaas/fullstack-nestjs-core';
import * as crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || '37line-hand-diary-secret-key-2024';

function verifySiteJwt(token: string): { userId: string } | null {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;
    const expected = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (expected !== signature) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    if (payload.userId && typeof payload.userId === 'string') {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export function patchSqlExecutionContextMiddleware(): void {
  const proto = SqlExecutionContextMiddleware.prototype as any;
  const originalUse = proto.use;
  if (!originalUse || originalUse.__siteJwtPatched) return;

  proto.use = function (req: any, res: any, next: any): void {
    const authHeader = req.headers?.authorization;
    if (
      authHeader &&
      typeof authHeader === 'string' &&
      authHeader.startsWith('Bearer ')
    ) {
      const token = authHeader.slice(7);
      const payload = verifySiteJwt(token);
      if (payload) {
        if (!req.userContext) {
          req.userContext = {};
        }
        if (!req.userContext.userId) {
          req.userContext.userId = payload.userId;
        }
      }
    }
    return originalUse.call(this, req, res, next);
  };
  proto.use.__siteJwtPatched = true;
}
