"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
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
  UsersRound,
} from "lucide-react";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [rideCount, setRideCount] = useState(0);
  const [user, setUser] = useState<any>(null);

  // =========================================================
  // LOAD USER
  // =========================================================

  useEffect(() => {
    const savedUser = localStorage.getItem("ridemateUser");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const currentUser = JSON.parse(
          localStorage.getItem("ridemateUser") || "{}"
        );

        if (!currentUser.name) return;

        const snapshot = await getDocs(
          collection(db, "notifications")
        );

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
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error
        );
      }
    };

    loadNotifications();
  }, []);

  // =========================================================
  // LOAD TOTAL RIDES
  // =========================================================

  useEffect(() => {
    const loadRideCount = async () => {
      try {
        const snapshot = await getDocs(
          collection(db, "trips")
        );

        setRideCount(snapshot.size);
      } catch (error) {
        console.error(
          "Failed to load ride count:",
          error
        );
      }
    };

    loadRideCount();
  }, []);

  // =========================================================
  // CLOSE MENU
  // =========================================================

  const closeMenu = () => {
    setMenuOpen(false);
  };

  return (
    <>
      {/* =====================================================
          TOP NAVBAR
      ===================================================== */}

      <nav
        className="
          fixed
          top-0
          left-0
          right-0
          z-[1000]
          bg-black/80
          backdrop-blur-xl
          border-b
          border-zinc-800
          px-4
          py-3
          flex
          items-center
          justify-between
        "
      >

        {/* =================================================
            LEFT SIDE
        ================================================= */}

        <div className="flex items-center gap-4">

          <button
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
            className="
              p-2
              rounded-xl
              bg-white/10
              hover:bg-white/20
              transition
            "
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

        {/* =================================================
            RIGHT SIDE
        ================================================= */}

        <div className="flex items-center gap-2">

          {/* Search */}

          <a
            href="/search"
            className="
              p-2
              rounded-full
              bg-white/10
              hover:bg-white/20
              transition
            "
          >
            <Search size={20} />
          </a>

          {/* Saved */}

          <a
            href="/saved"
            className="
              p-2
              rounded-full
              bg-white/10
              hover:bg-white/20
              transition
            "
          >
            <Bookmark size={20} />
          </a>

          {/* Notifications */}

          <a
            href="/notifications"
            className="
              relative
              p-2
              rounded-full
              bg-white/10
              hover:bg-white/20
              transition
            "
          >
            <Bell size={20} />

            {notificationCount > 0 && (
              <span
                className="
                  absolute
                  -top-1
                  -right-1
                  min-w-[18px]
                  h-[18px]
                  px-1
                  flex
                  items-center
                  justify-center
                  rounded-full
                  bg-red-500
                  text-white
                  text-[9px]
                  font-black
                "
              >
                {notificationCount > 9
                  ? "9+"
                  : notificationCount}
              </span>
            )}
          </a>

          {/* Profile */}

          <a
            href="/profile"
            className="
              p-2
              rounded-full
              bg-white/10
              hover:bg-white/20
              transition
            "
          >
            <User size={20} />
          </a>

        </div>
      </nav>

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      {menuOpen && (
        <>
          {/* Backdrop */}

          <div
            className="
              fixed
              inset-0
              bg-black/60
              z-[9998]
            "
            onClick={closeMenu}
          />

          {/* Sidebar */}

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

            {/* Close button */}

            <button
              onClick={closeMenu}
              className="text-3xl mb-8"
            >
              <X size={28} />
            </button>

            {/* =================================================
                USER INFORMATION
            ================================================= */}

            {user && (
              <>
                <img
                  src={
                    user.image ||
                    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300"
                  }
                  alt="Profile"
                  className="
                    w-20
                    h-20
                    rounded-full
                    border-4
                    border-orange-500
                    object-cover
                  "
                />

                <h2 className="mt-3 font-black text-lg">
                  {user.name}
                </h2>

                <p className="text-zinc-400 text-sm">
                  {user.email}
                </p>
              </>
            )}

            {/* =================================================
                MENU ITEMS
            ================================================= */}

            <div className="flex flex-col gap-4 mt-8 text-lg">

              {/* Home */}

              <a
                href="/home"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <House size={22} />
                Home
              </a>

              {/* Explore Trips */}

              <a
                href="/feed"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <Compass size={22} />
                Explore Trips
              </a>

              {/* Post a Trip */}

              <a
                href="/create-trip"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <Bike size={22} />
                Post a Trip
              </a>

              {/* Leaderboard */}

              <a
                href="/leaderboard"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <Trophy size={22} />
                Leaderboard
              </a>

              {/* =================================================
                  CREW CHAT
              ================================================= */}

              <a
  href="/inbox"
  onClick={closeMenu}
  className="
    flex
    items-center
    gap-3
    hover:text-orange-500
    transition
  "
>
  <UsersRound size={22} />
  Crew Chat
</a>

              {/* Live Trip Chats */}

              <a
                href="/live-trip-chats"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <MessageCircle size={22} />
                Live Trip Chats
              </a>

              {/* Ride Requests */}

              <a
                href="/requests"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <Bike size={22} />
                Ride Requests
              </a>

              {/* My Rides */}

              <a
                href="/my-rides"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <Route size={22} />
                My Rides
              </a>

              {/* About Us */}

              <a
                href="/about"
                onClick={closeMenu}
                className="
                  flex
                  items-center
                  gap-3
                  hover:text-orange-500
                  transition
                "
              >
                <span className="text-xl">
                  ℹ️
                </span>
                About Us
              </a>

              {/* =================================================
                  TOTAL RIDES
              ================================================= */}

              <div
                className="
                  mt-6
                  pt-6
                  border-t
                  border-zinc-800
                  text-sm
                  text-zinc-400
                "
              >
                Total rides: {rideCount}
              </div>

            </div>

          </div>
        </>
      )}
    </>
  );
}