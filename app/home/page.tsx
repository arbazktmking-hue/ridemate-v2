"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white p-6 pt-28">

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-10">

          <h1 className="text-4xl font-black text-orange-500">
            RideMate Feed 🔥
          </h1>

          <Link
            href="/create-post"
            className="
              bg-orange-500
              text-black
              px-6
              py-3
              rounded-2xl
              font-black
              hover:scale-105
              transition
            "
          >
            + Create Post
          </Link>

        </div>

        {/* Feed Card */}
        <div className="bg-zinc-900 p-8 rounded-3xl">

          <h2 className="text-2xl font-bold">
            Welcome to RideMate Feed
          </h2>

          <p className="text-zinc-400 mt-3">
            Soon you'll see photos and videos posted by riders.
          </p>

        </div>

      </div>

    </main>
  );
}