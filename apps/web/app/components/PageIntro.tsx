import type { ReactNode } from "react";

export function PageIntro({ children, className = "" }: { children: ReactNode; className?: string }) {
  const classes = className ? `page-intro ${className}` : "page-intro";
  return <p className={classes}>{children}</p>;
}
