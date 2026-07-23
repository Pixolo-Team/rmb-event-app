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
    icon: "/images/rotary-app-icon.png",
    shortcut: "/images/rotary-app-icon.png",
    apple: "/images/rotary-app-icon.png",
  },
  // Stop mobile browsers/OSes from auto-linkifying email addresses and phone
  // numbers shown as plain text (e.g. the read-only Email on the profile /
  // edit-profile screens), which renders them underlined and tappable.
  // Explicit tel:/mailto: links elsewhere are unaffected.
  formatDetection: { telephone: false, email: false, address: false },
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
