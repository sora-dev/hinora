import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hinora | Sign In",
  description: "Hinora AI Policy Library sign-in page",
  icons: {
    icon: "/branding/hinora-logo-icon.png",
    shortcut: "/branding/hinora-logo-icon.png",
    apple: "/branding/hinora-logo-icon.png",
  },
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
