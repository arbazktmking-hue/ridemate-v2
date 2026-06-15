"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function LeaderboardPage() {

  const [riders, setRiders] = useState<any[]>([]);
const [leaderboardType, setLeaderboardType] =
  useState("distance");
  useEffect(() => {

    const loadLeaderboard = async () => {

      const snapshot = await getDocs(
        collection(db, "trips")
      );
const followsSnapshot = await getDocs(
  collection(db, "follows")
);
      const riderMap: any = {};

      snapshot.forEach((doc) => {

  const trip = doc.data();

  if (trip.status !== "completed") return;

  if (!riderMap[trip.userName]) {

    riderMap[trip.userName] = {
      name: trip.userName,
      likes: 0,
      distance: 0,
      trips: 0,
      followers: 0,
      image: trip.userImage,
    };

  }

  riderMap[trip.userName].likes +=
    trip.likes || 0;

  riderMap[trip.userName].distance +=
    Number(trip.distance || 0);

  riderMap[trip.userName].trips += 1;

});
    followsSnapshot.forEach((doc) => {

  const follow = doc.data();

  if (
    riderMap[follow.following]
  ) {

    riderMap[
      follow.following
    ].followers++;

  }

});

let leaderboard = Object.values(
  riderMap
);

if (leaderboardType === "distance") {

  leaderboard.sort(
    (a: any, b: any) =>
      b.distance - a.distance
  );

}

if (leaderboardType === "likes") {

  leaderboard.sort(
    (a: any, b: any) =>
      b.likes - a.likes
  );

}

if (leaderboardType === "followers") {

  leaderboard.sort(
    (a: any, b: any) =>
      b.followers - a.followers
  );

}

setRiders(leaderboard);

    };

    loadLeaderboard();

}, [leaderboardType]);

  return (

    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-10">
          Rider Leaderboard 🏆
        </h1>
<div className="flex gap-4 mb-8">

  <button
    onClick={() =>
      setLeaderboardType("distance")
    }
    className="bg-orange-500 px-4 py-2 rounded-xl font-bold"
  >
    🛣️ Distance
  </button>

  <button
    onClick={() =>
      setLeaderboardType("likes")
    }
    className="bg-zinc-800 px-4 py-2 rounded-xl font-bold"
  >
    ❤️ Likes
  </button>

  <button
    onClick={() =>
      setLeaderboardType("followers")
    }
    className="bg-zinc-800 px-4 py-2 rounded-xl font-bold"
  >
    👥 Followers
  </button>

</div>
        <div className="space-y-4">

          {riders.map(
  (rider, index) => (

              <Link
  key={index}
  href={`/rider/${encodeURIComponent(rider.name)}`}
  className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between hover:border-orange-500 transition"
>

               <div className="flex items-center gap-4">

  <span className="text-2xl font-black text-orange-500">
    {index === 0
      ? "🥇"
      : index === 1
      ? "🥈"
      : index === 2
      ? "🥉"
      : `#${index + 1}`}
  </span>

  <img
    src={rider.image}
    alt="Rider"
    className="w-12 h-12 rounded-full"
  />

  <h2 className="font-bold text-xl">
    {rider.name}
  </h2>

</div>

<div className="font-black">

{leaderboardType === "distance" &&
  `🛣️ ${rider.distance} KM`}

{leaderboardType === "likes" &&
  `❤️ ${rider.likes}`}

{leaderboardType === "followers" &&
  `👥 ${rider.followers}`}

</div>

</Link>

            )
          )}

        </div>

      </div>

    </main>

  );

}