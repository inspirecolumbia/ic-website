import type { Metadata } from "next";
import "./globals.css";
import ScrollToTop from "../components/ScrollToTop";

export const metadata: Metadata = {
  metadataBase: new URL("https://inspirecolumbia.org"),
  title: {
    default: "Inspire Columbia",
    template: "%s | Inspire Columbia",
  },
  description: "A youth-run nonprofit focused on hosting events and serving our community in Columbia, South Carolina.",
  keywords: ["nonprofit", "Columbia", "South Carolina", "youth", "community events", "TEDx", "leadership", "501c3"],
  openGraph: {
    type: "website",
    siteName: "Inspire Columbia",
    title: "Inspire Columbia",
    description: "A youth-run nonprofit focused on hosting events and serving our community in Columbia, South Carolina.",
    url: "https://inspirecolumbia.org",
    images: [
      {
        url: "/InspireBlackLogo.png",
        width: 840,
        height: 840,
        alt: "Inspire Columbia logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Inspire Columbia",
    description: "A youth-run nonprofit focused on hosting events and serving our community in Columbia, South Carolina.",
    images: ["/InspireBlackLogo.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/favicon/apple-touch-icon.png" },
    other: [
      { rel: "manifest", url: "/favicon/site.webmanifest" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
