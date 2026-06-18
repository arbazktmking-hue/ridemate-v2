"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function LiveTripChatsPage() {
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    const loadChats = async () => {
      const currentUser = JSON.parse(
        localStorage.getItem("ridemateUser") || "{}"
      );

      if (!currentUser.name) return;

      const snapshot = await getDocs(
        collection(db, "tripChats")
      );

      const loaded: any[] = [];

      snapshot.forEach((docSnap) => {
        const chat = docSnap.data();

        // Only show active chats that the current user belongs to
        if (
          chat.members?.includes(currentUser.name) &&
          chat.completed === false
        ) {
          loaded.push({
            id: docSnap.id,
            ...chat,
          });
        }
      });

      setChats(loaded);
    };

    loadChats();
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
                {chat.members.length} rider(s) in chat
              </p>

              <p className="mt-1 text-sm text-zinc-500">
                Tap to open
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}