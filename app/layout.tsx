import type { Metadata } from "next";
import "./globals.css";
import ScrollToTop from "../components/ScrollToTop";

export const metadata: Metadata = {
  title: {
    default: "Inspire Columbia",
    template: "%s | Inspire Columbia",
  },
  description: "A youth-run nonprofit focused on hosting events and serving our community.",
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
