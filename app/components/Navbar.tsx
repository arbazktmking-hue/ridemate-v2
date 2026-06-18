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
} from "lucide-react";
export default function Navbar() {

  const [menuOpen, setMenuOpen] =
    useState(false);

  const [notificationCount, setNotificationCount] =
    useState(0);
const [rideCount, setRideCount] = useState(0);
  const [user, setUser] =
    useState<any>(null);

  useEffect(() => {

    const savedUser =
      localStorage.getItem("ridemateUser");

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
  };

  loadNotifications();
}, []);
useEffect(() => {

  const loadRideCount = async () => {

    const snapshot = await getDocs(
      collection(db, "trips")
    );

    setRideCount(snapshot.size);

  };

  loadRideCount();

}, []);
  return (
    <>
      <nav className="bg-black/80 backdrop-blur-xl text-white border-b border-white/10 px-4 py-4 flex items-center justify-between fixed top-0 left-0 right-0 z-[100]">

        <button
  onClick={() => setMenuOpen(!menuOpen)}
  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
>
  <Menu size={28} />
</button>

        <div className="flex items-center justify-between flex-1 ml-4">

  <div className="flex items-center gap-3">
    <Route className="text-orange-500" size={28} />

    <div>
      <h1 className="text-2xl font-black text-orange-500">
        RideMate
      </h1>

      <p className="text-xs text-zinc-400">
        Adventure starts here
      </p>
    </div>
  </div>

  <a
    href="/notifications"
    className="relative p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
  >
    <Bell size={24} />

    {notificationCount > 0 && (
      <span
        className="
          absolute
          -top-1
          -right-1
          min-w-[20px]
          h-5
          px-1
          flex
          items-center
          justify-center
          rounded-full
          bg-red-500
          text-white
          text-[10px]
          font-black
        "
      >
        {notificationCount > 9 ? "9+" : notificationCount}
      </span>
    )}
  </a>

</div>

      </nav>

      {menuOpen && (
  <>
    {/* Backdrop */}
    <div
      className="fixed inset-0 bg-black/60 z-[9998]"
      onClick={() => setMenuOpen(false)}
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

          <button
            onClick={() =>
              setMenuOpen(false)
            }
            className="text-3xl mb-8"
          >
            <X size={28} />
          </button>
{user && (

  <div className="mb-8 flex flex-col items-center">

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

  </div>

)}

          <div className="flex flex-col gap-3 text-lg">

  <a href="/" className="flex items-center gap-3 hover:text-orange-500 transition">
    <House size={20} />
    Home
  </a>

  <a href="/feed" className="flex items-center gap-3 hover:text-orange-500 transition">
    <Compass size={20} />
    Explore Trips
  </a>

  <a href="/leaderboard" className="flex items-center gap-3 hover:text-orange-500 transition">
    <Trophy size={20} />
    Hall of Riders
  </a>

  <a href="/inbox" className="flex items-center gap-3 hover:text-orange-500 transition">
    <MessageCircle size={20} />
    Crew Chat
  </a>

  <a href="/create-trip" className="flex items-center gap-3 hover:text-orange-500 transition">
    <Bike size={20} />
    Plan Expedition
  </a>

  <a href="/requests" className="flex items-center gap-3 hover:text-orange-500 transition">
    🚀
    Ride Requests
  </a>

 <a
  href="/live-trip-chats"
  className="flex items-center gap-3 hover:text-orange-500 transition"
>
  💬
  Live Trip Chats
</a>

  <a href="/profile" className="flex items-center gap-3 hover:text-orange-500 transition">
    <User size={20} />
    Rider Profile
  </a>

</div>

                </div> {/* End Sidebar */}
      </>
    )}
    </>
  );
}