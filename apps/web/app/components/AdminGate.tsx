"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const LOGIN_PATH = "/admin/login";

// PF3 — client gate wrapped around both admin route groups via their layouts.
// Probes the guarded /admin/auth/me endpoint; on 401 (no/expired admin session)
// it redirects to the login screen. The login route renders without gating.
// Because the layout stays mounted while navigating between admin pages, each
// navigation re-checks — which also slides the 30-min idle window forward.
export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const isLogin = pathname === LOGIN_PATH;

  useEffect(() => {
    if (isLogin) return;
    let active = true;
    fetch("/api/admin/auth/me", { credentials: "include" })
      .then((res) => {
        if (!active) return;
        if (res.ok) setAuthed(true);
        else router.replace(LOGIN_PATH);
      })
      .catch(() => {
        if (active) router.replace(LOGIN_PATH);
      });
    return () => {
      active = false;
    };
  }, [isLogin, pathname, router]);

  if (isLogin) return <>{children}</>;
  if (!authed) return <div className="admin-gate-loading">Checking admin access…</div>;
  return <>{children}</>;
}
