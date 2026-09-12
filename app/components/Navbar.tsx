"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useRouter } from "next/navigation";

import {
  Menu,
  X,
  House,
  Compass,
  Trophy,
  MessageCircle,
  Bike,
  Bell,
  Route,
  Search,
  Bookmark,
  UsersRound,
} from "lucide-react";

type AdminViewData = {
  active?: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userImage?: string;
  startedAt?: number;
};

export default function Navbar() {
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [rideCount, setRideCount] = useState(0);

  // =========================================================
  // ADMIN INVESTIGATION MODE
  // =========================================================

  const [adminView, setAdminView] =
    useState<AdminViewData | null>(null);

  // =========================================================
  // LOAD ADMIN VIEW
  // =========================================================

  useEffect(() => {
    const loadIdentity = () => {
      try {
        const savedAdminView =
          localStorage.getItem("ridemateAdminView");

        if (savedAdminView) {
          const parsedAdminView =
            JSON.parse(savedAdminView);

          if (parsedAdminView?.active) {
            setAdminView(parsedAdminView);
          } else {
            setAdminView(null);
          }
        } else {
          setAdminView(null);
        }
      } catch (error) {
        console.error(
          "Failed to load navbar identity:",
          error
        );

        setAdminView(null);
      }
    };

    loadIdentity();

    // Listen for admin-view changes made in the same browser
    const handleAdminViewChange = () => {
      loadIdentity();
    };

    window.addEventListener(
      "ridemateAdminViewChanged",
      handleAdminViewChange
    );

    window.addEventListener(
      "storage",
      handleAdminViewChange
    );

    return () => {
      window.removeEventListener(
        "ridemateAdminViewChanged",
        handleAdminViewChange
      );

      window.removeEventListener(
        "storage",
        handleAdminViewChange
      );
    };
  }, []);

  // =========================================================
  // EXIT ADMIN VIEW
  // =========================================================

  const exitAdminView = () => {
    const confirmed = window.confirm(
      "Exit Admin View Mode and return to your admin account?"
    );

    if (!confirmed) return;

    localStorage.removeItem("ridemateAdminView");

    setAdminView(null);
    setMenuOpen(false);

    // Tell other components on the page that the mode changed
    window.dispatchEvent(
      new Event("ridemateAdminViewChanged")
    );

    router.push("/admin");
  };

  // =========================================================
  // CLOSE MENU
  // =========================================================

  const closeMenu = () => {
    setMenuOpen(false);
  };

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

  return (
    <>
      {/* =====================================================
          ADMIN VIEW MODE BANNER
      ===================================================== */}

      {adminView?.active && (
        <div
          className="
            fixed
            top-0
            left-0
            right-0
            z-[2000]
            bg-orange-600
            text-white
            px-4
            py-2
            shadow-lg
            flex
            items-center
            justify-center
            gap-3
            text-sm
            font-bold
          "
        >
          <span className="text-lg">
            🛡️
          </span>

          <span>
            ADMIN VIEW MODE
          </span>

          <span className="hidden sm:inline text-orange-100">
            • Viewing as{" "}
            <strong className="text-white">
              {adminView.userName ||
                "Unknown User"}
            </strong>
          </span>

          <button
            onClick={exitAdminView}
            className="
              ml-2
              px-3
              py-1
              rounded-lg
              bg-black/30
              hover:bg-black/50
              border
              border-white/20
              transition
              text-xs
              font-black
            "
          >
            Exit User View
          </button>
        </div>
      )}

      {/* =====================================================
          TOP NAVBAR
      ===================================================== */}

      <nav
        className={`
          fixed
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
          ${adminView?.active
            ? "top-[40px]"
            : "top-0"}
        `}
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
            {menuOpen ? (
              <X size={24} />
            ) : (
              <Menu size={24} />
            )}
          </button>

          <div>
            <h1 className="text-2xl font-black text-orange-500">
              RideMate
            </h1>

            <p className="text-xs text-zinc-400">
              {adminView?.active
                ? "Admin Investigation Mode"
                : "Adventure starts here"}
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
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
            className={`
              fixed
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
              ${adminView?.active
                ? "top-[40px]"
                : "top-0"}
            `}
          >

            {/* Close button */}

            <button
              onClick={closeMenu}
              className="text-3xl mb-8"
            >
              <X size={28} />
            </button>

            {/* =================================================
                ADMIN VIEW INFORMATION
            ================================================= */}

            {adminView?.active && (
              <div
                className="
                  mb-6
                  p-4
                  rounded-2xl
                  bg-orange-500/10
                  border
                  border-orange-500/30
                "
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>🛡️</span>

                  <span className="text-orange-400 font-black text-sm">
                    ADMIN VIEW
                  </span>
                </div>

                <p className="text-xs text-zinc-400">
                  Investigating account
                </p>

                <p className="font-bold mt-1">
                  {adminView.userName ||
                    "Unknown User"}
                </p>

                <p className="text-xs text-zinc-500 mt-1 break-all">
                  {adminView.userEmail || ""}
                </p>

                <button
                  onClick={exitAdminView}
                  className="
                    w-full
                    mt-4
                    py-2
                    rounded-xl
                    bg-orange-500
                    hover:bg-orange-600
                    text-black
                    font-black
                    text-sm
                    transition
                  "
                >
                  Exit User View
                </button>
              </div>
            )}

            {/* =================================================
                MENU ITEMS
            ================================================= */}

            <div className="flex flex-col gap-4 text-lg">

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

              {/* Crew Chat */}

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

              {/* Help & Feedback */}

              <a
                href="/help-feedback"
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
                  🆘
                </span>
                Help & Feedback
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