"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  addDoc,
  collection,
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, auth, app } from "../firebase";

export default function CreatePostPage() {
  const router = useRouter();

  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [uploading, setUploading] =
    useState(false);

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

      if (!selectedFile) {
        alert("Please select a photo or video.");
        return;
      }

      setUploading(true);

      /*
      ==========================================================
      1. CREATE UNIQUE FILE NAME
      ==========================================================
      */
console.log(
  "Current RideMate user:",
  currentUser
);

console.log(
  "Firebase user:",
  auth.currentUser
);
      const fileName =
        `${Date.now()}_${selectedFile.name}`;

      /*
      ==========================================================
      2. CREATE STORAGE LOCATION
      ==========================================================
      */

      const storage =
  getStorage(app);

const storageRef =
  ref(
    storage,
    `feedPosts/${currentUser.uid}/${fileName}`
  );

      /*
      ==========================================================
      3. UPLOAD FILE TO FIREBASE STORAGE
      ==========================================================
      */

      console.log(
        "Uploading file..."
      );

      await uploadBytes(
        storageRef,
        selectedFile
      );

      /*
      ==========================================================
      4. GET REAL DOWNLOAD URL
      ==========================================================
      */

      const mediaUrl =
        await getDownloadURL(
          storageRef
        );

      console.log(
        "Upload successful:",
        mediaUrl
      );

      /*
      ==========================================================
      5. SAVE POST TO FIRESTORE
      ==========================================================
      */

      await addDoc(
        collection(
          db,
          "feedPosts"
        ),
        {
          userName:
            currentUser.name,

          userImage:
            currentUser.image || "",

          fileName:
            selectedFile.name,

          mediaType:
            selectedFile.type,

          mediaUrl:
            mediaUrl,

          caption:
            caption.trim(),

          likes:
            0,

          likedBy:
            [],

          comments:
            [],

          createdAt:
            Date.now(),
        }
      );

      console.log(
        "Post saved successfully"
      );

      alert(
        "Post created 🔥"
      );

      router.push("/home");

    } catch (error) {

      console.error(
        "Error creating post:",
        error
      );

      alert(
        "Error uploading post. Please try again."
      );

    } finally {

      setUploading(false);

    }
  };

  return (
    <main className="min-h-screen bg-black text-white pt-28 px-6">

      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-orange-500 mb-8">
          Create Post
        </h1>

        <div className="bg-zinc-900 rounded-3xl p-8">

          {/* MEDIA */}

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

          {/* FILE PREVIEW */}

          {selectedFile && (

            <div className="mt-6">

              <p className="text-green-500 font-bold mb-3">
                Selected:
              </p>

              <p className="mb-4">
                {selectedFile.name}
              </p>

              {selectedFile.type.startsWith(
                "image"
              ) ? (

                <img
                  src={URL.createObjectURL(
                    selectedFile
                  )}
                  alt="Preview"
                  className="
                    max-h-96
                    w-full
                    object-contain
                    rounded-2xl
                    bg-black
                  "
                />

              ) : (

                <video
                  src={URL.createObjectURL(
                    selectedFile
                  )}
                  controls
                  className="
                    max-h-96
                    w-full
                    rounded-2xl
                    bg-black
                  "
                />

              )}

            </div>

          )}

          {/* CAPTION */}

          <h2 className="text-2xl font-bold mt-8 mb-2">
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
              outline-none
              focus:border-orange-500
            "
          />

          {/* POST BUTTON */}

          <button
            onClick={createPost}
            disabled={uploading}
            className="
              w-full
              mt-8
              bg-orange-500
              py-5
              rounded-2xl
              text-2xl
              font-black
              hover:bg-orange-400
              transition
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >

            {uploading
              ? "Uploading... ⏳"
              : "Post 🚀"}

          </button>

        </div>

      </div>

    </main>
  );
}