"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDoc,
  collection,
} from "firebase/firestore";

import { db } from "../firebase";

export default function CreatePostPage() {

  const router = useRouter();

  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const createPost = async () => {

    try {

      console.log("POST BUTTON CLICKED");

      const currentUser =
        JSON.parse(
          localStorage.getItem(
            "ridemateUser"
          ) || "{}"
        );

      if (!currentUser.name) {
        alert("No logged in user");
        return;
      }

      await addDoc(
  collection(db, "feedPosts"),
  {
    userName:
      currentUser.name,

    userImage:
      currentUser.image,

    fileName:
      selectedFile
        ? selectedFile.name
        : "",

    mediaType:
      selectedFile
        ? selectedFile.type
        : "",

    mediaUrl:
      selectedFile
        ? selectedFile.name
        : "",

    caption,

    likes: 0,

    comments: 0,

    createdAt:
      Date.now(),
  }
);

      alert(
        "Post created 🔥"
      );

      router.push("/home");

    } catch (error) {

      console.error(error);

      alert(
        "Error creating post"
      );
    }
  };

  return (
    <main className="min-h-screen bg-black text-white pt-28 px-6">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Create Post
        </h1>

        <div className="bg-zinc-900 rounded-3xl p-8">

          {/* Media Upload */}

          <h2 className="text-2xl font-bold mb-2">
            Add Photo or Video
          </h2>

          <p className="text-zinc-400 mb-6">
            Share your moments from the road
          </p>

          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              if (
                e.target.files &&
                e.target.files[0]
              ) {
                setSelectedFile(
                  e.target.files[0]
                );
              }
            }}
            className="
              w-full
              p-4
              rounded-xl
              bg-zinc-800
            "
          />

          {selectedFile && (
            <div className="mt-4 p-4 bg-black rounded-xl">
              <p className="text-green-500">
                Selected:
              </p>

              <p>
                {selectedFile.name}
              </p>

              <p className="text-zinc-400 text-sm">
                {selectedFile.type}
              </p>
            </div>
          )}

          <p className="text-sm text-zinc-500 mt-2 mb-8">
            Actual upload to Firebase Storage will be enabled later 🚀
          </p>

          {/* Caption */}

          <h2 className="text-2xl font-bold mb-2">
            Write a caption
          </h2>

          <textarea
            value={caption}
            onChange={(e) =>
              setCaption(
                e.target.value
              )
            }
            placeholder="Share something about this ride..."
            className="
              w-full
              h-32
              p-4
              rounded-xl
              bg-black
              border
              border-zinc-700
              mt-3
            "
          />

          {/* Preview */}

          <h2 className="text-2xl font-bold mt-8 mb-4">
            Preview
          </h2>

          <div className="
            bg-black
            border
            border-zinc-700
            rounded-2xl
            p-8
            text-center
          ">
            {selectedFile ? (
              <>
                <p className="text-orange-500 font-bold">
                  {selectedFile.name}
                </p>

                <p className="text-zinc-400">
                  {selectedFile.type}
                </p>
              </>
            ) : (
              <p className="text-zinc-500">
                📷 Select a photo or video
              </p>
            )}
          </div>

          {/* Post Button */}

          <button
            onClick={createPost}
            className="
              w-full
              mt-8
              bg-orange-500
              py-5
              rounded-2xl
              text-2xl
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