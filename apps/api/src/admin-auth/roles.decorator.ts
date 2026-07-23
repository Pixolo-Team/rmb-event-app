import { SetMetadata } from "@nestjs/common";
import { AdminRole } from "@prisma/client";

export const ROLES_KEY = "roles";
/**
 * Restricts a route to the given admin roles. Applied together with RolesGuard,
 * after AdminGuard. If omitted, RolesGuard defaults to SUPERADMIN only.
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
