"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PageBackground from "../components/PageBackground";
import {
  collection,
  getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export default function InboxPage() {

  const [chats, setChats] =
    useState<any[]>([]);

  useEffect(() => {

  const loadChats = async () => {

    const currentUser = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    const snapshot = await getDocs(
      collection(db, "messages")
    );

    const riders: any = {};

    snapshot.forEach((doc) => {

      const msg = doc.data();

      if (msg.sender === currentUser.name) {
        riders[msg.receiver] = true;
      }

      if (msg.receiver === currentUser.name) {
        riders[msg.sender] = true;
      }

    });

    setChats(Object.keys(riders));

  };

  // Initial load
  loadChats();

  // Refresh every second
  const interval = setInterval(() => {
    loadChats();
  }, 1000);

  return () => clearInterval(interval);

}, []);

  return (

    <PageBackground>

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Inbox 📥
        </h1>

        <div className="space-y-4">

          {chats.map((rider) => (

            <Link
              key={rider}
              href={`/chat/${encodeURIComponent(rider)}`}
              className="block bg-zinc-900 p-4 rounded-2xl border border-zinc-800 hover:border-orange-500"
            >
              💬 {rider}
            </Link>

          ))}

        </div>

      </div>

    </PageBackground>

  );

}