import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '../services/jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }

    const token = authHeader.slice(7);
    const payload = this.jwtService.verify(token);

    if (!payload) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    request.user = payload;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }

    const token = authHeader.slice(7);
    const payload = this.jwtService.verify(token);

    if (!payload) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    if (payload.role !== 'admin') {
      throw new ForbiddenException('需要管理员权限');
    }

    request.user = payload;
    return true;
  }
}
