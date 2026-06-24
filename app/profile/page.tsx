"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("ridemateUser");

    if (!savedUser) {
      router.replace("/login");
      return;
    }

    const currentUser = JSON.parse(savedUser);

    router.replace(
      `/rider/${encodeURIComponent(currentUser.name)}`
    );
  }, [router]);

  return null;
}