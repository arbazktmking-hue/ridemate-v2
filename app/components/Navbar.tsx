"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";
import {
  Menu,
  X,
  House,
  Compass,
  Trophy,
  MessageCircle,
  Bike,
  Bell,
  User,
  Route,
  Search,
  Bookmark,
} from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [rideCount, setRideCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("ridemateUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      const currentUser = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (!currentUser.name) return;

      const snapshot = await getDocs(collection(db, "notifications"));

      let unread = 0;

      snapshot.forEach((docSnap) => {
        const notification = docSnap.data();

        if (
          notification.user === currentUser.name &&
          notification.read === false
        ) {
          unread++;
        }
      });

      setNotificationCount(unread);
    };

    loadNotifications();
  }, []);

  useEffect(() => {
    const loadRideCount = async () => {
      const snapshot = await getDocs(collection(db, "trips"));
      setRideCount(snapshot.size);
    };

    loadRideCount();
  }, []);

  return (
    <>
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-black/80 backdrop-blur-xl border-b border-zinc-800 px-4 py-3 flex items-center justify-between">

        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
          >
            <Menu size={24} />
          </button>

          <div>
            <h1 className="text-2xl font-black text-orange-500">
              RideMate
            </h1>
            <p className="text-xs text-zinc-400">
              Adventure starts here
            </p>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">

  <a href="/search" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
    <Search size={20} />
  </a>

  <a href="/saved" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
    <Bookmark size={20} />
  </a>

  <a href="/notifications" className="relative p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
    <Bell size={20} />
    {notificationCount > 0 && (
      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black">
        {notificationCount > 9 ? "9+" : notificationCount}
      </span>
    )}
  </a>

  <a href="/profile" className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition">
    <User size={20} />
  </a>

</div>
      </nav>

      {/* Sidebar */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-[9998]"
            onClick={() => setMenuOpen(false)}
          />

          <div
            className="
              fixed
              top-0
              left-0
              h-screen
              w-72
              bg-zinc-950
              border-r
              border-zinc-800
              p-6
              pb-20
              overflow-y-auto
              z-[9999]
            "
          >
            <button
              onClick={() => setMenuOpen(false)}
              className="text-3xl mb-8"
            >
              <X size={28} />
            </button>

            {user && (
              <>
                <img
                  src={user.image}
                  alt="Profile"
                  className="w-20 h-20 rounded-full border-4 border-orange-500"
                />

                <h2 className="mt-3 font-black text-lg">
                  {user.name}
                </h2>

                <p className="text-zinc-400 text-sm">
                  {user.email}
                </p>
              </>
            )}

            <div className="flex flex-col gap-4 mt-8 text-lg">
              <a href="/home" className="flex items-center gap-3 hover:text-orange-500 transition">
                <House size={22} />
                Home
              </a>

              <a href="/feed" className="flex items-center gap-3 hover:text-orange-500 transition">
                <Compass size={22} />
                Explore Trips
              </a>
<a
  href="/create-trip"
  className="flex items-center gap-3 hover:text-orange-500 transition"
>
  <Bike size={22} />
  Post a Trip
</a>
              <a href="/leaderboard" className="flex items-center gap-3 hover:text-orange-500 transition">
                <Trophy size={22} />
                Leaderboard
              </a>

              <a href="/live-trip-chats" className="flex items-center gap-3 hover:text-orange-500 transition">
                <MessageCircle size={22} />
                Live Trip Chats
              </a>

              <a href="/requests" className="flex items-center gap-3 hover:text-orange-500 transition">
  <Bike size={22} />
  Ride Requests
</a>

<a href="/my-rides" className="flex items-center gap-3 hover:text-orange-500 transition">
  <Route size={22} />
  My Trips
</a>

<a href="/about" className="flex items-center gap-3 hover:text-orange-500 transition">
  ℹ️
  About Us
</a>

<div className="mt-6 pt-6 border-t border-zinc-800 text-sm text-zinc-400">
  Total rides: {rideCount}
</div>
            </div>
          </div>
        </>
      )}
    </>
  );
}