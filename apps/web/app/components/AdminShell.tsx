"use client";

import { usePathname } from "next/navigation";
import { AdminMenu } from "./AdminMenu";

const LOGIN_PATH = "/admin/login";

const TITLES: Record<string, string> = {
  "/admin": "Admin analytics",
  "/admin/attendees": "Manage attendees",
  "/admin/event": "Event settings",
  "/admin/checkin": "Live check-in",
  "/admin/badges": "Print badges",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === LOGIN_PATH) return <>{children}</>;

  return (
    <div className="admin-shell">
      <AdminMenu title={TITLES[pathname]} />
      <div className="admin-shell-content">{children}</div>
    </div>
  );
}
