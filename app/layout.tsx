import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SplashScreen } from "@/shared/components/SplashScreen";
import { HazardWatcher } from "@/features/vision/HazardWatcher";
import { VoiceCommander } from "@/features/vision/VoiceCommander";

export const metadata: Metadata = {
  title: "TANAW",
  description:
    "Unified accessibility platform — Vision Assistance and Hearing & Speech Assistance.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#fde165",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fil">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=ABeeZee:ital@0;1&family=Gasoek+One&family=Tilt+Warp&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="app-root">{children}</div>
        <SplashScreen />
        <HazardWatcher />
        <VoiceCommander />
      </body>
    </html>
  );
}
