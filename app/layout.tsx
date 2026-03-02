import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inspire Columbia",
  description: "A youth-run nonprofit focused on hosting events and serving our community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
