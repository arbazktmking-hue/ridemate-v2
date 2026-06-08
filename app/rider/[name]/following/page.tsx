"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../../../firebase";

export default function FollowingPage() {

  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );

  const [following, setFollowing] =
    useState<any[]>([]);

  useEffect(() => {

    const loadFollowing = async () => {

      const snapshot = await getDocs(
        collection(db, "follows")
      );

      const list: any[] = [];

      snapshot.forEach((doc) => {

        const follow = doc.data();

        if (
          follow.follower === riderName
        ) {

          list.push({
            name: follow.following,
          });

        }

      });

      setFollowing(list);

    };

    loadFollowing();

  }, [riderName]);

  return (

    <main className="min-h-screen bg-black text-white px-6 py-10">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Following 👥
        </h1>

        <div className="space-y-4">

          {following.map(
            (rider, index) => (

              <Link
                key={index}
                href={`/rider/${encodeURIComponent(rider.name)}`}
                className="block bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-orange-500"
              >
                {rider.name}
              </Link>

            )
          )}

        </div>

      </div>

    </main>

  );

}