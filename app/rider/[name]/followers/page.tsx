
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../../../firebase";

type FollowerRider = {
  id: string;
  name: string;
};

export default function FollowersPage() {
  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );

  const [followers, setFollowers] = useState<FollowerRider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFollowers = async () => {
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

        const followsSnapshot = await getDocs(
          collection(db, "follows")
        );

        const uniqueRiders = new Map<string, FollowerRider>();

        followsSnapshot.forEach((docSnap) => {
          const follow = docSnap.data();

          const matchesUid =
            !!profileUid &&
            follow.followingUid === profileUid;

          const matchesLegacyName =
            !follow.followingUid &&
            follow.following === riderName;

          if (!matchesUid && !matchesLegacyName) {
            return;
          }

          const followerName = follow.follower;

          if (
            typeof followerName !== "string" ||
            !followerName.trim()
          ) {
            return;
          }

          const followerUid =
            typeof follow.followerUid === "string"
              ? follow.followerUid
              : "";

          const key = followerUid || followerName.toLowerCase();

          uniqueRiders.set(key, {
            id: key,
            name: followerName,
          });
        });

        setFollowers(Array.from(uniqueRiders.values()));
      } catch (error) {
        console.error("Failed to load followers:", error);
        setFollowers([]);
      } finally {
        setLoading(false);
      }
    };

    loadFollowers();
  }, [riderName]);

  return (
    <main className="min-h-screen bg-black text-white px-6 pt-28 pb-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black text-orange-500 mb-8">
          Followers 👥
        </h1>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              Loading followers...
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No followers yet.
            </div>
          ) : (
            followers.map((follower) => (
              <Link
                key={follower.id}
                href={`/rider/${encodeURIComponent(follower.name)}`}
                className="block bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-orange-500 transition"
              >
                {follower.name}
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
