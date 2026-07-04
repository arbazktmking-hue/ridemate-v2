"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {

  const router = useRouter();

  useEffect(() => {

    const user =
      localStorage.getItem(
        "ridemateUser"
      );

    if (user) {

      // logged in users go to home feed
      router.push("/home");

    } else {

      // new users go to login
      router.push("/login");

    }

  }, []);

  return (
    <main className="
      min-h-screen
      bg-black
      flex
      items-center
      justify-center
      text-white
    ">
      Loading RideMate... 🏍️
    </main>
  );
}