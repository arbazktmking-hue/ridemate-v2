"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {

  const router = useRouter();

  useEffect(() => {

    const user = localStorage.getItem(
      "ridemateUser"
    );

    if (user) {

      router.push("/feed");

    } else {

      router.push("/login");

    }

  }, []);

  return (
    <main className="min-h-screen bg-black flex items-center justify-center text-white">
      Loading RideMate... 🏍️
    </main>
  );

}