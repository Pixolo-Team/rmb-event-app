import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./RegisterServiceWorker";

export const metadata: Metadata = {
  title: "Evento",
  description: "Networking, planned.",
  manifest: "/manifest.json",
  icons: { icon: "/images/rotary-favicon.png" },
};

export const viewport: Viewport = {
  themeColor: "#2B6CD4",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
