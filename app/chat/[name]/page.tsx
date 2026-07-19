"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  collection,
  addDoc,
  getDocs,
} from "firebase/firestore";

import { db } from "../../firebase";

export default function ChatPage() {

  const params = useParams();

  const riderName = decodeURIComponent(
    params.name as string
  );

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Load logged-in user
  useEffect(() => {

    const user = JSON.parse(
      localStorage.getItem("ridemateUser") || "{}"
    );

    setCurrentUser(user);

  }, []);

  // Load chat messages
  useEffect(() => {

    if (!currentUser) return;

    const loadMessages = async () => {

      const snapshot = await getDocs(
        collection(db, "messages")
      );

      const allMessages: any[] = [];

      snapshot.forEach((doc) => {

        const msg = doc.data();

        if (
          (
            msg.sender === currentUser.name &&
            msg.receiver === riderName
          )
          ||
          (
            msg.sender === riderName &&
            msg.receiver === currentUser.name
          )
        ) {
          allMessages.push(msg);
        }

      });

      allMessages.sort(
        (a, b) => a.createdAt - b.createdAt
      );

      setMessages(allMessages);

    };

    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 1000);

    return () => clearInterval(interval);

  }, [currentUser, riderName]);

  const sendMessage = async () => {

    if (!currentUser) return;

    if (!message.trim()) return;

    try {

      await addDoc(
        collection(db, "messages"),
        {
          sender: currentUser.name,
          receiver: riderName,
          text: message,
          createdAt: Date.now(),
        }
      );

      setMessage("");

      // Reload messages
      const snapshot = await getDocs(
        collection(db, "messages")
      );

      const allMessages: any[] = [];

      snapshot.forEach((doc) => {

        const msg = doc.data();

        if (
          (
            msg.sender === currentUser.name &&
            msg.receiver === riderName
          )
          ||
          (
            msg.sender === riderName &&
            msg.receiver === currentUser.name
          )
        ) {
          allMessages.push(msg);
        }

      });

      allMessages.sort(
        (a, b) => a.createdAt - b.createdAt
      );

      setMessages(allMessages);

    } catch (error) {

      console.log(error);

    }

  };

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading chat...
      </main>
    );
  }

  return (

    <main className="min-h-screen bg-black text-white p-6">

      <h1 className="text-4xl font-black text-orange-500 mb-6">
        Chat with {riderName} 💬
      </h1>

      <div className="bg-zinc-900 rounded-2xl p-6 h-[500px] flex flex-col">

        <div className="flex-1 overflow-y-auto space-y-3">

          {messages.map((msg, index) => (

  <div
    key={index}
    className={`p-3 rounded-xl w-fit max-w-[75%] ${
      msg.sender === currentUser.name
        ? "bg-orange-500 ml-auto"
        : "bg-zinc-800"
    }`}
  >

    {msg.type === "sharedTrip" ? (

  <Link
  href={`/feed?trip=${msg.tripId}`}
  className="block"
>
    <div className="bg-black/30 rounded-xl p-3 border border-orange-400 hover:border-orange-500 transition">

      {msg.image && (
        <img
          src={msg.image}
          alt={msg.destination}
          className="w-full h-40 object-cover rounded-lg mb-3"
        />
      )}

      <p className="text-orange-300 font-bold">
        🏍 Shared a Ride
      </p>

      <p className="text-xl font-bold mt-2">
        {msg.destination}
      </p>

      <p className="text-sm text-zinc-300">
        Rider: {msg.rider}
      </p>

      <p className="text-sm text-zinc-300">
        Bike: {msg.bike}
      </p>

      <p className="text-orange-400 mt-3 font-semibold">
        Tap to view ride →
      </p>

    </div>
  </Link>

) : (

  <p>{msg.text}</p>

)}

  </div>

))}

        </div>

        <div className="flex gap-3 mt-4">

          <input
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Type message..."
            className="flex-1 p-3 rounded-xl bg-zinc-800"
          />

          <button
            onClick={sendMessage}
            className="bg-orange-500 px-6 rounded-xl font-bold"
          >
            Send
          </button>

        </div>

      </div>

    </main>

  );

}