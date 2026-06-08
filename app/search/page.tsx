"use client";

import { useEffect, useState } from "react";

import {
  collection,
  getDocs
} from "firebase/firestore";
import Link from "next/link";
import { db } from "../firebase";

export default function SearchPage() {

  const [search, setSearch] = useState("");
const [riders, setRiders] = useState<any[]>([]);
useEffect(() => {

  const loadRiders = async () => {

    const snapshot = await getDocs(
      collection(db, "trips")
    );

    const uniqueRiders: any[] = [];

    const names = new Set();

    snapshot.forEach((doc) => {

      const trip = doc.data();

      if (
        trip.userName &&
        !names.has(trip.userName)
      ) {

        names.add(trip.userName);

        uniqueRiders.push({
          name: trip.userName,
          image: trip.userImage,
        });

      }

    });

    setRiders(uniqueRiders);

  };

  loadRiders();

}, []);
  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Search Riders 🔍
        </h1>

        <input
          type="text"
          placeholder="Search riders..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700"
        />
<div className="mt-8 space-y-4">

  {riders
  .filter((rider) =>
    rider.name
      ?.toLowerCase()
      .includes(
        search.toLowerCase()
      )
  )
  .map((rider, index) => (

    <Link
      key={index}
      href={`/rider/${encodeURIComponent(rider.name)}`}
      className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center gap-4 hover:border-orange-500 transition"
    >

      <img
        src={rider.image}
        alt="Rider"
        className="w-14 h-14 rounded-full"
      />

      <h2 className="font-bold text-xl">
        {rider.name}
      </h2>

    </Link>

  ))}

</div>
      </div>

    </main>
  );
}