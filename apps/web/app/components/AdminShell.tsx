"use client";

import { usePathname } from "next/navigation";
import { AdminMenu } from "./AdminMenu";

const LOGIN_PATH = "/admin/login";

const TITLES: Record<string, string> = {
  "/admin": "Admin analytics",
  "/admin/import": "Attendee import",
  "/admin/attendees": "Manage attendees",
  "/admin/event": "Event settings",
  "/admin/checkin": "Live check-in",
  "/admin/badges": "Print badges",
  "/admin/feed": "Gallery photos",
  "/admin/feedback": "Feedback",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === LOGIN_PATH) return <>{children}</>;
  const title = pathname.startsWith("/admin/attendees/") ? "Attendee profile" : TITLES[pathname];

  return (
    <div className="admin-shell">
      <AdminMenu title={title} />
      <div className="admin-shell-content">{children}</div>
    </div>
  );
}
