"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function LiveTripChatsPage() {
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    const loadChats = async () => {
      const savedUser = localStorage.getItem("ridemateUser");

      if (!savedUser) return;

      const currentUser = JSON.parse(savedUser);

      const snapshot = await getDocs(collection(db, "tripChats"));

      const loaded: any[] = [];

      snapshot.forEach((docSnap) => {
        const chat = docSnap.data();

        const hasReviewed =
          Array.isArray(chat.reviewedUsers) &&
          chat.reviewedUsers.includes(currentUser.name);

        const isMember =
          Array.isArray(chat.members) &&
          chat.members.includes(currentUser.name);

        const shouldShow =
          isMember &&
          (
            // Active trip
            chat.completed === false ||

            // Completed trip but passenger still needs to review
            (
              chat.completed === true &&
              currentUser.name !== chat.owner &&
              !hasReviewed
            )
          );

        if (shouldShow) {
          loaded.push({
            id: docSnap.id,
            ...chat,
          });
        }
      });

      setChats(loaded);
    };

    loadChats();

    const interval = setInterval(loadChats, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-4xl font-black text-orange-500 mb-6">
        💬 Live Trip Chats
      </h1>

      {chats.length === 0 ? (
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
          <p className="text-zinc-400">
            No active trip chats.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {chats.map((chat) => (
            <Link
              key={chat.id}
              href={`/trip-chat/${chat.id}`}
              className="block bg-zinc-900 border border-zinc-800 rounded-2xl p-5 hover:border-orange-500 transition"
            >
              <h2 className="text-2xl font-bold text-orange-400">
                🏍 {chat.destination}
              </h2>

              <p className="mt-2 text-zinc-400">
                {chat.members?.length || 0} rider(s) in chat
              </p>

              {chat.completed ? (
                <p className="mt-2 text-yellow-400 font-bold">
                  ⭐ Please rate your rider
                </p>
              ) : (
                <p className="mt-2 text-green-400 font-bold">
                  🟢 Active Trip
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}