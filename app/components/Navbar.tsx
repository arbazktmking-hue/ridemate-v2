"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function Navbar() {

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] =
    useState(0);

  useEffect(() => {

    const loadNotifications = async () => {

      const user = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (!user.name) return;

      const snapshot = await getDocs(
        collection(db, "notifications")
      );

      let count = 0;

      snapshot.forEach((doc) => {

        const notification = doc.data();

        if (
          notification.user === user.name
        ) {
          count++;
        }

      });

      setNotificationCount(count);

    };

    loadNotifications();

  }, []);

  return (
    <>
      <nav className="bg-zinc-900 text-white border-b border-zinc-800 px-4 py-4 flex items-center justify-between">

        <button
          onClick={() =>
            setMenuOpen(!menuOpen)
          }
          className="text-3xl font-black"
        >
          ☰
        </button>

        <h1 className="text-3xl font-black text-orange-500">
          RideMate 🏍🔥
        </h1>

      </nav>

      {menuOpen && (

        <div className="fixed left-0 top-0 h-screen w-72 bg-zinc-950 border-r border-zinc-800 p-6 z-50">

          <button
            onClick={() =>
              setMenuOpen(false)
            }
            className="text-3xl mb-8"
          >
            ✕
          </button>

          <div className="flex flex-col gap-4 text-lg">

            <a href="/">🏠 Home</a>

            <a href="/feed">
              🔥 Feed
            </a>

            <a href="/leaderboard">
              🏆 Leaderboard
            </a>

            <a href="/inbox">
              💬 Inbox
            </a>

            <a href="/create-trip">
              🏍 Create Trip
            </a>

            <a href="/requests">
              🚀 Requests
            </a>

            <a
              href="/notifications"
              className="relative"
            >
              🔔 Notifications

              {notificationCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-black rounded-full px-2 py-1">
                  {notificationCount}
                </span>
              )}
            </a>

            <a href="/profile">
              👤 Profile
            </a>

          </div>

        </div>

      )}
    </>
  );
}