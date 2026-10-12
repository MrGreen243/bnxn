import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Street Tycoon — Lagos Hustler Empire",
  description: "A Nigerian 2D idle RPG and hustler empire simulator. Build from a rented room on the mainland to a citywide empire. Installable, offline-first, client-side only.",
  applicationName: "Street Tycoon",
  manifest: `${basePath}/manifest.webmanifest`,
  icons: { icon: `${basePath}/icons/icon-192.png`, apple: `${basePath}/icons/icon-192.png` },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Street Tycoon" },
};

export const viewport: Viewport = {
  themeColor: "#11141c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
