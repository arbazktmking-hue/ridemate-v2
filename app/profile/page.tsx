"use client";

import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function ProfilePage() {

  const [user, setUser] = useState<any>(null);
  const [tripCount, setTripCount] = useState(0);
const [totalLikes, setTotalLikes] = useState(0);

  const router = useRouter();

  useEffect(() => {

    const savedUser = localStorage.getItem(
      "ridemateUser"
    );

    if (!savedUser) {

      router.push("/login");

    } else {

    const currentUser = JSON.parse(savedUser);

setUser(currentUser);

const loadStats = async () => {

  const snapshot = await getDocs(
    collection(db, "trips")
  );

  let trips = 0;
  let likes = 0;

  snapshot.forEach((doc) => {

    const trip = doc.data();

    if (
      trip.userName === currentUser.name
    ) {

      trips++;

      likes += trip.likes || 0;

    }

  });

  setTripCount(trips);
  setTotalLikes(likes);

};

loadStats();

    }

  }, []);

  const logout = () => {

    localStorage.removeItem("ridemateUser");

    router.push("/login");

  };

  if (!user) {

    return null;

  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-2xl mx-auto bg-zinc-900 rounded-3xl border border-zinc-800 p-10 text-center">

        <img
          src={user.image}
          alt="Profile"
          className="w-32 h-32 rounded-full mx-auto border-4 border-orange-500"
        />

        <h1 className="text-4xl font-black mt-6">
          {user.name}
        </h1>

        <p className="text-zinc-400 mt-2">
          {user.email}
        </p>
<div className="mt-8 space-y-3">

  <div className="bg-black p-4 rounded-2xl">
    🏍 Trips Posted: {tripCount}
  </div>

  <div className="bg-black p-4 rounded-2xl">
    ❤️ Likes Received: {totalLikes}
  </div>

</div>
        <button
          onClick={logout}
          className="mt-10 bg-red-500 px-8 py-3 rounded-2xl font-black"
        >
          Logout
        </button>

      </div>

    </main>
  );
}