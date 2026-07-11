"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  collection,
  getDocs,
} from "firebase/firestore";

import { db } from "../firebase";

export default function HomePage() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const loadPosts = async () => {
      const snapshot = await getDocs(
        collection(db, "feedPosts")
      );

      const loadedPosts: any[] = [];

      snapshot.forEach((doc) => {
        loadedPosts.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      loadedPosts.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      setPosts(loadedPosts);
    };

    loadPosts();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white p-6 pt-28">
      <div className="max-w-4xl mx-auto">

        {/* Create Post Button */}

        <div className="flex justify-end mb-6">
          <Link
            href="/create-post"
            className="
              bg-orange-500
              text-black
              px-4
              py-2
              rounded-xl
              text-sm
              font-bold
              hover:bg-orange-400
              transition
            "
          >
            ➕ Create Post
          </Link>
        </div>

        {/* No Posts */}

        {posts.length === 0 && (
          <div
            className="
              bg-zinc-900
              rounded-3xl
              p-10
              text-center
            "
          >
            <h2 className="text-2xl font-bold">
              No posts yet
            </h2>

            <p className="text-zinc-400 mt-3">
              Be the first rider to post 🔥
            </p>
          </div>
        )}

        {/* Posts */}

        <div className="space-y-8">
          {posts.map((post) => (
            <div
              key={post.id}
              className="
                bg-zinc-900
                rounded-3xl
                p-6
              "
            >
              {/* User */}

              <div className="flex items-center gap-4">
                <img
                  src={post.userImage}
                  alt=""
                  className="
                    w-14
                    h-14
                    rounded-full
                    border-2
                    border-orange-500
                  "
                />

                <div>
                  <h2 className="font-black text-xl">
                    {post.userName}
                  </h2>

                  <p className="text-zinc-500 text-sm">
                    {new Date(
                      post.createdAt
                    ).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Media */}

              <div
                className="
                  bg-black
                  border
                  border-zinc-700
                  rounded-2xl
                  p-8
                  mt-6
                "
              >
                <div className="flex flex-col items-center">
                  <div className="text-7xl mb-4">
                    {post.mediaType?.startsWith("video")
                      ? "🎥"
                      : "📷"}
                  </div>

                  <h3
                    className="
                      text-xl
                      font-black
                      text-orange-500
                      text-center
                    "
                  >
                    {post.fileName || "No media"}
                  </h3>

                  <p className="text-zinc-400 mt-2">
                    {post.mediaType || "Unknown"}
                  </p>
                </div>
              </div>

              {/* Caption */}

              <div className="mt-6">
                {post.caption ? (
                  <p className="text-lg font-medium">
                    {post.caption}
                  </p>
                ) : (
                  <p className="text-zinc-500">
                    No caption
                  </p>
                )}
              </div>

              {/* Footer */}

              <div
                className="
                  flex
                  gap-8
                  mt-6
                  text-zinc-400
                  text-lg
                "
              >
                <span>❤️ {post.likes}</span>

                <span>💬 {post.comments}</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </main>
  );
}