"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminRoleContext, AdminRole } from "./AdminRoleContext";

const LOGIN_PATH = "/admin/login";
const STAFF_DEFAULT_PATH = "/admin/attendees";

// Pages registration staff may reach; everything else redirects to the
// default. Superadmin has no restriction.
const STAFF_ALLOWED_PREFIXES = ["/admin/attendees", "/admin/checkin"];

function isAllowedForStaff(pathname: string): boolean {
  return STAFF_ALLOWED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// PF3 — client gate wrapped around both admin route groups via their layouts.
// Probes the guarded /admin/auth/me endpoint; on 401 (no/expired admin session)
// it redirects to the login screen. The login route renders without gating.
// Because the layout stays mounted while navigating between admin pages, each
// navigation re-checks — which also slides the 30-min idle window forward.
// Also carries the caller's role so nav and page content can be restricted
// for registration staff (server-side routes enforce this independently).
export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<AdminRole | null>(null);
  const isLogin = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLogin) return;
    let active = true;
    fetch("/api/admin/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          router.replace(LOGIN_PATH);
          return;
        }
        const data = (await res.json()) as { role?: AdminRole };
        setRole(data.role ?? null);
      })
      .catch(() => {
        if (active) router.replace(LOGIN_PATH);
      });
    return () => {
      active = false;
    };
  }, [isLogin, pathname, router]);

  useEffect(() => {
    if (isLogin || !role) return;
    if (role === "REGISTRATION_STAFF" && !isAllowedForStaff(pathname)) {
      router.replace(STAFF_DEFAULT_PATH);
    }
  }, [isLogin, pathname, role, router]);

  if (isLogin) return <>{children}</>;
  if (!role) return <div className="admin-gate-loading">Checking admin access…</div>;
  if (role === "REGISTRATION_STAFF" && !isAllowedForStaff(pathname)) return null;
  return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>;
}
