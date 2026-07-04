"use client";

import { useState } from "react";

export default function CreatePost() {

  const [caption, setCaption] = useState("");

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-28">

      <div className="max-w-xl mx-auto">

        <h1 className="text-4xl font-black text-orange-500 mb-8">
          Create Feed Post
        </h1>

        <div className="bg-zinc-900 p-6 rounded-3xl">

          <input
            type="file"
            className="mb-6"
          />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Share your ride story..."
            className="
              w-full
              bg-black
              border border-zinc-700
              rounded-xl
              p-4
              h-32
            "
          />

          <button
            className="
              w-full
              mt-6
              bg-orange-500
              p-4
              rounded-xl
              font-black
            "
          >
            Post 🚀
          </button>

        </div>

      </div>

    </main>
  );
}