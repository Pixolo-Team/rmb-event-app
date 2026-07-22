import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./RegisterServiceWorker";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { PwaInstallProvider } from "./components/PwaInstallProvider";

export const metadata: Metadata = {
  title: "RMBF Evento",
  description: "Networking, planned.",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/rmb-fellowship-logo.png",
    shortcut: "/images/rmb-fellowship-logo.png",
    apple: "/images/rmb-fellowship-logo.png",
  },
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
        <GoogleAnalytics />
        <RegisterServiceWorker />
        <PwaInstallProvider>{children}</PwaInstallProvider>
      </body>
    </html>
  );
}
