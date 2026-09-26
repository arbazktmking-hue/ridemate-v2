"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

export default function CreateUsername() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const createUsername = async () => {
    const cleanUsername = username.trim();

    if (!cleanUsername) {
      alert("Enter a username");
      return;
    }

    if (cleanUsername.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }

    setLoading(true);

    try {
      // Get the REAL logged-in Firebase user.
      // We do NOT trust the UID stored in localStorage.
      const currentUser = auth.currentUser;

      if (!currentUser) {
        alert("Your login session has expired. Please login again.");
        router.push("/login");
        return;
      }

      // Check whether this username already exists
      const usernameKey = cleanUsername.toLowerCase();

      const usernameRef = doc(db, "usernames", usernameKey);

      const usernameDoc = await getDoc(usernameRef);

      if (usernameDoc.exists()) {
        alert("Username already exists. Please choose another one.");
        setLoading(false);
        return;
      }

      // Keep pendingUser only for old onboarding data
      // such as the Google profile image.
      const pendingUser = JSON.parse(
        localStorage.getItem("pendingUser") || "{}"
      );

      const email =
        currentUser.email ||
        pendingUser.email ||
        "";

      const image =
        currentUser.photoURL ||
        pendingUser.image ||
        "";

      // Create username record
      await setDoc(usernameRef, {
        uid: currentUser.uid,
        username: cleanUsername,
        createdAt: Date.now(),
      });

      // Create/update the user's profile
      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          email,
          username: cleanUsername,
          image,
          createdAt: Date.now(),
        },
        {
          merge: true,
        }
      );

      // Save local session information for the existing RideMate UI
      const finalUser = {
        uid: currentUser.uid,
        email,
        image,
        name: cleanUsername,
      };

      localStorage.setItem(
        "ridemateUser",
        JSON.stringify(finalUser)
      );

      localStorage.removeItem("pendingUser");

      // Continue to profile
      router.push("/profile");
    } catch (error: any) {
      console.error("Username creation error:", error);

      if (
        error?.code === "permission-denied"
      ) {
        alert(
          "Permission denied by Firebase. Please send me the exact error from the browser console."
        );
      } else {
        alert(
          error?.message ||
            "Something went wrong while creating your username."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">

        <h1 className="text-3xl font-bold text-center mb-3">
          Choose your username
        </h1>

        <p className="text-gray-400 text-center mb-8">
          This is how other riders will find you on RideMate.
        </p>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) {
              createUsername();
            }
          }}
          placeholder="Enter username"
          disabled={loading}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-4 text-white outline-none focus:border-white"
        />

        <button
          onClick={createUsername}
          disabled={loading}
          className="w-full mt-4 bg-white text-black font-semibold rounded-xl py-4 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Continue"}
        </button>

      </div>
    </main>
  );
}