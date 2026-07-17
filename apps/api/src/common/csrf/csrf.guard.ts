import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CSRF_COOKIE } from './csrf-cookie.middleware';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const cookieToken = request.cookies?.[CSRF_COOKIE];
    const headerToken = request.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
