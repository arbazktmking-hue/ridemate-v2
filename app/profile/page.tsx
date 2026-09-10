"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();

  useEffect(() => {
    try {
      /* =====================================================
         ADMIN INVESTIGATION MODE
      ===================================================== */

      const savedAdminView =
        localStorage.getItem("ridemateAdminView");

      if (savedAdminView) {
        const adminView =
          JSON.parse(savedAdminView);

        if (
          adminView?.active &&
          adminView?.userName
        ) {
          router.replace(
            `/rider/${encodeURIComponent(
              adminView.userName
            )}`
          );

          return;
        }
      }


      /* =====================================================
         NORMAL USER
      ===================================================== */

      const savedUser =
        localStorage.getItem("ridemateUser");

      if (!savedUser) {
        router.replace("/login");
        return;
      }

      const currentUser =
        JSON.parse(savedUser);

      const userName =
        currentUser.name ||
        currentUser.username ||
        "";

      if (!userName) {
        router.replace("/login");
        return;
      }

      router.replace(
        `/rider/${encodeURIComponent(
          userName
        )}`
      );

    } catch (error) {
      console.error(
        "Failed to open profile:",
        error
      );

      router.replace("/login");
    }

  }, [router]);

  return null;
}