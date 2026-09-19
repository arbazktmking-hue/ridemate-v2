"use client";

import "./globals.css";

import Navbar from "./components/Navbar";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [checkingAccess, setCheckingAccess] =
    useState(true);

  // =========================================================
  // ROUTE / TERMS ACCESS CONTROL
  // =========================================================

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (firebaseUser) => {
          // -------------------------------------------------
          // LOGIN PAGE IS ALWAYS PUBLIC
          // -------------------------------------------------

          if (
            pathname === "/login"
          ) {
            setCheckingAccess(false);
            return;
          }

          // -------------------------------------------------
          // EVERYTHING ELSE REQUIRES GOOGLE AUTH
          // -------------------------------------------------

          if (!firebaseUser) {
            setCheckingAccess(false);

            router.replace(
              "/login"
            );

            return;
          }

          // -------------------------------------------------
          // TERMS PAGE IS AVAILABLE TO AUTHENTICATED USERS
          // -------------------------------------------------

          if (
            pathname === "/terms"
          ) {
            setCheckingAccess(false);
            return;
          }

          // -------------------------------------------------
          // CHECK USER-SPECIFIC TERMS ACCEPTANCE
          // -------------------------------------------------

          const accepted =
            localStorage.getItem(
              `termsAccepted_${firebaseUser.uid}`
            ) === "true";

          if (!accepted) {
            setCheckingAccess(false);

            router.replace(
              "/terms"
            );

            return;
          }

          // -------------------------------------------------
          // USER IS AUTHENTICATED + TERMS ACCEPTED
          // -------------------------------------------------

          setCheckingAccess(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    pathname,
    router,
  ]);

  // =========================================================
  // DON'T SHOW APP / NAVBAR WHILE ACCESS IS BEING CHECKED
  // =========================================================

  if (
    checkingAccess &&
    pathname !== "/login"
  ) {
    return (
      <html lang="en">
        <head>
          <link
            rel="manifest"
            href="/manifest.json"
          />

          <meta
            name="theme-color"
            content="#f97316"
          />

          <link
            rel="apple-touch-icon"
            href="/icon-192.png"
          />
        </head>

        <body
          className="
            bg-black
            text-white
          "
        >
          <main
            className="
              min-h-screen
              flex
              items-center
              justify-center
              bg-black
            "
          >
            <div
              className="
                text-center
              "
            >
              <div
                className="
                  text-3xl
                  font-black
                  text-orange-500
                "
              >
                RideMate 🏍️
              </div>

              <p
                className="
                  text-zinc-500
                  mt-3
                "
              >
                Checking access...
              </p>
            </div>
          </main>
        </body>
      </html>
    );
  }

  // =========================================================
  // HIDE NAVBAR ON LOGIN + TERMS
  // =========================================================

  const hideNavbar =
    pathname === "/login" ||
    pathname === "/terms";

  return (
    <html lang="en">
      <head>
        <link
          rel="manifest"
          href="/manifest.json"
        />

        <meta
          name="theme-color"
          content="#f97316"
        />

        <link
          rel="apple-touch-icon"
          href="/icon-192.png"
        />
      </head>

      <body>
        {!hideNavbar && (
          <Navbar />
        )}

        {children}
      </body>
    </html>
  );
}