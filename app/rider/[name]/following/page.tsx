
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase";

type FollowingRider = {
  id: string;
  name: string;
};

export default function FollowingPage() {
  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );

  const [following, setFollowing] = useState<FollowingRider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFollowing = async () => {
      try {
        setLoading(true);

        // Find the profile being viewed.
        const usersSnapshot = await getDocs(
          collection(db, "users")
        );

        const profile = usersSnapshot.docs.find((userDoc) => {
          const data = userDoc.data();

          return (
            data.username === riderName ||
            data.name === riderName
          );
        });

        const profileUid = profile?.data().uid || profile?.id;

        // Read records using UID when available.
        const followsSnapshot = await getDocs(
          collection(db, "follows")
        );

        const uniqueRiders = new Map<string, FollowingRider>();

        followsSnapshot.forEach((docSnap) => {
          const follow = docSnap.data();

          const matchesUid =
            !!profileUid &&
            follow.followerUid === profileUid;

          const matchesLegacyName =
            !follow.followerUid &&
            follow.follower === riderName;

          if (!matchesUid && !matchesLegacyName) {
            return;
          }

          const targetName = follow.following;

          if (
            typeof targetName !== "string" ||
            !targetName.trim()
          ) {
            return;
          }

          const targetUid =
            typeof follow.followingUid === "string"
              ? follow.followingUid
              : "";

          const key = targetUid || targetName.toLowerCase();

          uniqueRiders.set(key, {
            id: key,
            name: targetName,
          });
        });

        setFollowing(Array.from(uniqueRiders.values()));
      } catch (error) {
        console.error("Failed to load following:", error);
        setFollowing([]);
      } finally {
        setLoading(false);
      }
    };

    loadFollowing();
  }, [riderName]);

  return (
    <main className="min-h-screen bg-black text-white px-6 pt-28 pb-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black text-orange-500 mb-8">
          Following 👥
        </h1>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              Loading following...
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              Not following anyone yet.
            </div>
          ) : (
            following.map((rider) => (
              <Link
                key={rider.id}
                href={`/rider/${encodeURIComponent(rider.name)}`}
                className="block bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-orange-500 transition"
              >
                {rider.name}
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
