"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function Navbar() {
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
    <nav className="w-full bg-zinc-900 text-white border-b border-zinc-800 px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">

      <h1 className="text-3xl font-black text-orange-500">
        RideMate 🏍🔥
      </h1>

      <div className="flex flex-wrap justify-center gap-3 text-sm md:text-base">

  <a
    href="/"
    className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
  >
    Home
  </a>

  <a
    href="/feed"
    className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
  >
    Feed
  </a>

  <a
    href="/leaderboard"
    className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
  >
    Leaderboard
  </a>

  <a
    href="/inbox"
    className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
  >
    Inbox
  </a>

  <a
    href="/create-trip"
    className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
  >
    Create Trip
  </a>
<a
  href="/requests"
  className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
>
  Requests
</a>
  <a
    href="/profile"
    className="px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
  >
    Profile
  </a>
<a
  href="/notifications"
  className="relative px-5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-white hover:bg-orange-500 hover:border-orange-500 transition"
>
  🔔 Notifications

  {notificationCount > 0 && (
    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black rounded-full px-2 py-1">
      {notificationCount}
    </span>
  )}
</a>
</div>

    </nav>
  );
}