"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function CreateUsername() {
  const router = useRouter();

  const [username, setUsername] =
    useState("");

  const createUsername = async () => {
    if (!username.trim()) {
      alert("Enter a username");
      return;
    }

    const pendingUser = JSON.parse(
      localStorage.getItem(
        "pendingUser"
      ) || "{}"
    );

    const usernameRef = doc(
      db,
      "usernames",
      username.toLowerCase()
    );

    const usernameDoc =
      await getDoc(usernameRef);

    if (usernameDoc.exists()) {
      alert(
        "Username already exists"
      );
      return;
    }

    await setDoc(usernameRef, {
      uid: pendingUser.uid,
    });

    await setDoc(
      doc(
        db,
        "users",
        pendingUser.uid
      ),
      {
        email: pendingUser.email,
        username,
        image: pendingUser.image,
        createdAt: Date.now(),
      }
    );

    const finalUser = {
      uid: pendingUser.uid,
      email: pendingUser.email,
      image: pendingUser.image,
      name: username,
    };

    localStorage.setItem(
      "ridemateUser",
      JSON.stringify(finalUser)
    );

    localStorage.removeItem(
      "pendingUser"
    );

    router.push("/profile");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="bg-zinc-900 p-10 rounded-3xl w-full max-w-md">
        <h1 className="text-3xl font-black text-orange-500 mb-6">
          Create your username
        </h1>

        <input
          value={username}
          onChange={(e) =>
            setUsername(
              e.target.value
            )
          }
          placeholder="Enter username"
          className="w-full p-4 rounded-xl bg-black border border-zinc-700"
        />

        <button
          onClick={createUsername}
          className="w-full mt-5 bg-orange-500 p-4 rounded-xl font-black"
        >
          Continue
        </button>
      </div>
    </main>
  );
}