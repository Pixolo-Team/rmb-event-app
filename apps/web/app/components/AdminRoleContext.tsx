"use client";

import { createContext, useContext } from "react";

export type AdminRole = "SUPERADMIN" | "REGISTRATION_STAFF";

// null while still loading / not authenticated yet.
export const AdminRoleContext = createContext<AdminRole | null>(null);

export function useAdminRole(): AdminRole | null {
  return useContext(AdminRoleContext);
}
