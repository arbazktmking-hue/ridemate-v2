"use client";

import "./globals.css";
import Navbar from "./components/Navbar";
import { usePathname } from "next/navigation";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const hideNavbar =
    pathname === "/login";

  return (
    <html lang="en">
  <head>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#f97316" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
  </head>

  <body>
    {!hideNavbar && <Navbar />}
    {children}
  </body>
</html>
  );
}