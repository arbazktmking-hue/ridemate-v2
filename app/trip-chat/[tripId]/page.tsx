"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function TripChatPage() {
  const { tripId } = useParams();

  const [chat, setChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const currentUser = JSON.parse(
    localStorage.getItem("ridemateUser") || "{}"
  );

  useEffect(() => {
    loadChat();
    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  async function loadChat() {
    if (!tripId) return;

    const snap = await getDoc(
      doc(db, "tripChats", tripId as string)
    );

    if (snap.exists()) {
      setChat(snap.data());
    }
  }

  async function loadMessages() {
    const snapshot = await getDocs(
      collection(db, "tripChatMessages")
    );

    const msgs: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      if (data.tripId === tripId) {
        msgs.push(data);
      }
    });

    msgs.sort((a, b) => a.createdAt - b.createdAt);

    setMessages(msgs);
  }

  async function sendMessage() {
    if (!message.trim()) return;

    await addDoc(
      collection(db, "tripChatMessages"),
      {
        tripId,
        sender: currentUser.name,
        text: message,
        createdAt: Date.now(),
      }
    );

    setMessage("");
    loadMessages();
  }

  if (!chat) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">

      <h1 className="text-4xl font-black text-orange-500">
        🏍 {chat.destination}
      </h1>

      <p className="text-zinc-400 mt-2">
        Live Trip Chat
      </p>

      <div className="mt-6 bg-zinc-900 rounded-3xl p-5 h-[70vh] flex flex-col">

        <div className="flex-1 overflow-y-auto space-y-3">

          {messages.map((msg, index) => (

            <div
              key={index}
              className={`max-w-[75%] p-3 rounded-2xl ${
                msg.sender === currentUser.name
                  ? "ml-auto bg-orange-500 text-black"
                  : "bg-zinc-800"
              }`}
            >
              <div className="text-xs font-bold mb-1">
                {msg.sender}
              </div>

              {msg.text}
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
            className="bg-orange-500 px-6 rounded-xl font-bold text-black"
          >
            Send
          </button>

        </div>

      </div>

    </main>
  );
}