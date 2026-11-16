import type { Metadata, Viewport } from "next";
import "./globals.css";
import { site } from "@/lib/site";
import { FRAMES_VERSION } from "@/lib/framesVersion";

export const metadata: Metadata = {
  title: "MOOD — Pick your mood.",
  description: "MOOD donuts. Little moments. Big flavors. A mood for every craving.",
  icons: { icon: "/images/vanilla-donut.webp" },
  openGraph: {
    title: "MOOD — Pick your mood.",
    description: site.secondarySlogan,
    images: [`/frames/duo/poster.jpg?v=${FRAMES_VERSION}`],
  },
};

export const viewport: Viewport = {
  themeColor: "#fbeb93",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-nav-tone="pink">
      <body>{children}</body>
    </html>
  );
}
