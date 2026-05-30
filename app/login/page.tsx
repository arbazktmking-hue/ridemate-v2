"use client";

import {
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

import { auth } from "../firebase";

import { useRouter } from "next/navigation";

export default function LoginPage() {

  const router = useRouter();

  const loginWithGoogle = async () => {

    try {

      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(
        auth,
        provider
      );

      const user = {
        name: result.user.displayName,
        email: result.user.email,
        image: result.user.photoURL,
      };

      localStorage.setItem(
        "ridemateUser",
        JSON.stringify(user)
      );

      alert(`Welcome ${user.name} 🔥`);

      router.push("/profile");

    } catch (error) {

      console.log(error);

      alert("Login failed");

    }

  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">

      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 max-w-md w-full text-center">

        <h1 className="text-5xl font-black text-orange-500">
          RideMate 🏍🔥
        </h1>

        <p className="text-zinc-400 mt-4">
          Join the biker community
        </p>

        <button
          onClick={loginWithGoogle}
          className="w-full bg-orange-500 py-4 rounded-2xl text-xl font-black mt-10 hover:scale-105 transition"
        >
          Continue with Google
        </button>

      </div>

    </main>
  );
}