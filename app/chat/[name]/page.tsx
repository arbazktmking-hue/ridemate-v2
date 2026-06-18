"use client";

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

  const currentUser = JSON.parse(
    localStorage.getItem("ridemateUser") || "{}"
  );

  useEffect(() => {

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
        (a, b) =>
          a.createdAt - b.createdAt
      );

      setMessages(allMessages);

    };

    loadMessages();

  }, [riderName]);

const sendMessage = async () => {

  try {

    console.log("Current User:", currentUser);
    console.log("Receiver:", riderName);
    console.log("Message:", message);

    if (!message.trim()) return;

    const result = await addDoc(
      collection(db, "messages"),
      {
        sender: currentUser.name,
        receiver: riderName,
        text: message,
        createdAt: Date.now(),
      }
    );

    console.log("Message Saved:", result.id);

    setMessage("");

// Reload messages without refreshing page
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

    console.error(
      "CHAT ERROR:",
      error
    );

  }

};

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
              className={`p-3 rounded-xl w-fit max-w-[70%] ${
                msg.sender === currentUser.name
                  ? "bg-orange-500 ml-auto"
                  : "bg-zinc-800"
              }`}
            >
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
            className="bg-orange-500 px-6 rounded-xl font-bold"
          >
            Send
          </button>

        </div>

      </div>

    </main>

  );

}