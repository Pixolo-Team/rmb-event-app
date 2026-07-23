import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@prisma/client";
import { ROLES_KEY } from "./roles.decorator";
import { RequestWithAdmin } from "./admin.guard";

/**
 * Runs after AdminGuard (which populates req.admin). Reads the roles allowed
 * for this route via @Roles(...); a route with no @Roles() metadata defaults
 * to SUPERADMIN only, so every admin route is locked down unless explicitly
 * opened up to other roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed =
      this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) ??
      (["SUPERADMIN"] as AdminRole[]);

    const req = context.switchToHttp().getRequest<RequestWithAdmin>();
    const role = req.admin?.role;
    if (!role || !allowed.includes(role)) {
      throw new ForbiddenException("Not permitted for this admin role");
    }
    return true;
  }
}
